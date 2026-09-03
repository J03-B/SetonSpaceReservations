export function profileNameInput(
  fullName: string | null | undefined,
  email: string,
): string {
  const name = (fullName ?? "").trim();
  if (!name || name.toLowerCase() === email.trim().toLowerCase()) {
    return "";
  }
  return name;
}
