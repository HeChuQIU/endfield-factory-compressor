namespace EndField.Solver;

using Microsoft.Z3;
using EndField.Solver.Models;

public static partial class BuildingDefinitions
{
    public static readonly Dictionary<BuildingType, Models.BuildingDef> Buildings = new()
    {
        {
            BuildingType.Filler,
            new Models.BuildingDef
            {
                Type = BuildingType.Filler,
                Name = "灌装机",
                Width = 3,
                Length = 6,
                InputCount = 6,
                OutputCount = 6
            }
        },
        {
            BuildingType.Grinder,
            new Models.BuildingDef
            {
                Type = BuildingType.Grinder,
                Name = "研磨机",
                Width = 3,
                Length = 6,
                InputCount = 6,
                OutputCount = 6
            }
        },
        {
            BuildingType.Molder,
            new Models.BuildingDef
            {
                Type = BuildingType.Molder,
                Name = "塑形机",
                Width = 3,
                Length = 3,
                InputCount = 3,
                OutputCount = 3
            }
        },
        {
            BuildingType.Refinery,
            new Models.BuildingDef
            {
                Type = BuildingType.Refinery,
                Name = "精炼炉",
                Width = 3,
                Length = 3,
                InputCount = 3,
                OutputCount = 3
            }
        },
        {
            BuildingType.Crusher,
            new Models.BuildingDef
            {
                Type = BuildingType.Crusher,
                Name = "粉碎机",
                Width = 3,
                Length = 3,
                InputCount = 3,
                OutputCount = 3
            }
        },
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
    };

    public static int FootprintArea(BuildingType type)
    {
        var def = Buildings[type];
        return def.Width * def.Length;
    }
}

// Helper class for tile variables in SAT encoding
internal class TileVars
{
    public required BoolExpr IsEmpty { get; set; }
    public required BoolExpr IsMachine { get; set; }
    public required BoolExpr IsConveyor { get; set; }
    public required BoolExpr IsBridge { get; set; }  // Conveyor bridge for crossing
    public required Dictionary<string, BoolExpr> MachineId { get; set; } // nodeId -> bool
    public required Dictionary<Models.Direction, BoolExpr> InDirection { get; set; }
    public required Dictionary<Models.Direction, BoolExpr> OutDirection { get; set; }
}

public class Z3Solver
{
    public static (double W, double H) EstimateInitialBounds(Models.ProductionGraph graph)
    {
        if (graph.Nodes == null || graph.Nodes.Count == 0)
        {
            return (3, 3); // Minimum default size
        }
        
        // For each machine, calculate its footprint
        var machineArea = graph.Nodes.Sum(n =>
            BuildingDefinitions.Buildings[n.Type].Width *
            BuildingDefinitions.Buildings[n.Type].Length
        );
        
        // Add space for conveyors (rough estimate: 2 belts per connection)
        var conveyorArea = (graph.Edges != null) ? graph.Edges.Sum(e => e.Belts * 2) : 0;
        
        var totalArea = machineArea + conveyorArea;
        
        // Start with minimum size to fit the largest machine
        var maxLength = graph.Nodes.Max(n => BuildingDefinitions.Buildings[n.Type].Length);
        var maxWidth = graph.Nodes.Max(n => BuildingDefinitions.Buildings[n.Type].Width);
        
        // Use the larger of: minimum to fit largest machine, or sqrt of total area
        var side = Math.Max(
            Math.Max(maxLength, maxWidth),
            Math.Ceiling(Math.Sqrt(totalArea))
        );
        
        return (side, side);
    }

    private static (int Width, int Height) ExpandBounds(
        int w,
        int h,
        Models.SolverConfig config,
        int iteration
    )
    {
        var step = Math.Max(1, config.ExpansionStep);
        return config.FixedDimensionMode switch
        {
            FixedDimensionMode.Width => (w, h + step),
            FixedDimensionMode.Height => (w + step, h),
            _ => (iteration % 2 == 0) ? (w + step, h) : (w, h + step)
        };
    }

