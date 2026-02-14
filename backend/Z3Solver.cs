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
        }
    };

    public static int FootprintArea(BuildingType type)
    {
        var def = Buildings[type];
        return def.Width * def.Length;
    }
}

public class Z3Solver
{
    public static (double W, double H) EstimateInitialBounds(Models.ProductionGraph graph, int gap = 1)
    {
        var totalArea = graph.Nodes.Sum(n =>
        {
            var def = BuildingDefinitions.Buildings[n.Type];
            return (def.Width + gap) * (def.Length + gap);
        });
        var side = Math.Ceiling(Math.Sqrt(totalArea));
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

    public static (string Status, List<Models.PlacedBuilding> Placements) TrySolve(
        Models.ProductionGraph graph,
        int width,
        int height,
        int timeoutMs,
        int conveyorGap = 1
    )
    {
        using var ctx = new Context();
        var solver = ctx.MkSolver();
        solver.Set("timeout", (uint)timeoutMs);

        var varsByNodeId = new Dictionary<string, (ArithExpr X, ArithExpr Y)>();

        foreach (var node in graph.Nodes)
        {
            var x = ctx.MkIntConst($"{node.Id}_x");
            var y = ctx.MkIntConst($"{node.Id}_y");
            var def = BuildingDefinitions.Buildings[node.Type];

            varsByNodeId[node.Id] = (x, y);

            solver.Add(ctx.MkGe(x, ctx.MkInt(0)));
            solver.Add(ctx.MkGe(y, ctx.MkInt(0)));
            solver.Add(ctx.MkLe(ctx.MkAdd(x, ctx.MkInt(def.Length)), ctx.MkInt(width)));
            solver.Add(ctx.MkLe(ctx.MkAdd(y, ctx.MkInt(def.Width)), ctx.MkInt(height)));
        }

        // Anchor first building at origin
        if (graph.Nodes.Count > 0)
        {
            var (firstX, firstY) = varsByNodeId[graph.Nodes[0].Id];
            solver.Add(ctx.MkEq(firstX, ctx.MkInt(0)));
            solver.Add(ctx.MkEq(firstY, ctx.MkInt(0)));
        }

        // Non-overlap constraints with conveyor gap
        // Every pair of buildings must have at least `conveyorGap` cells
        // between them to allow conveyor belt routing.
        for (int i = 0; i < graph.Nodes.Count; i++)
        {
            for (int j = i + 1; j < graph.Nodes.Count; j++)
            {
                var nodeA = graph.Nodes[i];
                var nodeB = graph.Nodes[j];
                var (xiA, yiA) = varsByNodeId[nodeA.Id];
                var (xiB, yiB) = varsByNodeId[nodeB.Id];
                var defA = BuildingDefinitions.Buildings[nodeA.Type];
                var defB = BuildingDefinitions.Buildings[nodeB.Type];

                var gap = ctx.MkInt(conveyorGap);
                solver.Add(
                    ctx.MkOr(
                        ctx.MkLe(ctx.MkAdd(xiA, ctx.MkInt(defA.Length), gap), xiB),
                        ctx.MkLe(ctx.MkAdd(xiB, ctx.MkInt(defB.Length), gap), xiA),
                        ctx.MkLe(ctx.MkAdd(yiA, ctx.MkInt(defA.Width), gap), yiB),
                        ctx.MkLe(ctx.MkAdd(yiB, ctx.MkInt(defB.Width), gap), yiA)
                    )
                );
            }
        }

        var result = solver.Check();

        if (result == Status.SATISFIABLE)
        {
            var model = solver.Model;
            var placements = new List<Models.PlacedBuilding>();

            foreach (var node in graph.Nodes)
            {
                var (xVar, yVar) = varsByNodeId[node.Id];
                var def = BuildingDefinitions.Buildings[node.Type];
                var xVal = ((IntNum)model.Eval(xVar)).Int;
                var yVal = ((IntNum)model.Eval(yVar)).Int;

                placements.Add(
                    new Models.PlacedBuilding
                    {
                        NodeId = node.Id,
                        X = xVal,
                        Y = yVal,
                        Width = def.Length,
                        Height = def.Width
                    }
                );
            }

            return ("sat", placements);
        }

        if (result == Status.UNSATISFIABLE)
            return ("unsat", new());

        return ("unknown", new());
    }

    public static async IAsyncEnumerable<object> SolveIterative(
        Models.ProductionGraph graph,
        Models.SolverConfig config
    )
    {
        var startTime = DateTime.Now;
        var attempts = new List<Models.SolverAttempt>();

        var gap = config.ConveyorGap;
        var (estW, estH) = EstimateInitialBounds(graph, gap);
        var w = config.InitialWidth ?? (int)estW;
        var h = config.InitialHeight ?? (int)estH;

        for (int iteration = 1; iteration <= config.MaxIterations; iteration++)
        {
            var (status, placements) = TrySolve(graph, w, h, config.TimeoutMsPerAttempt, gap);

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
                        Conveyors = new(),
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
