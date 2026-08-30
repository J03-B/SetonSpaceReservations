"use client";

import { useActionState, useState } from "react";
import { signUpAction } from "@/lib/auth/actions";
import {
  Field,
  largeButtonClassName,
  largeInputClassName,
} from "@/components/auth/form-fields";
import { cn } from "@/lib/utils";

function CreateAccountSpinner() {
  return (
    <>
      <span className="sr-only">Creating account</span>
      <span
        className="size-5 animate-spin rounded-full border-2 border-text-inverse/25 border-t-text-inverse"
        aria-hidden
      />
    </>
  );
}

function formSnapshot(fullName: string, email: string, accepted: boolean) {
  return `${fullName.trim().toLowerCase()}|${email.trim().toLowerCase()}|${accepted ? "1" : "0"}`;
}

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUpAction, null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [submittedSnapshot, setSubmittedSnapshot] = useState("");

  const isComplete =
    fullName.trim().length >= 2 &&
    email.includes("@") &&
    acceptedRules;
  const snapshot = formSnapshot(fullName, email, acceptedRules);
  const hasError =
    Boolean(state?.error) &&
    !pending &&
    snapshot === submittedSnapshot;
  const showCreateAccount = isComplete && !hasError;

  return (
    <form
      action={formAction}
      className="space-y-6"
      noValidate
      onSubmit={(event) => {
        if (!isComplete || hasError) {
          event.preventDefault();
          return;
        }
        setSubmittedSnapshot(snapshot);
      }}
    >
      <Field id="full_name" label="Full name" size="lg">
        <input
          id="full_name"
          name="full_name"
          type="text"
          autoComplete="name"
          required
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          className={largeInputClassName}
        />
      </Field>
      <Field id="email" label="Email" size="lg">
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={largeInputClassName}
        />
      </Field>
      <div>
        <label className="flex items-center justify-center gap-3 text-sm text-text-primary">
          <input
            id="accepted_rules"
            name="accepted_rules"
            type="checkbox"
            className="size-5"
            checked={acceptedRules}
            onChange={(event) => setAcceptedRules(event.target.checked)}
          />
          <span>I agree to follow Seton facility rules.</span>
        </label>
      </div>
      <div className="grid min-h-11">
        <button
          type="submit"
          className={cn(
            largeButtonClassName,
            "col-start-1 row-start-1",
            hasError && "sign-in-continue--error pointer-events-none",
            !showCreateAccount &&
              !pending &&
              !hasError &&
              "pointer-events-none opacity-25",
            (pending || hasError) && "disabled:opacity-100",
            showCreateAccount &&
              Boolean(state?.error) &&
              !pending &&
              "sign-in-continue--enter",
          )}
          disabled={pending || hasError}
          aria-busy={pending}
          aria-hidden={hasError}
          tabIndex={hasError || !isComplete ? -1 : undefined}
        >
          {pending ? (
            <CreateAccountSpinner />
          ) : (
            <span className={hasError ? "invisible" : undefined}>
              {isComplete ? "Create account" : "Please fill out your information"}
            </span>
          )}
        </button>
        {hasError ? (
          <p
            id="sign-up-error"
            role="alert"
            className="sign-in-continue-error-text col-start-1 row-start-1 flex min-h-11 items-center justify-center px-2 text-center text-sm font-medium text-status-danger"
          >
            {state?.error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
