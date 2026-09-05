/** Only account auto-granted developer on both apps. */
export const BOOTSTRAP_DEVELOPER_EMAIL = "dev@setonschool.net";

/** @deprecated Use BOOTSTRAP_DEVELOPER_EMAIL */
export const BOOTSTRAP_ADMIN_EMAIL = BOOTSTRAP_DEVELOPER_EMAIL;

/** Campus-wide space manager for every building (D-2026-08-29-manage-abilities). */
export const CAMPUS_MANAGER_EMAIL = "jbenin@setonschool.net";

export function isBootstrapDeveloperEmail(email: string): boolean {
  return email.trim().toLowerCase() === BOOTSTRAP_DEVELOPER_EMAIL;
}

export function isBootstrapAdminEmail(email: string): boolean {
  return isBootstrapDeveloperEmail(email);
}

export function isCampusManagerEmail(email: string): boolean {
  return email.trim().toLowerCase() === CAMPUS_MANAGER_EMAIL;
}
