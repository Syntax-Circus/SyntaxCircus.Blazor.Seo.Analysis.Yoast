using System.Security.Claims;
using System.Text.Encodings.Web;
using BlazorClient;
using BlazorHost;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using SyntaxCircus.Seo.Analysis;
using SyntaxCircus.Seo.Analysis.Yoast;

var builder = WebApplication.CreateBuilder(args);
var sampleKey = Environment.GetEnvironmentVariable("SAMPLE_ACCESS_KEY") ?? throw new InvalidOperationException("Set SAMPLE_ACCESS_KEY for this local demonstration.");
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie(options => { options.LoginPath = "/login"; options.Cookie.SameSite = SameSiteMode.Strict; });
builder.Services.AddAuthorization();
builder.Services.AddRazorComponents().AddInteractiveServerComponents().AddInteractiveWebAssemblyComponents();
builder.Services.AddScoped<IContentSeoAnalyzer, ContentSeoAnalyzer>();
builder.Services.AddScoped(_ => new HttpClient { BaseAddress = new Uri(Environment.GetEnvironmentVariable("YOAST_URL") ?? "http://127.0.0.1:5088/") });
builder.Services.AddScoped<ISeoCompanion>(sp => new YoastCompanion(sp.GetRequiredService<HttpClient>()));
builder.Services.AddScoped<IAnalysisClient, ServerAnalysisClient>();
var app = builder.Build();
app.UseAuthentication(); app.UseAuthorization(); app.UseAntiforgery();
app.MapGet("/login", (HttpContext context, IAntiforgery antiforgery) =>
{
    var token = antiforgery.GetAndStoreTokens(context);
    return Results.Content("<!doctype html><html><body><h1>Local sample login</h1><form method='post' action='/sample-login'><label>Sample access key <input type='password' name='key'></label><input type='hidden' name='" + HtmlEncoder.Default.Encode(token.FormFieldName) + "' value='" + HtmlEncoder.Default.Encode(token.RequestToken!) + "'><button>Sign in</button></form></body></html>", "text/html");
});
app.MapPost("/sample-login", async (HttpContext context, IAntiforgery antiforgery) =>
{
    await antiforgery.ValidateRequestAsync(context);
    var form = await context.Request.ReadFormAsync(context.RequestAborted);
    if (form["key"] != sampleKey) return Results.Unauthorized();
    await context.SignInAsync(new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.Name, "sample-user")], CookieAuthenticationDefaults.AuthenticationScheme)));
    return Results.Redirect("/");
});
app.MapPost("/api/analysis", async (SeoDocumentInput input, IAnalysisClient client, CancellationToken cancellationToken) =>
    Results.Ok(await client.AnalyzeAsync(input, cancellationToken))).RequireAuthorization();
app.MapStaticAssets();
app.MapRazorComponents<App>().AddInteractiveServerRenderMode().AddInteractiveWebAssemblyRenderMode().AddAdditionalAssemblies(typeof(AnalysisPanel).Assembly).RequireAuthorization();
app.Run();
