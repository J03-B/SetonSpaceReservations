/** Phase 1 bootstrap admin. Production Tech Admin is still open decision #3. */
export const BOOTSTRAP_ADMIN_EMAIL = "semperjoey@gmail.com";

/** Campus-wide space manager for every building (D-2026-08-29-manage-abilities). */
export const CAMPUS_MANAGER_EMAIL = "jbenin@setonschool.net";

export function isBootstrapAdminEmail(email: string): boolean {
  return email.trim().toLowerCase() === BOOTSTRAP_ADMIN_EMAIL;
}

export function isCampusManagerEmail(email: string): boolean {
  return email.trim().toLowerCase() === CAMPUS_MANAGER_EMAIL;
}
