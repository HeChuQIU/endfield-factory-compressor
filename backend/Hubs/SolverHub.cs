namespace EndField.Solver.Hubs;

using Microsoft.AspNetCore.SignalR;

public class SolverHub : Hub
{
    public async IAsyncEnumerable<object> Solve(Models.ProductionGraph graph, Models.SolverConfig config)
    {
        await Task.Yield();

        await foreach (var item in Z3Solver.SolveIterative(graph, config))
        {
            yield return item;
        }
    }
}
