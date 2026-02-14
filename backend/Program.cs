var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy
            .AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});

builder.Services.AddSignalR();

var app = builder.Build();

app.UseRouting();
app.UseCors();

app.MapGet("/health", () => new { status = "ok" });
app.MapHub<EndField.Solver.Hubs.SolverHub>("/solver");

await app.RunAsync();
