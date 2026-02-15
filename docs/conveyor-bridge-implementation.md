# Conveyor Belt and Bridge Implementation

## Overview

This document describes the correct implementation of conveyor belts and conveyor bridges as 1×1 buildings in the SAT solver, following the game's connection rules.

## Connection Rules (from Game Documentation)

### Direct Connection
- ❌ **Machines cannot connect directly** - adjacent machine input/output is NOT valid
- ✅ Machines MUST connect through conveyor belts

### Conveyor Belts
- **Size**: 1×1 building (occupies grid space)
- **Directions**: Each belt has ONE input direction and ONE output direction
- **Constraint**: Input and output directions must be different
- **Purpose**: Transport items between machines

### Conveyor Bridges
- **Function**: Allow two belt flows to cross without mixing
- **Size**: 1×1 building
- **Flows**: TWO perpendicular flows (e.g., vertical Up/Down AND horizontal Left/Right)
- **Chaining**: Multiple bridges can be consecutive
- **Machine Connection**: Machines separated only by bridges = valid connection

## SAT Implementation

### Tile Types

```csharp
public enum TileType
{
    Empty = 0,    // Empty space
    Machine = 1,  // Part of a machine (3×3 or 3×6 footprint)
    Conveyor = 2, // Regular conveyor belt (1×1)
    Bridge = 3    // Conveyor bridge (1×1, allows crossing)
}
```

### Tile Variables (per grid position)

```csharp
internal class TileVars
{
    public BoolExpr IsEmpty;      // true if empty tile
    public BoolExpr IsMachine;    // true if machine tile
    public BoolExpr IsConveyor;   // true if conveyor belt
    public BoolExpr IsBridge;     // true if conveyor bridge
    
    public Dictionary<string, BoolExpr> MachineId;  // which machine (if IsMachine)
    
    // Direction variables (for conveyors and bridges)
    public Dictionary<Direction, BoolExpr> InDirection;   // Up/Right/Down/Left
    public Dictionary<Direction, BoolExpr> OutDirection;  // Up/Right/Down/Left
}
```

## SAT Constraints

### 1. Tile Type Mutual Exclusion

Each tile is exactly ONE type:

```csharp
// At least one type
solver.Add(ctx.MkOr(tile.IsEmpty, tile.IsMachine, tile.IsConveyor, tile.IsBridge));

// Mutual exclusion (no two can be true)
solver.Add(ctx.MkNot(ctx.MkAnd(tile.IsEmpty, tile.IsMachine)));
solver.Add(ctx.MkNot(ctx.MkAnd(tile.IsEmpty, tile.IsConveyor)));
// ... (6 pairs total)
```

### 2. Direction Constraints

**Empty Tiles**: No directions
```csharp
solver.Add(ctx.MkImplies(tile.IsEmpty, 
    ctx.MkAnd(tile.InDirection.Values.Select(v => ctx.MkNot(v)))));
```

