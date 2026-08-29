"use client";

import { useActionState } from "react";
import { resendConfirmationAction } from "@/lib/auth/actions";
import {
  AuthMessage,
  Field,
  inputClassName,
  secondaryButtonClassName,
} from "@/components/auth/form-fields";

export function ResendConfirmationForm() {
  const [state, formAction, pending] = useActionState(
    resendConfirmationAction,
    null,
  );

  return (
    <form action={formAction} className="mt-4 space-y-4">
      <AuthMessage error={state?.error} success={state?.success} />
      <Field id="email" label="Email" required>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputClassName}
        />
      </Field>
      <button
        type="submit"
        className={secondaryButtonClassName}
        disabled={pending}
      >
        {pending ? "Sending…" : "Resend confirmation email"}
      </button>
    </form>
  );
}
