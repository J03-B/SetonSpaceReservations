import { MapRegionEditor } from "@/components/map/map-region-editor";

export const metadata = {
  title: "Configure map",
};

export default function ConfigureMapPage() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <MapRegionEditor />
    </div>
  );
}
