using Microsoft.AspNetCore.Components;
using SyntaxCircus.Seo.Analysis;
namespace BlazorClient;
public partial class AnalysisPanel
{
    [Inject] private IAnalysisClient Client { get; set; } = default!;
    private string Content { get; set; } = "<h1>Puppy care</h1><p>The puppies were fed by the breeder. The bedding was washed by the helper. The records were checked by the owner.</p>";
    private SeoAnalysisReport? Report { get; set; }
    private string Status { get; set; } = "Ready";
    private CancellationTokenSource? pending;
    private int generation;
    private void ContentChanged(ChangeEventArgs args)
    {
        Content = args.Value?.ToString() ?? "";
        generation++; pending?.Cancel(); Report = null; Status = "Changed — analyze again";
    }
    private async Task AnalyzeAsync()
    {
        pending?.Cancel();
        using var request = new CancellationTokenSource();
        pending = request;
        var current = ++generation;
        Status = "Analyzing";
        try
        {
            var report = await Client.AnalyzeAsync(new(Content, "Puppy care", "Preparing for a puppy.", Purpose: ContentPurpose.Editorial), request.Token);
            if (current == generation) { Report = report; Status = "Analysis complete"; }
        }
        catch (OperationCanceledException) { }
        catch (Exception) { if (current == generation) Status = "Analysis unavailable — try again"; }
        finally { if (ReferenceEquals(pending, request)) pending = null; }
    }
    public void Dispose() { generation++; pending?.Cancel(); }
}
