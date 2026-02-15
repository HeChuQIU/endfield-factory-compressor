# Tile-Based SAT Solver Implementation

## Overview

This document describes the refactoring of the Endfield Factory Compressor to treat conveyors as 1x1 buildings in the SAT formulation, following the approach from the Factorio-SAT project.

## Key Changes

### 1. Models (`backend/Models.cs`)

Added new enums to support tile-based representation:

- `BuildingType.Conveyor` - Conveyors are now first-class buildings
- `Direction` enum (Up, Right, Down, Left) - For conveyor input/output directions  
- `TileType` enum (Empty, Machine, Conveyor) - Type of each tile

### 2. Building Definitions (`backend/Z3Solver.cs`)

Added conveyor definition:
```csharp
{
    BuildingType.Conveyor,
    new Models.BuildingDef
    {
        Type = BuildingType.Conveyor,
        Name = "传送带",
        Width = 1,
        Length = 1,
        InputCount = 1,
        OutputCount = 1
    }
}
```

### 3. Tile-Based Grid Representation

Each tile (x, y) in the grid has boolean variables:

- `IsEmpty`, `IsMachine`, `IsConveyor` - Tile type (exactly one must be true)
- `MachineId[nodeId]` - Which machine occupies this tile (if any)
- `InDirection[dir]` - Input direction for conveyors (Up/Right/Down/Left)
- `OutDirection[dir]` - Output direction for conveyors

### 4. SAT Constraints

#### Constraint 1: Tile Type
Each tile has exactly one type (empty, machine, or conveyor):
```csharp
solver.Add(ctx.MkOr(tile.IsEmpty, tile.IsMachine, tile.IsConveyor));
solver.Add(ctx.MkNot(ctx.MkAnd(tile.IsEmpty, tile.IsMachine)));
solver.Add(ctx.MkNot(ctx.MkAnd(tile.IsEmpty, tile.IsConveyor)));
solver.Add(ctx.MkNot(ctx.MkAnd(tile.IsMachine, tile.IsConveyor)));
```

#### Constraint 2: Machine Footprint
Each machine must occupy a contiguous rectangle matching its size:
```csharp
// For each possible position (x,y)
var footprintVars = new List<BoolExpr>();
for (int dx = 0; dx < def.Length; dx++)
{
    for (int dy = 0; dy < def.Width; dy++)
    {
        footprintVars.Add(tiles[x + dx, y + dy].MachineId[node.Id]);
    }
}
positions.Add(ctx.MkAnd(footprintVars.ToArray()));

// Exactly one position must be selected
solver.Add(ctx.MkOr(positions.ToArray()));
// Mutual exclusion between positions
```

#### Constraint 3: Conveyor Directions
Conveyors must have exactly one input direction and one output direction, and they must be different:
```csharp
// Exactly one input direction
solver.Add(ctx.MkImplies(tile.IsConveyor, ctx.MkOr(inDirList)));
for (int i = 0; i < inDirList.Length; i++)
{
    for (int j = i + 1; j < inDirList.Length; j++)
    {
        solver.Add(ctx.MkNot(ctx.MkAnd(inDirList[i], inDirList[j])));
    }
}

// Input and output must be different
foreach (var dir in tile.InDirection.Keys)
{
    solver.Add(ctx.MkNot(ctx.MkAnd(tile.InDirection[dir], tile.OutDirection[dir])));
}
```

#### Constraint 4: Adjacent Tile Connectivity
Adjacent tiles must have consistent connectivity (if a conveyor outputs in a direction, the neighbor must accept input from the opposite direction):
```csharp
solver.Add(ctx.MkImplies(
    ctx.MkAnd(tile.IsConveyor, tile.OutDirection[dir]),
    ctx.MkAnd(neighborTile.IsConveyor, neighborTile.InDirection[oppositeDir])
));
```

### 5. Initial Bounds Estimation

Updated to ensure minimum grid size fits the largest machine:
```csharp
var maxLength = graph.Nodes.Max(n => BuildingDefinitions.Buildings[n.Type].Length);
var maxWidth = graph.Nodes.Max(n => BuildingDefinitions.Buildings[n.Type].Width);
var side = Math.Max(
    Math.Max(maxLength, maxWidth),
    Math.Ceiling(Math.Sqrt(totalArea))
);
```

## Example: Steel Block Production

Created a simple example (`examples/steel-block-production.md`) with:
- 1 refinery (3×3 building)
- 1 belt input of dense blue iron powder
- 1 belt input of sand leaf powder
- 1 belt output of steel blocks

This serves as a validation case that's simpler than the complex buckwheat capsule production line.

## Frontend Changes

- Added steel block example (`frontend/src/examples/steel-block.ts`)
- Updated App.tsx to support example selection
- Added dropdown to switch between steel block and buckwheat capsule examples

## Comparison with Factorio-SAT

Our implementation follows similar principles:

| Aspect | Factorio-SAT | Our Implementation |
|--------|--------------|-------------------|
| Tile representation | 1×1 tiles with boolean vars | ✅ Same |
| Belt/conveyor | 1×1 building | ✅ Same |
| Direction encoding | One-hot over 4 directions | ✅ Same |
| Machine footprint | N×M contiguous tiles | ✅ Same |
| Adjacency constraints | Output matches neighbor input | ✅ Same |
| SAT solver | Generic SAT solver | Z3 SMT solver |

## Future Improvements

1. **Path Constraints**: Add explicit path routing from machine outputs to inputs based on graph edges
2. **Conveyor Bridges**: Add support for conveyor bridges as special tiles that allow crossing
3. **Electric Power**: Add power tower placement and coverage constraints
4. **Optimization**: Minimize total area, minimize conveyor count, etc.
5. **Performance**: Optimize constraint generation for larger grids

## References

- Factorio-SAT project: https://github.com/R-O-C-K-E-T/Factorio-SAT
- Game documentation: `examples/premium-buckwheat-capsule.md`