    private static TileVars CreateTileVars(Context ctx, int x, int y, List<string> nodeIds)
    {
        var prefix = $"tile_{x}_{y}";
        
        var machineIdVars = new Dictionary<string, BoolExpr>();
        foreach (var nodeId in nodeIds)
        {
            machineIdVars[nodeId] = ctx.MkBoolConst($"{prefix}_machine_{nodeId}");
        }
        
        return new TileVars
        {
            IsEmpty = ctx.MkBoolConst($"{prefix}_empty"),
            IsMachine = ctx.MkBoolConst($"{prefix}_machine"),
            IsConveyor = ctx.MkBoolConst($"{prefix}_conveyor"),
            IsBridge = ctx.MkBoolConst($"{prefix}_bridge"),
            MachineId = machineIdVars,
            InDirection = new Dictionary<Models.Direction, BoolExpr>
            {
                { Models.Direction.Up, ctx.MkBoolConst($"{prefix}_in_up") },
                { Models.Direction.Right, ctx.MkBoolConst($"{prefix}_in_right") },
                { Models.Direction.Down, ctx.MkBoolConst($"{prefix}_in_down") },
                { Models.Direction.Left, ctx.MkBoolConst($"{prefix}_in_left") }
            },
            OutDirection = new Dictionary<Models.Direction, BoolExpr>
            {
                { Models.Direction.Up, ctx.MkBoolConst($"{prefix}_out_up") },
                { Models.Direction.Right, ctx.MkBoolConst($"{prefix}_out_right") },
                { Models.Direction.Down, ctx.MkBoolConst($"{prefix}_out_down") },
                { Models.Direction.Left, ctx.MkBoolConst($"{prefix}_out_left") }
            }
        };
    }

    private static Models.Direction OppositeDirection(Models.Direction dir)
    {
        return dir switch
        {
            Models.Direction.Up => Models.Direction.Down,
            Models.Direction.Down => Models.Direction.Up,
            Models.Direction.Left => Models.Direction.Right,
            Models.Direction.Right => Models.Direction.Left,
            _ => throw new ArgumentException($"Invalid direction: {dir}")
        };
    }

    private static (int dx, int dy) DirectionVector(Models.Direction dir)
    {
        return dir switch
        {
            Models.Direction.Up => (0, -1),
            Models.Direction.Down => (0, 1),
            Models.Direction.Left => (-1, 0),
            Models.Direction.Right => (1, 0),
            _ => throw new ArgumentException($"Invalid direction: {dir}")
        };
    }

