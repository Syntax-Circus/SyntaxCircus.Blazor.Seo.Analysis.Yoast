using BlazorClient;
using SyntaxCircus.Seo.Analysis;
namespace BlazorHost;
public sealed class ServerAnalysisClient(IContentSeoAnalyzer analyzer, ISeoCompanion companion) : IAnalysisClient
{
    public Task<SeoAnalysisReport> AnalyzeAsync(SeoDocumentInput input, CancellationToken cancellationToken)
        => analyzer.AnalyzeAsync(analyzer.Prepare(input, cancellationToken), companion, cancellationToken);
}
