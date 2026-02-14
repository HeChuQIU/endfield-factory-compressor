"""Z3-based SAT solver for building placement.

Builds constraints:
  - Each building fits within W x H bounds
  - No two buildings overlap (separation on at least one axis)
  - Anchor first building at (0, 0) for symmetry breaking
"""

from __future__ import annotations

import logging
import math
import time
from collections.abc import AsyncIterator

from z3 import And, Int, Or, Solver, sat, unsat

from solver.buildings import BUILDINGS
from solver.models import (
    BuildingType,
    FixedDimensionMode,
    LayoutSolution,
    PlacedBuilding,
    ProductionGraph,
    SolverAttempt,
    SolverConfig,
)

logger = logging.getLogger(__name__)


def estimate_initial_bounds(graph: ProductionGraph) -> tuple[int, int]:
    """Estimate minimum W, H from total building area."""
    total_area = sum(
        BUILDINGS[node.type].width * BUILDINGS[node.type].length for node in graph.nodes
    )
    side = math.ceil(math.sqrt(total_area))
    return side, side


def _expand_bounds(
    w: int, h: int, config: SolverConfig, iteration: int
) -> tuple[int, int]:
    step = max(1, config.expansion_step)
    if config.fixed_dimension_mode == FixedDimensionMode.WIDTH:
        return w, h + step
    if config.fixed_dimension_mode == FixedDimensionMode.HEIGHT:
        return w + step, h
    # Alternate
    if iteration % 2 == 0:
        return w + step, h
    return w, h + step


def _try_solve(
    graph: ProductionGraph, width: int, height: int, timeout_ms: int
) -> tuple[str, list[PlacedBuilding]]:
    """Try to solve placement for given bounds. Returns (status, placements)."""
    solver = Solver()
    solver.set("timeout", timeout_ms)

    # Create variables
    vars_by_id: dict[str, tuple[any, any]] = {}
    for node in graph.nodes:
        x = Int(f"{node.id}_x")
        y = Int(f"{node.id}_y")
        vars_by_id[node.id] = (x, y)

        bdef = BUILDINGS[node.type]
        # Bound constraints
        solver.add(x >= 0, y >= 0)
        solver.add(x + bdef.length <= width)
        solver.add(y + bdef.width <= height)

    # Symmetry breaking: anchor first building at origin
    if graph.nodes:
        first_x, first_y = vars_by_id[graph.nodes[0].id]
        solver.add(first_x == 0, first_y == 0)

    # Non-overlap constraints
    nodes = graph.nodes
    for i in range(len(nodes)):
        for j in range(i + 1, len(nodes)):
            xi, yi = vars_by_id[nodes[i].id]
            xj, yj = vars_by_id[nodes[j].id]
            di = BUILDINGS[nodes[i].type]
            dj = BUILDINGS[nodes[j].type]
            solver.add(
                Or(
                    xi + di.length <= xj,
                    xj + dj.length <= xi,
                    yi + di.width <= yj,
                    yj + dj.width <= yi,
                )
            )

    result = solver.check()

    if result == sat:
        model = solver.model()
        placements = []
        for node in graph.nodes:
            x_var, y_var = vars_by_id[node.id]
            bdef = BUILDINGS[node.type]
            placements.append(
                PlacedBuilding(
                    node_id=node.id,
                    x=model[x_var].as_long(),
                    y=model[y_var].as_long(),
                    width=bdef.length,
                    height=bdef.width,
                )
            )
        return "sat", placements

    if result == unsat:
        return "unsat", []

    return "unknown", []


async def solve_iterative(
    graph: ProductionGraph, config: SolverConfig
) -> AsyncIterator[SolverAttempt | LayoutSolution]:
    """Iteratively expand bounds until a solution is found.

    Yields SolverAttempt for progress, then the final LayoutSolution.
    """
    start_time = time.time()
    attempts: list[SolverAttempt] = []

    est_w, est_h = estimate_initial_bounds(graph)
    w = config.initial_width or est_w
    h = config.initial_height or est_h

    for iteration in range(1, config.max_iterations + 1):
        logger.info("Attempt %d: %d x %d", iteration, w, h)

        status, placements = _try_solve(
            graph, w, h, config.timeout_ms_per_attempt
        )

        attempt = SolverAttempt(
            iteration=iteration, width=w, height=h, status=status
        )
        attempts.append(attempt)
        yield attempt

        if status == "sat":
            elapsed = (time.time() - start_time) * 1000
            yield LayoutSolution(
                status="sat",
                bounds={"width": w, "height": h},
                placements=placements,
                conveyors=[],  # TODO: conveyor routing
                attempts=attempts,
                elapsed_ms=elapsed,
            )
            return

        if status == "unknown":
            elapsed = (time.time() - start_time) * 1000
            yield LayoutSolution(
                status="unknown",
                bounds={"width": w, "height": h},
                placements=[],
                conveyors=[],
                attempts=attempts,
                elapsed_ms=elapsed,
            )
            return

        # unsat → expand
        w, h = _expand_bounds(w, h, config, iteration)

    # Exhausted iterations
    elapsed = (time.time() - start_time) * 1000
    yield LayoutSolution(
        status="unsat",
        bounds={"width": w, "height": h},
        placements=[],
        conveyors=[],
        attempts=attempts,
        elapsed_ms=elapsed,
    )