**Machine Tiles**: No belt directions (machines don't have conveyor directions)
```csharp
solver.Add(ctx.MkImplies(tile.IsMachine,
    ctx.MkAnd(tile.InDirection.Values.Select(v => ctx.MkNot(v)))));
```

**Conveyor Tiles**: Exactly one input, exactly one output, must differ
```csharp
// Exactly one input direction (at-most-one constraint)
for (int i = 0; i < inDirList.Length; i++)
{
    for (int j = i + 1; j < inDirList.Length; j++)
    {
        solver.Add(ctx.MkImplies(tile.IsConveyor, 
            ctx.MkNot(ctx.MkAnd(inDirList[i], inDirList[j]))));
    }
}

// Input and output must differ
foreach (var dir in tile.InDirection.Keys)
{
    solver.Add(ctx.MkImplies(tile.IsConveyor, 
        ctx.MkNot(ctx.MkAnd(tile.InDirection[dir], tile.OutDirection[dir]))));
}
```

**Bridge Tiles**: TWO perpendicular flows (both vertical AND horizontal)
```csharp
// Must have vertical flow (Up or Down in both input and output)
var isVerticalFlow = ctx.MkAnd(
    ctx.MkOr(tile.InDirection[Up], tile.InDirection[Down]),
    ctx.MkOr(tile.OutDirection[Up], tile.OutDirection[Down])
);

// Must have horizontal flow (Left or Right in both input and output)
var isHorizontalFlow = ctx.MkAnd(
    ctx.MkOr(tile.InDirection[Left], tile.InDirection[Right]),
    ctx.MkOr(tile.OutDirection[Left], tile.OutDirection[Right])
);

// Bridge requires BOTH flows
solver.Add(ctx.MkImplies(tile.IsBridge, ctx.MkAnd(isVerticalFlow, isHorizontalFlow)));

// Vertical flow must be straight-through: Up→Down or Down→Up
solver.Add(ctx.MkImplies(
    ctx.MkAnd(tile.IsBridge, tile.InDirection[Up]),
    tile.OutDirection[Down]
));

// Horizontal flow must be straight-through: Left→Right or Right→Left
solver.Add(ctx.MkImplies(
    ctx.MkAnd(tile.IsBridge, tile.InDirection[Left]),
    tile.OutDirection[Right]
));
```

### 3. Machine Adjacency Constraint (CRITICAL!)

**Different machines cannot be adjacent** - this enforces the rule that machines MUST connect through conveyors/bridges:

```csharp
foreach (var nodeId in nodeIds)
{
    foreach (var otherNodeId in nodeIds)
    {
        if (nodeId != otherNodeId)
        {
            // Different machines cannot share an edge
            solver.Add(ctx.MkNot(ctx.MkAnd(
                tile.MachineId[nodeId],
                neighborTile.MachineId[otherNodeId]
            )));
        }
    }
}
```

This is the key constraint that enforces the game rule: **machines cannot directly connect**.

### 4. Belt Adjacency Constraints

Conveyors and bridges must have consistent input/output with neighbors:

```csharp
// If conveyor outputs in direction D, neighbor must accept input from opposite(D)
solver.Add(ctx.MkImplies(
    ctx.MkAnd(tile.IsConveyor, tile.OutDirection[dir]),
    ctx.MkAnd(
        ctx.MkOr(neighborTile.IsConveyor, neighborTile.IsBridge),
        neighborTile.InDirection[oppositeDir]
    )
));

// Same for bridges
solver.Add(ctx.MkImplies(
    ctx.MkAnd(tile.IsBridge, tile.OutDirection[dir]),
    ctx.MkAnd(
        ctx.MkOr(neighborTile.IsConveyor, neighborTile.IsBridge),
        neighborTile.InDirection[oppositeDir]
    )
));
```

## Example: Bridge Crossing

```
       ↑
       |
   ← Bridge →
       |
       ↓
```

The bridge tile has:
- `InDirection[Up] = true, InDirection[Left] = true`
- `OutDirection[Down] = true, OutDirection[Right] = true`

This allows:
- Vertical flow: items entering from Up exit to Down (no mixing)
- Horizontal flow: items entering from Left exit to Right (no mixing)

## Solution Extraction

When the SAT solver finds a solution:

1. **Machines**: Extract from tiles where `IsMachine = true` and `MachineId[nodeId] = true`
2. **Conveyors**: Extract from tiles where `IsConveyor = true`, report single input/output direction
3. **Bridges**: Extract from tiles where `IsBridge = true`, report as `IsBridge = true` in `ConveyorSegment`

```csharp
if (model.Eval(tile.IsBridge).IsTrue)
{
    // Collect all active directions
    var inDirs = tile.InDirection.Where(kv => model.Eval(kv.Value).IsTrue)
                     .Select(kv => kv.Key.ToString().ToLower()).ToList();
    var outDirs = tile.OutDirection.Where(kv => model.Eval(kv.Value).IsTrue)
                      .Select(kv => kv.Key.ToString().ToLower()).ToList();
    
    conveyors.Add(new ConveyorSegment
    {
        X = x,
        Y = y,
        InDirection = inDirs[0],  // Report primary flow
        OutDirection = outDirs[0],
        IsBridge = true
    });
}
```

## Validation

The implementation correctly enforces:
- ✅ Conveyors and bridges are 1×1 buildings (occupy grid tiles)
- ✅ Machines cannot connect directly (adjacency constraint)
- ✅ Conveyors have one input, one output (must differ)
- ✅ Bridges have two perpendicular flows
- ✅ Bridges allow crossing without mixing
- ✅ Adjacent tiles have consistent connections

## References

- Game documentation: `/examples/premium-buckwheat-capsule.md`
- Factorio-SAT project: https://github.com/R-O-C-K-E-T/Factorio-SAT
- Implementation: `backend/Z3Solver.cs` and `backend/Models.cs`
