import {
  isBootstrapAdminEmail,
  isCampusManagerEmail,
} from "@/lib/auth/config";
import { readTempViewUserId } from "@/lib/auth/impersonation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type AccountStatus = "active" | "suspended" | "revoked";
export type AccessLevel =
  | "admin"
  | "manager"
  | "trusted user"
  | "user"
  | "guest";
export type AccessLabel =
  | "Guest"
  | "User"
  | "Trusted User"
  | "Manager"
  | "Admin";
export type AccountGroup = "User" | "Manager" | "Admin";

export interface SessionUser {
  id: string;
  email: string;
  emailVerified: boolean;
  fullName: string;
  phone: string | null;
  organization: string | null;
  accountStatus: AccountStatus;
  accessLevel: AccessLevel;
  accessLabel: AccessLabel;
  accountGroup: AccountGroup;
  isRequester: boolean;
  isManager: boolean;
  isTechAdmin: boolean;
  isImpersonating: boolean;
  realAdminEmail: string | null;
}

type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  account_status: string | null;
  email_verified_at: string | null;
  access_level: string | null;
};

export function asAccessLevel(value: string | null | undefined): AccessLevel {
  if (value === "admin" || value === "tech_admin") return "admin";
  if (value === "manager") return "manager";
  if (value === "trusted user" || value === "trusted") return "trusted user";
  if (value === "user" || value === "requester") return "user";
  return "guest";
}

export function accessLabelFor(
  accessLevel: AccessLevel,
  isTechAdmin: boolean,
  isCampusManager = false,
): AccessLabel {
  if (isTechAdmin) return "Admin";
  if (accessLevel === "manager" || isCampusManager) return "Manager";
  if (accessLevel === "trusted user") return "Trusted User";
  if (accessLevel === "user") return "User";
  return "Guest";
}

function canSubmitRequests(accessLevel: AccessLevel, isTechAdmin: boolean) {
  return isTechAdmin || accessLevel !== "guest";
}

function toSessionUser(
  row: UserRow,
  emailVerified: boolean,
  impersonation?: { realAdminEmail: string },
): SessionUser {
  const email = row.email;
  const storedAccess = asAccessLevel(row.access_level);
  const isTechAdmin =
    storedAccess === "admin" || isBootstrapAdminEmail(email);
  const isCampusManager = isCampusManagerEmail(email);
  const isManager = storedAccess === "manager" || isTechAdmin || isCampusManager;
  const accessLevel: AccessLevel =
    isTechAdmin
      ? "admin"
      : isManager && storedAccess === "guest"
        ? "manager"
        : storedAccess;
  const accountGroup: AccountGroup = isTechAdmin
    ? "Admin"
    : isManager
      ? "Manager"
      : "User";

  return {
    id: row.id,
    email,
    emailVerified,
    fullName: row.full_name ?? email ?? "Account",
    phone: null,
    organization: null,
    accountStatus:
      (row.account_status as AccountStatus | undefined) ?? "active",
    accessLevel,
    accessLabel: accessLabelFor(storedAccess, isTechAdmin, isCampusManager),
    accountGroup,
    isRequester: canSubmitRequests(accessLevel, isTechAdmin),
    isManager,
    isTechAdmin,
    isImpersonating: Boolean(impersonation),
    realAdminEmail: impersonation?.realAdminEmail ?? null,
  };
}

const USER_COLUMNS =
  "id, email, full_name, account_status, email_verified_at, access_level";

async function loadAuthProfile() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: row } = await supabase
    .from("users")
    .select(USER_COLUMNS)
    .eq("id", user.id)
    .maybeSingle();

  if (!row) {
    return {
      supabase,
      authUser: user,
      session: toSessionUser(
        {
          id: user.id,
          email: user.email ?? "",
          full_name: user.email ?? "Account",
          account_status: "active",
          email_verified_at: user.email_confirmed_at ?? null,
          access_level: isCampusManagerEmail(user.email ?? "")
            ? "manager"
            : "guest",
        },
        Boolean(user.email_confirmed_at),
      ),
    };
  }

  return {
    supabase,
    authUser: user,
    session: toSessionUser(
      row as UserRow,
      Boolean(user.email_confirmed_at ?? row.email_verified_at),
    ),
  };
}

/** Signed-in admin or user, ignoring temporary view. */
export async function getAuthUser(): Promise<SessionUser | null> {
  const loaded = await loadAuthProfile();
  return loaded?.session ?? null;
}

/** Server-side session check. Never trust client-supplied roles. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const loaded = await loadAuthProfile();
  if (!loaded) return null;

  const { session: realUser, supabase, authUser } = loaded;
  if (!realUser.isTechAdmin) {
    return realUser;
  }

  const targetId = await readTempViewUserId();
  if (!targetId || targetId === realUser.id) {
    return realUser;
  }

  const { data: target } = await supabase
    .from("users")
    .select(USER_COLUMNS)
    .eq("id", targetId)
    .maybeSingle();

  if (!target) {
    return realUser;
  }

  return toSessionUser(
    target as UserRow,
    Boolean(target.email_verified_at ?? authUser.email_confirmed_at),
    { realAdminEmail: realUser.email },
  );
}
