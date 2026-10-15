using System.Net;
using System.Text;
using SyntaxCircus.Seo.Analysis;
using SyntaxCircus.Seo.Analysis.Yoast;
using Xunit;

public sealed class ClientTests
{
    private static readonly SeoSnapshot Snapshot = new ContentSeoAnalyzer().Prepare(new("<h1>A</h1><p>Hello.</p>", Purpose:ContentPurpose.Editorial));
    [Fact] public async Task Maps_known_assessments_and_preserves_unknowns()
    {
        var json = $$"""{"protocolVersion":1,"snapshotId":"{{Snapshot.Id}}","engineVersion":"3.6.0","assessments":[{"id":"passiveVoice","category":"Readability","score":3,"message":"Passive sentences."},{"id":"sentenceLength","category":"Readability","score":3,"message":"Long sentences."},{"id":"future","category":"Readability","score":3,"message":"New rule."}]}""";
        var result = await Client(json).AnalyzeAsync(Snapshot,TestContext.Current.CancellationToken);
        Assert.Equal(CoverageState.Complete,result.State);
        Assert.Contains(result.Assessments,x=>x.SemanticKey=="writing.passive-voice");
        Assert.Contains(result.Assessments,x=>x.SemanticKey=="writing.sentence-length");
        Assert.Contains(result.Assessments,x=>x.RawId=="future" && x.SemanticKey is null);
    }
    [Theory] [InlineData(429,CoverageState.Unavailable)] [InlineData(503,CoverageState.Unavailable)]
    [InlineData(504,CoverageState.TimedOut)] [InlineData(500,CoverageState.Failed)]
    public async Task Http_failure_states_are_explicit(int status,CoverageState expected)
        => Assert.Equal(expected,(await Client("{}",status).AnalyzeAsync(Snapshot,TestContext.Current.CancellationToken)).State);
    [Theory] [InlineData("3.7.0",1)] [InlineData("3.6.0",2)]
    public async Task Unsupported_version_fails_closed(string engine,int protocol)
    {
        var json=$$"""{"protocolVersion":{{protocol}},"snapshotId":"{{Snapshot.Id}}","engineVersion":"{{engine}}","assessments":[]}""";
        Assert.Equal(CoverageState.Partial,(await Client(json).AnalyzeAsync(Snapshot,TestContext.Current.CancellationToken)).State);
    }
    [Fact] public async Task Malformed_response_is_failed()
        => Assert.Equal(CoverageState.Failed,(await Client("{broken").AnalyzeAsync(Snapshot,TestContext.Current.CancellationToken)).State);
    [Fact] public async Task Omitted_score_is_not_a_successful_informational_result()
    {
        var json=$$"""{"protocolVersion":1,"snapshotId":"{{Snapshot.Id}}","engineVersion":"3.6.0","assessments":[{"id":"passiveVoice","category":"Readability","message":"Passive sentences."}]}""";
        Assert.Equal(CoverageState.Failed,(await Client(json).AnalyzeAsync(Snapshot,TestContext.Current.CancellationToken)).State);
    }
    [Fact] public async Task Timeout_does_not_swallow_caller_cancellation()
    {
        using var client=new HttpClient(new Handler(async(_,ct)=>{await Task.Delay(10000,ct);return new(HttpStatusCode.OK);})) {BaseAddress=new("http://localhost")};
        var companion=new YoastCompanion(client,TimeSpan.FromMilliseconds(20));
        Assert.Equal(CoverageState.TimedOut,(await companion.AnalyzeAsync(Snapshot,TestContext.Current.CancellationToken)).State);
        using var cts=new CancellationTokenSource(); cts.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(()=>companion.AnalyzeAsync(Snapshot,cts.Token));
    }
    private static YoastCompanion Client(string json,int status=200)
        => new(new HttpClient(new Handler((_,_)=>Task.FromResult(new HttpResponseMessage((HttpStatusCode)status){Content=new StringContent(json,Encoding.UTF8,"application/json")}))){BaseAddress=new("http://localhost")});
    private sealed class Handler(Func<HttpRequestMessage,CancellationToken,Task<HttpResponseMessage>> send):HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request,CancellationToken cancellationToken)=>send(request,cancellationToken);
    }
}
