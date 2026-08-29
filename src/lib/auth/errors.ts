export type AuthActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
  savedFullName?: string;
  email?: string;
  codeSent?: boolean;
} | null;

export function mapAuthError(message: string | undefined): string {
  const text = (message ?? "").toLowerCase();

  if (text.includes("invalid login credentials")) {
    return "That email or code is incorrect.";
  }
  if (
    text.includes("token has expired") ||
    text.includes("otp_expired") ||
    text.includes("token is invalid") ||
    text.includes("invalid token")
  ) {
    return "That code is invalid or has expired. Request a new one.";
  }
  if (text.includes("signups not allowed") || text.includes("user not found")) {
    return "No account found for that email.";
  }
  if (text.includes("email not confirmed")) {
    return "Confirm your email before signing in. Check your inbox for the code.";
  }
  if (text.includes("user already registered")) {
    return "An account with this email already exists. Sign in instead.";
  }
  if (text.includes("unable to validate email") || text.includes("invalid email")) {
    return "Enter a valid email address.";
  }
  if (text.includes("for security purposes")) {
    return "Please wait a moment before requesting another email.";
  }
  if (text.includes("signup is disabled")) {
    return "Account creation is temporarily unavailable.";
  }

  return "Sign-in could not be completed. Try again, or contact support if the problem continues.";
}