    public static (string Status, List<Models.PlacedBuilding> Placements, List<Models.ConveyorSegment> Conveyors) TrySolve(
        Models.ProductionGraph graph,
        int width,
        int height,
        int timeoutMs
    )
    {
        using var ctx = new Context();
        var solver = ctx.MkSolver();
        solver.Set("timeout", (uint)timeoutMs);

        var nodeIds = graph.Nodes.Select(n => n.Id).ToList();
        
        // Create tile variables for the grid
        var tiles = new TileVars[width, height];
        for (int x = 0; x < width; x++)
        {
            for (int y = 0; y < height; y++)
            {
                tiles[x, y] = CreateTileVars(ctx, x, y, nodeIds);
            }
        }

        // Constraint 1: Each tile has exactly one type (empty, machine, conveyor, or bridge)
        for (int x = 0; x < width; x++)
        {
            for (int y = 0; y < height; y++)
            {
                var tile = tiles[x, y];
                
                // Exactly one type: at least one must be true
                solver.Add(ctx.MkOr(tile.IsEmpty, tile.IsMachine, tile.IsConveyor, tile.IsBridge));
                
                // Mutual exclusion: no two can be true at the same time
                solver.Add(ctx.MkNot(ctx.MkAnd(tile.IsEmpty, tile.IsMachine)));
                solver.Add(ctx.MkNot(ctx.MkAnd(tile.IsEmpty, tile.IsConveyor)));
                solver.Add(ctx.MkNot(ctx.MkAnd(tile.IsEmpty, tile.IsBridge)));
                solver.Add(ctx.MkNot(ctx.MkAnd(tile.IsMachine, tile.IsConveyor)));
                solver.Add(ctx.MkNot(ctx.MkAnd(tile.IsMachine, tile.IsBridge)));
                solver.Add(ctx.MkNot(ctx.MkAnd(tile.IsConveyor, tile.IsBridge)));
                
                // If machine, exactly one machine ID is true
                var machineIdList = tile.MachineId.Values.ToArray();
                if (machineIdList.Length > 0)
                {
                    solver.Add(ctx.MkImplies(tile.IsMachine, ctx.MkOr(machineIdList)));
                    // At most one machine ID
                    for (int i = 0; i < machineIdList.Length; i++)
                    {
                        for (int j = i + 1; j < machineIdList.Length; j++)
                        {
                            solver.Add(ctx.MkNot(ctx.MkAnd(machineIdList[i], machineIdList[j])));
                        }
                    }
                }
                
                // If empty, no directions
                solver.Add(ctx.MkImplies(tile.IsEmpty, 
                    ctx.MkAnd(tile.InDirection.Values.Select(v => ctx.MkNot(v)).ToArray())));
                solver.Add(ctx.MkImplies(tile.IsEmpty,
                    ctx.MkAnd(tile.OutDirection.Values.Select(v => ctx.MkNot(v)).ToArray())));
                
                // If machine, no directions (machines don't have belt directions)
                solver.Add(ctx.MkImplies(tile.IsMachine,
                    ctx.MkAnd(tile.InDirection.Values.Select(v => ctx.MkNot(v)).ToArray())));
                solver.Add(ctx.MkImplies(tile.IsMachine,
                    ctx.MkAnd(tile.OutDirection.Values.Select(v => ctx.MkNot(v)).ToArray())));
                
                // If conveyor, exactly one input direction and one output direction (must be different)
                // If bridge, exactly TWO input directions and TWO output directions (perpendicular flows)
                if (tile.InDirection.Count > 0)
                {
                    var inDirList = tile.InDirection.Values.ToArray();
                    var outDirList = tile.OutDirection.Values.ToArray();
                    
                    // Conveyor: exactly one input and one output
                    solver.Add(ctx.MkImplies(tile.IsConveyor, ctx.MkOr(inDirList)));
                    solver.Add(ctx.MkImplies(tile.IsConveyor, ctx.MkOr(outDirList)));
                    
                    // Exactly one input direction for conveyor
                    for (int i = 0; i < inDirList.Length; i++)
                    {
                        for (int j = i + 1; j < inDirList.Length; j++)
                        {
                            solver.Add(ctx.MkImplies(tile.IsConveyor, ctx.MkNot(ctx.MkAnd(inDirList[i], inDirList[j]))));
                        }
                    }
                    
                    // Exactly one output direction for conveyor
                    for (int i = 0; i < outDirList.Length; i++)
                    {
                        for (int j = i + 1; j < outDirList.Length; j++)
                        {
                            solver.Add(ctx.MkImplies(tile.IsConveyor, ctx.MkNot(ctx.MkAnd(outDirList[i], outDirList[j]))));
                        }
                    }
                    
                    // Conveyor: Input and output must be different
                    foreach (var dir in tile.InDirection.Keys)
                    {
                        solver.Add(ctx.MkImplies(tile.IsConveyor, 
                            ctx.MkNot(ctx.MkAnd(tile.InDirection[dir], tile.OutDirection[dir]))));
                    }
                    
                    // Bridge: exactly TWO perpendicular flows (e.g., Up/Down AND Left/Right)
                    // A bridge has two independent flows that don't mix
                    var isVerticalFlow = ctx.MkAnd(
                        ctx.MkOr(tile.InDirection[Models.Direction.Up], tile.InDirection[Models.Direction.Down]),
                        ctx.MkOr(tile.OutDirection[Models.Direction.Up], tile.OutDirection[Models.Direction.Down])
                    );
                    var isHorizontalFlow = ctx.MkAnd(
                        ctx.MkOr(tile.InDirection[Models.Direction.Left], tile.InDirection[Models.Direction.Right]),
                        ctx.MkOr(tile.OutDirection[Models.Direction.Left], tile.OutDirection[Models.Direction.Right])
                    );
                    
                    // Bridge must have both vertical and horizontal flows
                    solver.Add(ctx.MkImplies(tile.IsBridge, ctx.MkAnd(isVerticalFlow, isHorizontalFlow)));
                    
                    // Bridge: vertical in/out must match (if in from Up, out to Down or vice versa)
                    solver.Add(ctx.MkImplies(
                        ctx.MkAnd(tile.IsBridge, tile.InDirection[Models.Direction.Up]),
                        tile.OutDirection[Models.Direction.Down]
                    ));
                    solver.Add(ctx.MkImplies(
                        ctx.MkAnd(tile.IsBridge, tile.InDirection[Models.Direction.Down]),
                        tile.OutDirection[Models.Direction.Up]
                    ));
                    
                    // Bridge: horizontal in/out must match (if in from Left, out to Right or vice versa)
                    solver.Add(ctx.MkImplies(
                        ctx.MkAnd(tile.IsBridge, tile.InDirection[Models.Direction.Left]),
                        tile.OutDirection[Models.Direction.Right]
                    ));
                    solver.Add(ctx.MkImplies(
                        ctx.MkAnd(tile.IsBridge, tile.InDirection[Models.Direction.Right]),
                        tile.OutDirection[Models.Direction.Left]
                    ));
                }
            }
        }

        // Constraint 2: Each machine occupies its footprint
        foreach (var node in graph.Nodes)
        {
            var def = BuildingDefinitions.Buildings[node.Type];
            var positions = new List<BoolExpr>();
            
            // Machine can be placed at any valid position
            for (int x = 0; x <= width - def.Length; x++)
            {
                for (int y = 0; y <= height - def.Width; y++)
                {
                    // This position is valid if all tiles in footprint belong to this machine
                    var footprintVars = new List<BoolExpr>();
                    for (int dx = 0; dx < def.Length; dx++)
                    {
                        for (int dy = 0; dy < def.Width; dy++)
                        {
                            footprintVars.Add(tiles[x + dx, y + dy].MachineId[node.Id]);
                        }
                    }
                    positions.Add(ctx.MkAnd(footprintVars.ToArray()));
                }
            }
            
            // Machine must be placed at exactly one position
            if (positions.Count > 0)
            {
                solver.Add(ctx.MkOr(positions.ToArray()));
                
                // At most one position (mutual exclusion)
                for (int i = 0; i < positions.Count; i++)
                {
                    for (int j = i + 1; j < positions.Count; j++)
                    {
                        solver.Add(ctx.MkNot(ctx.MkAnd(positions[i], positions[j])));
                    }
                }
            }
            
            // If a tile belongs to this machine, it must be a machine tile
            for (int x = 0; x < width; x++)
            {
                for (int y = 0; y < height; y++)
                {
                    solver.Add(ctx.MkImplies(tiles[x, y].MachineId[node.Id], tiles[x, y].IsMachine));
                }
            }
        }

        // Constraint 3: Machines cannot be adjacent to other machine tiles (different machines)
        // This enforces the rule that machines MUST connect through conveyors/bridges
        for (int x = 0; x < width; x++)
        {
            for (int y = 0; y < height; y++)
            {
                var tile = tiles[x, y];
                
                // For each direction, if this is a machine tile, the adjacent tile cannot be a different machine
                foreach (var dir in new[] { Models.Direction.Up, Models.Direction.Right, Models.Direction.Down, Models.Direction.Left })
                {
                    var (dx, dy) = DirectionVector(dir);
                    var nx = x + dx;
                    var ny = y + dy;
                    
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height)
                    {
                        var neighborTile = tiles[nx, ny];
                        
                        // If this tile and neighbor are both machines, they must be the same machine (same footprint)
                        // Otherwise they must NOT both be machines (different machines can't be adjacent)
                        foreach (var nodeId in nodeIds)
                        {
                            foreach (var otherNodeId in nodeIds)
                            {
                                if (nodeId != otherNodeId)
                                {
                                    // Different machines cannot be adjacent
                                    solver.Add(ctx.MkNot(ctx.MkAnd(
                                        tile.MachineId[nodeId],
                                        neighborTile.MachineId[otherNodeId]
                                    )));
                                }
                            }
                        }
                    }
                }
            }
        }

