import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import {
  groupManagedRoomsByBuilding,
  type BuildingRoomGroup,
} from "@/lib/auth/managed-rooms";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  AuthFormCard,
  AuthPageTitle,
  authColumnClassName,
  authPageClassName,
} from "@/components/auth/auth-close-link";
import { AccountSettingsForm } from "./account-settings-form";

export const metadata = {
  title: "Account",
};

async function getManagedRoomGroups(
  userId: string,
  hasFullCatalogAccess: boolean,
): Promise<BuildingRoomGroup[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("rooms")
    .select("name, building, manager_id")
    .order("name");

  return groupManagedRoomsByBuilding(
    data ?? [],
    userId,
    hasFullCatalogAccess,
  );
}

export default async function AccountPage() {
  const session = await getSessionUser();
  if (!session) {
    redirect("/sign-in?next=/account");
  }

  const roomGroups = session.isManager
    ? await getManagedRoomGroups(session.id, session.isTechAdmin)
    : [];

  return (
    <div className={authPageClassName}>
      <div className={authColumnClassName}>
        <AuthPageTitle>Account</AuthPageTitle>
        <AuthFormCard>
          <AccountSettingsForm user={session} roomGroups={roomGroups} />
        </AuthFormCard>
      </div>
    </div>
  );
}
