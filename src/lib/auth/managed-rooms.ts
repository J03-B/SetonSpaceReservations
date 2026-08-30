export type CatalogRoom = {
  name: string;
  building: string | null;
  manager_id: string | null;
};

export type BuildingRoomGroup = {
  building: string;
  allAccess: boolean;
  roomNames: string[];
};

export function groupManagedRoomsByBuilding(
  rooms: CatalogRoom[],
  managerId: string,
  hasFullCatalogAccess: boolean,
): BuildingRoomGroup[] {
  const byBuilding = new Map<string, CatalogRoom[]>();

  for (const room of rooms) {
    const building = room.building?.trim() || "Unassigned";
    const list = byBuilding.get(building) ?? [];
    list.push(room);
    byBuilding.set(building, list);
  }

  const groups: BuildingRoomGroup[] = [];

  for (const [building, list] of byBuilding) {
    const managed = list.filter((room) => room.manager_id === managerId);
    const allAccess =
      hasFullCatalogAccess ||
      (managed.length > 0 && managed.length === list.length);

    if (!hasFullCatalogAccess && managed.length === 0) {
      continue;
    }

    groups.push({
      building,
      allAccess,
      roomNames: allAccess
        ? []
        : managed
            .map((room) => room.name)
            .sort((left, right) => left.localeCompare(right)),
    });
  }

  return groups.sort((left, right) => left.building.localeCompare(right.building));
}
