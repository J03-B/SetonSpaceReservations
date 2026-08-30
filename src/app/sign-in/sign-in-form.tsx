"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  sendSignInCodeAction,
  verifySignInCodeAction,
} from "@/lib/auth/actions";
import {
  Field,
  largeButtonClassName,
  largeInputClassName,
} from "@/components/auth/form-fields";
import { cn } from "@/lib/utils";

const CODE_LENGTH = 6;
const RESEND_SECONDS = [15, 30, 60, 120, 300, 600];

function ContinueSpinner() {
  return (
    <>
      <span className="sr-only">Sending code</span>
      <span
        className="size-5 animate-spin rounded-full border-2 border-text-inverse/25 border-t-text-inverse"
        aria-hidden
      />
    </>
  );
}

function formatCountdown(total: number) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function emptySlots() {
  return Array.from({ length: CODE_LENGTH }, () => "");
}

function CodeBoxes({
  slots,
  disabled,
  onSlotsChange,
}: {
  slots: string[];
  disabled?: boolean;
  onSlotsChange: (slots: string[]) => void;
}) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  function focusAt(index: number) {
    const input = inputsRef.current[index];
    input?.focus();
    input?.select();
  }

  function applyPaste(raw: string, startIndex: number) {
    const digits = raw.replace(/\D/g, "").slice(0, CODE_LENGTH - startIndex);
    if (!digits) return;
    const next = [...slots];
    digits.split("").forEach((digit, offset) => {
      next[startIndex + offset] = digit;
    });
    onSlotsChange(next);
    focusAt(Math.min(startIndex + digits.length, CODE_LENGTH - 1));
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>, index: number) {
    event.preventDefault();
    applyPaste(event.clipboardData.getData("text"), index);
  }

  function handleChange(index: number, raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (digits.length > 1) {
      applyPaste(digits, index);
      return;
    }
    const next = [...slots];
    next[index] = digits.slice(-1);
    onSlotsChange(next);
    if (digits) {
      focusAt(Math.min(index + 1, CODE_LENGTH - 1));
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key === "Backspace" && !slots[index] && index > 0) {
      event.preventDefault();
      const next = [...slots];
      next[index - 1] = "";
      onSlotsChange(next);
      focusAt(index - 1);
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusAt(index - 1);
    }
    if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      event.preventDefault();
      focusAt(index + 1);
    }
  }

  return (
    <div
      className="flex gap-2 sm:gap-3"
      role="group"
      aria-label="6-digit sign-in code"
    >
      {slots.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            inputsRef.current[index] = element;
          }}
          id={`token-box-${index + 1}`}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          autoFocus={index === 0}
          maxLength={1}
          value={digit}
          disabled={disabled}
          aria-label={`Digit ${index + 1} of ${CODE_LENGTH}`}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          onPaste={(event) => handlePaste(event, index)}
          onFocus={(event) => event.currentTarget.select()}
          className="h-16 min-w-0 flex-1 rounded-lg border-2 border-border-strong bg-surface-strong text-center text-2xl font-semibold leading-none text-text-primary"
        />
      ))}
    </div>
  );
}

export function SignInForm({
  nextPath,
  initialEmail = "",
  initialCodeSent = false,
}: {
  nextPath: string;
  initialEmail?: string;
  initialCodeSent?: boolean;
}) {
  const [formKey, setFormKey] = useState(0);

  return (
    <SignInFormFields
      key={formKey}
      nextPath={nextPath}
      initialEmail={formKey === 0 ? initialEmail : ""}
      initialCodeSent={formKey === 0 ? initialCodeSent : false}
      onUseDifferentEmail={() => setFormKey((current) => current + 1)}
    />
  );
}

