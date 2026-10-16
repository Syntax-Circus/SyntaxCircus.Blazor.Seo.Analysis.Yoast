using System.Net.Http.Json;
using SyntaxCircus.Seo.Analysis;
namespace BlazorClient;
public interface IAnalysisClient
{
    Task<SeoAnalysisReport> AnalyzeAsync(SeoDocumentInput input, CancellationToken cancellationToken);
}
public sealed class RemoteAnalysisClient(HttpClient http) : IAnalysisClient
{
    public async Task<SeoAnalysisReport> AnalyzeAsync(SeoDocumentInput input, CancellationToken cancellationToken)
    {
        using var response = await http.PostAsJsonAsync("api/analysis", input, cancellationToken);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<SeoAnalysisReport>(cancellationToken))!;
    }
}
