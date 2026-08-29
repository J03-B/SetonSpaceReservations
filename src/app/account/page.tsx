import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { AuthFormCard, AuthPageTitle } from "@/components/auth/auth-close-link";
import { AccountSettingsForm, type ManagedSpace } from "./account-settings-form";

export const metadata = {
  title: "Account",
};

async function getManagedSpaces(userId: string): Promise<ManagedSpace[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("rooms")
    .select("name, building")
    .eq("manager_id", userId)
    .order("name");

  return (data ?? []).map((row) => ({
    name: row.name,
    building: row.building,
  }));
}

export default async function AccountPage() {
  const session = await getSessionUser();
  if (!session) {
    redirect("/sign-in?next=/account");
  }

  const managedSpaces =
    session.accountGroup === "Manager"
      ? await getManagedSpaces(session.id)
      : [];

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-6 py-12">
      <div className="w-full max-w-2xl">
        <AuthPageTitle>Account</AuthPageTitle>
        <AuthFormCard>
          <AccountSettingsForm user={session} managedSpaces={managedSpaces} />
        </AuthFormCard>
      </div>
    </div>
  );
}