        // Constraint 4: Adjacent tiles must have consistent connectivity for conveyors and bridges
        for (int x = 0; x < width; x++)
        {
            for (int y = 0; y < height; y++)
            {
                var tile = tiles[x, y];
                
                foreach (var dir in tile.OutDirection.Keys)
                {
                    var (dx, dy) = DirectionVector(dir);
                    var nx = x + dx;
                    var ny = y + dy;
                    
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height)
                    {
                        var neighborTile = tiles[nx, ny];
                        var oppositeDir = OppositeDirection(dir);
                        
                        // If conveyor outputs in a direction, neighbor must be conveyor or bridge that accepts input
                        solver.Add(ctx.MkImplies(
                            ctx.MkAnd(tile.IsConveyor, tile.OutDirection[dir]),
                            ctx.MkAnd(
                                ctx.MkOr(neighborTile.IsConveyor, neighborTile.IsBridge),
                                neighborTile.InDirection[oppositeDir]
                            )
                        ));
                        
                        // If bridge outputs in a direction, neighbor must be conveyor or bridge that accepts input
                        solver.Add(ctx.MkImplies(
                            ctx.MkAnd(tile.IsBridge, tile.OutDirection[dir]),
                            ctx.MkAnd(
                                ctx.MkOr(neighborTile.IsConveyor, neighborTile.IsBridge),
                                neighborTile.InDirection[oppositeDir]
                            )
                        ));
                    }
                }
            }
        }

        // Constraint 5: Each edge in graph must have corresponding conveyor path
        // For simplicity, we'll relax this constraint initially and just ensure
        // machines have adequate neighbors for connections
        // TODO: Add proper path constraints for material flows

        var result = solver.Check();

        if (result == Status.SATISFIABLE)
        {
            var model = solver.Model;
            var placements = new List<Models.PlacedBuilding>();
            var conveyors = new List<Models.ConveyorSegment>();
            var processedMachines = new HashSet<string>();

            // Extract machine placements
            for (int x = 0; x < width; x++)
            {
                for (int y = 0; y < height; y++)
                {
                    var tile = tiles[x, y];
                    
                    foreach (var (nodeId, machineVar) in tile.MachineId)
                    {
                        if (model.Eval(machineVar).IsTrue && !processedMachines.Contains(nodeId))
                        {
                            var node = graph.Nodes.First(n => n.Id == nodeId);
                            var def = BuildingDefinitions.Buildings[node.Type];
                            
                            placements.Add(new Models.PlacedBuilding
                            {
                                NodeId = nodeId,
                                X = x,
                                Y = y,
                                Width = def.Length,
                                Height = def.Width
                            });
                            
                            processedMachines.Add(nodeId);
                            break;
                        }
                    }
                    
                    // Extract conveyor segments
                    if (model.Eval(tile.IsConveyor).IsTrue)
                    {
                        string? inDir = null;
                        string? outDir = null;
                        
                        foreach (var (dir, dirVar) in tile.InDirection)
                        {
                            if (model.Eval(dirVar).IsTrue)
                            {
                                inDir = dir.ToString().ToLower();
                                break;
                            }
                        }
                        
                        foreach (var (dir, dirVar) in tile.OutDirection)
                        {
                            if (model.Eval(dirVar).IsTrue)
                            {
                                outDir = dir.ToString().ToLower();
                                break;
                            }
                        }
                        
                        if (inDir != null && outDir != null)
                        {
                            conveyors.Add(new Models.ConveyorSegment
                            {
                                X = x,
                                Y = y,
                                InDirection = inDir,
                                OutDirection = outDir,
                                IsBridge = false
                            });
                        }
                    }
                    
                    // Extract bridge segments
                    if (model.Eval(tile.IsBridge).IsTrue)
                    {
                        var inDirs = new List<string>();
                        var outDirs = new List<string>();
                        
                        foreach (var (dir, dirVar) in tile.InDirection)
                        {
                            if (model.Eval(dirVar).IsTrue)
                            {
                                inDirs.Add(dir.ToString().ToLower());
                            }
                        }
                        
                        foreach (var (dir, dirVar) in tile.OutDirection)
                        {
                            if (model.Eval(dirVar).IsTrue)
                            {
                                outDirs.Add(dir.ToString().ToLower());
                            }
                        }
                        
                        // Bridge has two flows - for simplicity, report the primary flow
                        // (vertical or horizontal based on which is listed first)
                        if (inDirs.Count >= 2 && outDirs.Count >= 2)
                        {
                            conveyors.Add(new Models.ConveyorSegment
                            {
                                X = x,
                                Y = y,
                                InDirection = inDirs[0],
                                OutDirection = outDirs[0],
                                IsBridge = true
                            });
                        }
                    }
                }
            }

            return ("sat", placements, conveyors);
        }

        if (result == Status.UNSATISFIABLE)
            return ("unsat", new(), new());

        return ("unknown", new(), new());
    }

    public static async IAsyncEnumerable<object> SolveIterative(
        Models.ProductionGraph graph,
        Models.SolverConfig config
    )
    {
        var startTime = DateTime.Now;
        var attempts = new List<Models.SolverAttempt>();

        var (estW, estH) = EstimateInitialBounds(graph);
        var w = config.InitialWidth ?? (int)estW;
        var h = config.InitialHeight ?? (int)estH;

        for (int iteration = 1; iteration <= config.MaxIterations; iteration++)
        {
            var (status, placements, conveyors) = TrySolve(graph, w, h, config.TimeoutMsPerAttempt);

            var attempt = new Models.SolverAttempt
            {
                Iteration = iteration,
                Width = w,
                Height = h,
                Status = status
            };
            attempts.Add(attempt);

            yield return new { type = "attempt", data = attempt };

            if (status == "sat")
            {
                var elapsed = (DateTime.Now - startTime).TotalMilliseconds;
                yield return new
                {
                    type = "solution",
                    data = new Models.LayoutSolution
                    {
                        Status = "sat",
                        Bounds = new() { { "width", w }, { "height", h } },
                        Placements = placements,
                        Conveyors = conveyors,
                        Attempts = attempts,
                        ElapsedMs = elapsed
                    }
                };
                yield break;
            }

            if (status == "unknown")
            {
                var elapsed = (DateTime.Now - startTime).TotalMilliseconds;
                yield return new
                {
                    type = "solution",
                    data = new Models.LayoutSolution
                    {
                        Status = "unknown",
                        Bounds = new() { { "width", w }, { "height", h } },
                        Placements = new(),
                        Conveyors = new(),
                        Attempts = attempts,
                        ElapsedMs = elapsed
                    }
                };
                yield break;
            }

            (w, h) = ExpandBounds(w, h, config, iteration);
        }

        // Exhausted iterations
        var finalElapsed = (DateTime.Now - startTime).TotalMilliseconds;
        yield return new
        {
            type = "solution",
            data = new Models.LayoutSolution
            {
                Status = "unsat",
                Bounds = new() { { "width", w }, { "height", h } },
                Placements = new(),
                Conveyors = new(),
                Attempts = attempts,
                ElapsedMs = finalElapsed
            }
        };
    }
}
