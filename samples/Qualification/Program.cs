using System.Diagnostics;
using System.Net.Http.Json;
using System.Text.Json;
using SyntaxCircus.Seo.Analysis;
using SyntaxCircus.Seo.Analysis.Yoast;

var analyzer = new ContentSeoAnalyzer();
using var http = new HttpClient { BaseAddress = new Uri(Environment.GetEnvironmentVariable("YOAST_URL") ?? "http://127.0.0.1:5088/") };
var companion = new YoastCompanion(http);
var options = new JsonSerializerOptions(JsonSerializerDefaults.Web) { WriteIndented = true };
var documents = args.Length > 0
    ? JsonSerializer.Deserialize<SeoDocumentInput[]>(await File.ReadAllTextAsync(args[0]), options)!
    : new[] {
        new SeoDocumentInput("<h1>Contact us</h1><p>Email our family to arrange a visit.</p>", "Contact us", "Arrange a visit."),
        new SeoDocumentInput("<h1>Puppy care</h1><p>The puppies were fed by the breeder. The bedding was washed by the helper. The records were checked by the owner.</p>", "Puppy care", "Preparing for a puppy.", Purpose: ContentPurpose.Editorial),
        new SeoDocumentInput("<h1>Puppy care</h1><p>We feed the puppies. Next, our helper washes the bedding. Finally, the owner checks the records.</p>", "Puppy care", "Preparing for a puppy.", Purpose: ContentPurpose.Editorial),
        new SeoDocumentInput("<h1>Photos</h1><section data-section-id='photos'><img><img alt=''></section>", "Our dogs", "Meet our dogs.")
    };
var rows = new List<object>();
foreach (var input in documents)
{
    var watch = Stopwatch.StartNew();
    var snapshot = analyzer.Prepare(input);
    var baseline = await analyzer.AnalyzeAsync(snapshot);
    var report = await analyzer.AnalyzeAsync(snapshot, companion);
    foreach (var finding in baseline.Findings)
        if (!report.Findings.Contains(finding)) throw new Exception("Core finding lost");
    if (input.Purpose == ContentPurpose.Editorial && !report.Coverage.Any(x => x.Provider == "yoast" && x.State is CoverageState.Complete or CoverageState.Partial))
        throw new Exception("Real Yoast coverage missing");
    foreach (var state in new[] { CoverageState.Failed, CoverageState.TimedOut, CoverageState.Unavailable, CoverageState.Stale })
    {
        var degraded = await analyzer.AnalyzeAsync(snapshot, new Degraded(state));
        if (!degraded.Findings.SequenceEqual(baseline.Findings)) throw new Exception("Degraded companion changed baseline");
    }
    rows.Add(new { snapshot.Id, input.Title, milliseconds = watch.Elapsed.TotalMilliseconds, baseline = baseline.Findings.Length, combined = report.Findings.Length, report });
}
var evidence = JsonSerializer.Serialize(new { count = documents.Length, rows }, options);
if (args.Length > 1) { Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(args[1]))!); await File.WriteAllTextAsync(args[1], evidence); }
else await File.WriteAllTextAsync("artifacts-qualification.json", evidence);
Console.WriteLine(JsonSerializer.Serialize(new { count = documents.Length, corePreserved = documents.Length, degradedChecks = documents.Length * 4 }, options));
sealed class Degraded(CoverageState state) : ISeoCompanion
{
    public Task<CompanionResult> AnalyzeAsync(SeoSnapshot snapshot, CancellationToken cancellationToken = default)
        => Task.FromResult(new CompanionResult(state == CoverageState.Stale ? "old" : snapshot.Id,"yoast","3.6.0",state,[]));
}
