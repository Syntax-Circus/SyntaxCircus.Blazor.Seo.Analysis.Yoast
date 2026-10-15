using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using BlazorClient;
var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.Services.AddScoped(_ => new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) });
builder.Services.AddScoped<IAnalysisClient, RemoteAnalysisClient>();
await builder.Build().RunAsync();
