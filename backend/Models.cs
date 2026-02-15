namespace EndField.Solver.Models;

public enum BuildingType
{
    Filler,
    Grinder,
    Molder,
    Refinery,
    Crusher,
    Conveyor
}

public enum Direction
{
    Up = 0,
    Right = 1,
    Down = 2,
    Left = 3
}

public enum TileType
{
    Empty = 0,
    Machine = 1,
    Conveyor = 2
}

public enum FixedDimensionMode
{
    None,
    Width,
    Height
}

public class BuildingDef
{
    public required BuildingType Type { get; set; }
    public required string Name { get; set; }
    public required int Width { get; set; }
    public required int Length { get; set; }
    public required int InputCount { get; set; }
    public required int OutputCount { get; set; }
}

public class MachineNode
{
    public required string Id { get; set; }
    public required string Label { get; set; }
    public required BuildingType Type { get; set; }
}

public class MaterialFlowEdge
{
    public required string Id { get; set; }
    public required string FromId { get; set; }
    public required string ToId { get; set; }
    public required string Item { get; set; }
    public required int Belts { get; set; }
}

public class ProductionGraph
{
    public required string Id { get; set; }
    public required string TargetProduct { get; set; }
    public required int TargetBelts { get; set; }
    public required List<MachineNode> Nodes { get; set; }
    public required List<MaterialFlowEdge> Edges { get; set; }
}

public class SolverConfig
{
    public int? InitialWidth { get; set; }
    public int? InitialHeight { get; set; }
    public FixedDimensionMode FixedDimensionMode { get; set; } = FixedDimensionMode.None;
    public int ExpansionStep { get; set; } = 1;
    public int MaxIterations { get; set; } = 50;
    public int TimeoutMsPerAttempt { get; set; } = 30000;
}

public class SolverAttempt
{
    public required int Iteration { get; set; }
    public required int Width { get; set; }
    public required int Height { get; set; }
    public required string Status { get; set; } // "sat" | "unsat" | "unknown"
}

public class PlacedBuilding
{
    public required string NodeId { get; set; }
    public required int X { get; set; }
    public required int Y { get; set; }
    public required int Width { get; set; }
    public required int Height { get; set; }
}

public class ConveyorSegment
{
    public required int X { get; set; }
    public required int Y { get; set; }
    public required string InDirection { get; set; }
    public required string OutDirection { get; set; }
    public bool IsBridge { get; set; }
    public string? EdgeId { get; set; }
}

public class LayoutSolution
{
    public required string Status { get; set; } // "sat" | "unsat" | "unknown"
    public required Dictionary<string, int> Bounds { get; set; } // width, height
    public required List<PlacedBuilding> Placements { get; set; }
    public required List<ConveyorSegment> Conveyors { get; set; }
    public required List<SolverAttempt> Attempts { get; set; }
    public required double ElapsedMs { get; set; }
}
