"""Pydantic models shared between solver and API layer."""

from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel


class BuildingType(str, Enum):
    FILLER = "filler"
    GRINDER = "grinder"
    MOLDER = "molder"
    REFINERY = "refinery"
    CRUSHER = "crusher"


class FixedDimensionMode(str, Enum):
    NONE = "none"
    WIDTH = "width"
    HEIGHT = "height"


class BuildingDef(BaseModel):
    type: BuildingType
    name: str
    width: int
    length: int
    input_count: int
    output_count: int


class MachineNode(BaseModel):
    id: str
    label: str
    type: BuildingType


class MaterialFlowEdge(BaseModel):
    id: str
    from_id: str
    to_id: str
    item: str
    belts: int


class ProductionGraph(BaseModel):
    id: str
    target_product: str
    target_belts: int
    nodes: list[MachineNode]
    edges: list[MaterialFlowEdge]


class SolverConfig(BaseModel):
    initial_width: int | None = None
    initial_height: int | None = None
    fixed_dimension_mode: FixedDimensionMode = FixedDimensionMode.NONE
    expansion_step: int = 1
    max_iterations: int = 50
    timeout_ms_per_attempt: int = 30000


class SolverAttempt(BaseModel):
    iteration: int
    width: int
    height: int
    status: Literal["sat", "unsat", "unknown"]


class PlacedBuilding(BaseModel):
    node_id: str
    x: int
    y: int
    width: int
    height: int


class ConveyorSegment(BaseModel):
    x: int
    y: int
    in_direction: Literal["up", "right", "down", "left"]
    out_direction: Literal["up", "right", "down", "left"]
    is_bridge: bool = False
    edge_id: str | None = None


class LayoutSolution(BaseModel):
    status: Literal["sat", "unsat", "unknown"]
    bounds: dict[str, int]  # {"width": ..., "height": ...}
    placements: list[PlacedBuilding]
    conveyors: list[ConveyorSegment]
    attempts: list[SolverAttempt]
    elapsed_ms: float