function SignInFormFields({
  nextPath,
  initialEmail,
  initialCodeSent,
  onUseDifferentEmail,
}: {
  nextPath: string;
  initialEmail: string;
  initialCodeSent: boolean;
  onUseDifferentEmail: () => void;
}) {
  const [sendState, sendAction, sendPending] = useActionState(
    sendSignInCodeAction,
    initialCodeSent && initialEmail
      ? { codeSent: true, email: initialEmail }
      : null,
  );
  const [verifyState, verifyAction, verifyPending] = useActionState(
    verifySignInCodeAction,
    null,
  );
  const [emailValue, setEmailValue] = useState(initialEmail);
  const [slots, setSlots] = useState(emptySlots);
  const [submittedCode, setSubmittedCode] = useState("");
  const [timer, setTimer] = useState<{ waitIndex: number; remaining: number } | null>(
    null,
  );
  const verifyFormRef = useRef<HTMLFormElement>(null);
  const expectingResend = useRef(false);

  const email = sendState?.email ?? initialEmail;
  const codeSent = Boolean(sendState?.codeSent);
  const code = slots.join("");
  const codeComplete = slots.every((digit) => digit.length === 1);
  const failedEmail = sendState?.error ? (sendState.email ?? "").toLowerCase() : "";
  const hasSendError =
    Boolean(sendState?.error) &&
    !sendPending &&
    emailValue.trim().toLowerCase() === failedEmail;
  const hasVerifyError =
    Boolean(verifyState?.error) &&
    !verifyPending &&
    code === submittedCode &&
    submittedCode.length === CODE_LENGTH;

  if (codeSent && timer === null) {
    setTimer({ waitIndex: 0, remaining: RESEND_SECONDS[0] });
  }
  if (!codeSent && timer !== null) {
    setTimer(null);
  }

  useEffect(() => {
    if (!timer || timer.remaining <= 0) return;
    const id = window.setTimeout(() => {
      setTimer((current) =>
        current ? { ...current, remaining: Math.max(0, current.remaining - 1) } : current,
      );
    }, 1000);
    return () => window.clearTimeout(id);
  }, [timer]);

  useEffect(() => {
    if (!expectingResend.current || sendPending) return;
    expectingResend.current = false;
    if (sendState?.error) return;
    setTimer((current) => {
      const nextIndex = Math.min(
        (current?.waitIndex ?? 0) + 1,
        RESEND_SECONDS.length - 1,
      );
      return { waitIndex: nextIndex, remaining: RESEND_SECONDS[nextIndex] };
    });
    setSlots(emptySlots());
  }, [sendPending, sendState]);

  function handleSlotsChange(next: string[]) {
    setSlots(next);
    if (next.every((digit) => digit.length === 1)) {
      window.setTimeout(() => verifyFormRef.current?.requestSubmit(), 0);
    }
  }

  function handleResend(event: FormEvent<HTMLFormElement>) {
    if (sendPending || (timer && timer.remaining > 0)) {
      event.preventDefault();
      return;
    }
    expectingResend.current = true;
  }

  if (codeSent) {
    const remaining = timer?.remaining ?? 0;
    const canResend = remaining <= 0 && !sendPending;

    return (
      <div className="space-y-6">
        <p className="text-center text-sm text-text-secondary">
          We sent a 6-digit code to {email}.
        </p>
        <form
          ref={verifyFormRef}
          action={verifyAction}
          className="space-y-6"
          onSubmit={() => setSubmittedCode(code)}
        >
          <input type="hidden" name="next" value={nextPath} />
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="token" value={code} />
          <Field id="token-box-1" label="Code" size="lg">
            <div className="mt-3">
              <CodeBoxes
                slots={slots}
                disabled={verifyPending}
                onSlotsChange={handleSlotsChange}
              />
            </div>
          </Field>
          <div className="grid min-h-11">
            <button
              type="submit"
              className={cn(
                largeButtonClassName,
                "col-start-1 row-start-1",
                hasVerifyError && "sign-in-continue--error pointer-events-none",
                hasVerifyError && "disabled:opacity-100",
              )}
              disabled={verifyPending || !codeComplete || hasVerifyError}
              aria-busy={verifyPending}
              aria-hidden={hasVerifyError}
            >
              {verifyPending ? (
                <ContinueSpinner />
              ) : (
                <span className={hasVerifyError ? "invisible" : undefined}>
                  Sign in
                </span>
              )}
            </button>
            {hasVerifyError ? (
              <p
                role="alert"
                className="sign-in-continue-error-text col-start-1 row-start-1 flex min-h-11 items-center justify-center px-2 text-center text-sm font-medium text-status-danger"
              >
                {verifyState?.error}
              </p>
            ) : null}
          </div>
        </form>
        <div className="flex flex-col items-center gap-3 text-base">
          <form action={sendAction} onSubmit={handleResend}>
            <input type="hidden" name="next" value={nextPath} />
            <input type="hidden" name="email" value={email} />
            <button
              type="submit"
              className="font-medium text-action-primary hover:underline disabled:opacity-60"
              disabled={!canResend}
            >
              {sendPending
                ? "Sending…"
                : remaining > 0
                  ? `Resend code in ${formatCountdown(remaining)}`
                  : "Resend code"}
            </button>
          </form>
          <button
            type="button"
            className="text-text-secondary hover:text-text-primary hover:underline"
            onClick={onUseDifferentEmail}
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      action={sendAction}
      className="space-y-6"
      noValidate
      onSubmit={(event) => {
        if (hasSendError) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="next" value={nextPath} />
      <Field id="email" label="Email" size="lg">
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          value={emailValue}
          onChange={(event) => setEmailValue(event.target.value)}
          required
          aria-invalid={hasSendError}
          aria-describedby={hasSendError ? "sign-in-email-error" : undefined}
          className={largeInputClassName}
        />
      </Field>
      <div className="grid min-h-11">
        <button
          type="submit"
          className={cn(
            largeButtonClassName,
            "col-start-1 row-start-1",
            hasSendError && "sign-in-continue--error pointer-events-none",
            Boolean(sendState?.error) &&
              !hasSendError &&
              !sendPending &&
              "sign-in-continue--enter",
          )}
          disabled={sendPending || hasSendError}
          aria-busy={sendPending}
          aria-hidden={hasSendError}
          tabIndex={hasSendError ? -1 : undefined}
        >
          {sendPending ? (
            <ContinueSpinner />
          ) : (
            <span className={hasSendError ? "invisible" : undefined}>Continue</span>
          )}
        </button>
        {hasSendError ? (
          <p
            id="sign-in-email-error"
            role="alert"
            className="sign-in-continue-error-text col-start-1 row-start-1 flex min-h-11 items-center justify-center px-2 text-center text-sm font-medium text-status-danger"
          >
            {sendState?.error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
