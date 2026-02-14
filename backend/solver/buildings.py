"""Building definitions for Endfield factory machines."""

from __future__ import annotations

from solver.models import BuildingDef, BuildingType

BUILDINGS: dict[BuildingType, BuildingDef] = {
    BuildingType.FILLER: BuildingDef(
        type=BuildingType.FILLER,
        name="灌装机",
        width=3,
        length=6,
        input_count=6,
        output_count=6,
    ),
    BuildingType.GRINDER: BuildingDef(
        type=BuildingType.GRINDER,
        name="研磨机",
        width=3,
        length=6,
        input_count=6,
        output_count=6,
    ),
    BuildingType.MOLDER: BuildingDef(
        type=BuildingType.MOLDER,
        name="塑形机",
        width=3,
        length=3,
        input_count=3,
        output_count=3,
    ),
    BuildingType.REFINERY: BuildingDef(
        type=BuildingType.REFINERY,
        name="精炼炉",
        width=3,
        length=3,
        input_count=3,
        output_count=3,
    ),
    BuildingType.CRUSHER: BuildingDef(
        type=BuildingType.CRUSHER,
        name="粉碎机",
        width=3,
        length=3,
        input_count=3,
        output_count=3,
    ),
}


def footprint_area(building_type: BuildingType) -> int:
    b = BUILDINGS[building_type]
    return b.width * b.length
