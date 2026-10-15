using System.Collections.Immutable;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace SyntaxCircus.Seo.Analysis.Yoast;

/// <summary>Calls the private, version-matched Yoast service. Does not own the supplied HttpClient.</summary>
public sealed class YoastCompanion : ISeoCompanion
{
    public const string SupportedEngineVersion = "3.6.0";
    private const int MaximumResponseBytes = 1_000_000;
    private readonly HttpClient client;
    private readonly TimeSpan timeout;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public YoastCompanion(HttpClient client, TimeSpan? timeout = null)
    {
        ArgumentNullException.ThrowIfNull(client);
        this.client = client;
        this.timeout = timeout ?? TimeSpan.FromSeconds(6);
        if (this.timeout <= TimeSpan.Zero || this.timeout > TimeSpan.FromMinutes(1)) throw new ArgumentOutOfRangeException(nameof(timeout));
    }
    public async Task<CompanionResult> AnalyzeAsync(SeoSnapshot snapshot, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(snapshot);
        cancellationToken.ThrowIfCancellationRequested();
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        deadline.CancelAfter(timeout);
        CompanionResult Result(CoverageState state, string detail) => new(snapshot.Id, "yoast", SupportedEngineVersion, state, [], detail);
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, "v1/analyze")
            {
                Content = JsonContent.Create(new { protocolVersion = 1, snapshot })
            };
            using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, deadline.Token).ConfigureAwait(false);
            if (!response.IsSuccessStatusCode) return Result((int)response.StatusCode switch {
                429 or 503 => CoverageState.Unavailable, 504 => CoverageState.TimedOut, _ => CoverageState.Failed
            }, "Yoast service returned HTTP " + (int)response.StatusCode + ".");
            if (response.Content.Headers.ContentLength > MaximumResponseBytes) return Result(CoverageState.Failed, "Response exceeds size limit.");
            await using var stream = await response.Content.ReadAsStreamAsync(deadline.Token).ConfigureAwait(false);
            using var buffer = new MemoryStream();
            var chunk = new byte[8192];
            int count;
            while ((count = await stream.ReadAsync(chunk, deadline.Token).ConfigureAwait(false)) > 0)
            {
                if (buffer.Length + count > MaximumResponseBytes) return Result(CoverageState.Failed, "Response exceeds size limit.");
                buffer.Write(chunk, 0, count);
            }
            var wire = JsonSerializer.Deserialize<WireResponse>(buffer.ToArray(), JsonOptions);
            if (wire is null || wire.Assessments is null || string.IsNullOrWhiteSpace(wire.SnapshotId))
                return Result(CoverageState.Failed, "Invalid response.");
            if (wire.ProtocolVersion != 1 || wire.EngineVersion != SupportedEngineVersion)
                return new(wire.SnapshotId, "yoast", wire.EngineVersion ?? "", CoverageState.Partial, [], "Unsupported protocol or engine version; assessments withheld.");
            if (wire.Assessments.Any(x => x is null || string.IsNullOrWhiteSpace(x.Id) || x.Message is null || !double.IsFinite(x.Score)))
                return Result(CoverageState.Failed, "Invalid assessment.");
            return new(wire.SnapshotId, "yoast", wire.EngineVersion, CoverageState.Complete,
                wire.Assessments.Select(Map).ToImmutableArray());
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { throw; }
        catch (OperationCanceledException) { return Result(CoverageState.TimedOut, "Yoast request timed out."); }
        catch (HttpRequestException) { return Result(CoverageState.Unavailable, "Yoast service unavailable."); }
        catch (IOException) { return Result(CoverageState.Unavailable, "Yoast response interrupted."); }
        catch (JsonException) { return Result(CoverageState.Failed, "Invalid Yoast response JSON."); }
    }
    private static CompanionAssessment Map(WireAssessment raw)
    {
        var key = raw.Id switch {
            "passiveVoice" => "writing.passive-voice",
            "sentenceBeginnings" => "writing.sentence-beginnings",
            "textTransitionWords" => "writing.transition-words",
            "subheadingsTooLong" => "writing.subheading-distribution",
            "keyphraseLength" => "phrase.length",
            "subheadingsKeyword" => "phrase.subheadings",
            "textSentenceLength" or "sentenceLength" => "writing.sentence-length",
            "textParagraphTooLong" => "writing.paragraph-length",
            "introductionKeyword" => "phrase.introduction",
            "keyphraseDensity" => "phrase.density",
            "metaDescriptionKeyword" => "phrase.description",
            "keyphraseInSEOTitle" => "phrase.title",
            "metaDescriptionLength" => "metadata.description",
            "titleWidth" => "metadata.title",
            "singleH1" => "structure.headings",
            _ => null
        };
        var suppressed = raw.Id switch {
            "textLength" => "No word quota",
            "images" => "No media quota",
            "externalLinks" or "internalLinks" => "No link quota",
            "slugKeyword" => "No address-change coaching",
            "imageKeyphrase" => "No keyword-in-alt requirement",
            "textCompetingLinks" => "Not selected for authoring guidance",
            _ => null
        };
        var severity = raw.Score < 5 ? FindingSeverity.Warning : raw.Score < 9 ? FindingSeverity.Suggestion : FindingSeverity.Information;
        // Zero is Yoast's informational/not-applicable result, not a failing assessment.
        if (raw.Score == 0) severity = FindingSeverity.Information;
        return new(raw.Id, key, key?.StartsWith("phrase.", StringComparison.Ordinal) == true ? FindingCategory.FocusPhrase : FindingCategory.Readability,
            severity, WebUtility.HtmlDecode(raw.Message), "Review this suggestion in context; keep natural wording.",
            raw.Id is "keyphraseLength" or "subheadingsKeyword", raw.Score, suppressed);
    }
    private sealed record WireResponse(int ProtocolVersion, string SnapshotId, string? EngineVersion, WireAssessment[] Assessments);
    private sealed record WireAssessment(string Id, [property: JsonRequired] double Score, string Message, string Category);
}
