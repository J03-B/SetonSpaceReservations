import { redirect } from "next/navigation";
import { MapRegionEditor } from "@/components/map/map-region-editor";
import { getSessionUser } from "@/lib/auth/session";

export const metadata = {
  title: "Configure map",
};

export default async function ConfigureMapPage() {
  const session = await getSessionUser();
  if (!session?.isTechAdmin) {
    redirect("/");
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <MapRegionEditor />
    </div>
  );
}
