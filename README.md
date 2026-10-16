# SyntaxCircus.Seo.Analysis.Yoast

[![Build](https://github.com/Syntax-Circus/SyntaxCircus.Seo.Analysis.Yoast/actions/workflows/build.yml/badge.svg)](https://github.com/Syntax-Circus/SyntaxCircus.Seo.Analysis.Yoast/actions/workflows/build.yml)
[![Tests](https://img.shields.io/github/actions/workflow/status/Syntax-Circus/SyntaxCircus.Seo.Analysis.Yoast/build.yml?label=tests)](https://github.com/Syntax-Circus/SyntaxCircus.Seo.Analysis.Yoast/actions/workflows/build.yml)
[![NuGet](https://img.shields.io/nuget/v/SyntaxCircus.Seo.Analysis.Yoast.svg)](https://www.nuget.org/packages/SyntaxCircus.Seo.Analysis.Yoast)
[![Client: MIT](https://img.shields.io/badge/Client-MIT-yellow.svg)](LICENSE)
[![Service: GPL-3.0](https://img.shields.io/badge/Service-GPL--3.0-blue.svg)](service/LICENSE)

Optional .NET 10 companion for SyntaxCircus.Seo.Analysis. Runs Yoast in a private Node container; no Yoast code is delivered to browsers.

The original .NET client is MIT. The separately deployed service is GPL-3.0-only and includes dependencies under their own licenses. See [artifact licensing and source distribution](docs/LICENSING.md).

## Run the service

From service/, run npm ci --ignore-scripts. From the repository root:

```text
node scripts/prepare-source.mjs
docker compose up -d --build
```

The sample Compose deployment binds only127.0.0.1:5088. In production use a private application network, retain resource limits, and expose only your authenticated application endpoint. The service itself has no customer authentication. It stores no drafts and makes no analysis-time external requests. Configure networking at deployment if egress must be prohibited.

```csharp
// Register/manage HttpClient using the host's normal lifetime conventions.
using var http = new HttpClient { BaseAddress = new Uri("http://127.0.0.1:5088/") };
var companion = new YoastCompanion(http);
var analyzer = new ContentSeoAnalyzer();
var snapshot = analyzer.Prepare(input with { Purpose = ContentPurpose.Editorial });
var report = await analyzer.AnalyzeAsync(snapshot, companion, token);
```

The client does not own/dispose the supplied HttpClient and performs no automatic retries. Default client deadline6s; service deadline5s and concurrency2. Service environment: PORT, ANALYSIS_CONCURRENCY (1–32), ANALYSIS_DEADLINE_MS. Payload limit2MB, HTML field limit500,000 characters, worker old-generation heap128MB. Compose adds process/container limits. Each call uses a fresh worker; there is no warm worker pool.

Protocol1: POST v1/analyze with a snapshot and protocolVersion; result echoes snapshotId, engineVersion and raw assessments. English Yoast3.6.0 is pinned with @wordpress/i18n6.6.0 overriding the vulnerable5.x dependency. Unsupported engine/protocol results are withheld with partial coverage. Unknown assessments remain diagnostic. Core ownership and selective mapping suppress duplicate advice, quotas, address-change advice and keyword-in-alt requirements.

## Samples and qualification

The core0.1.0 package must be available before restoring this repository normally. For unreleased development, pack core into a local feed and override SeoAnalysisVersion. Pack this client, then restore samples against that feed using YoastAnalysisVersion. No source-project reference substitutes for the package boundary.

- samples/Qualification: actual .NET → HTTP → Yoast → .NET analysis. Run with fixtures/owned-inputs.json and an evidence output path.
- samples/BlazorHost: Server and WebAssembly paths. Build with the chosen package versions, set SAMPLE_ACCESS_KEY and ASPNETCORE_URLS, then run. Visit /login, then /server or /wasm. The sample key is a local demonstration, not a production identity system.
- npm ci, npx playwright install chromium, npm run browser: actual browser qualification against the running sample and Compose service. The test stops/restarts only this Compose project's Yoast service to check outage behavior.
- scripts/import-experiment.mjs: optional import of retained34-document experiment artifacts into ignored local files. Public article bodies are not committed here.
- scripts/linux-dotnet.sh: reproduces the recorded Linux package qualification against read-only input mounts.

WebAssembly references only the core contracts and calls its authenticated host endpoint. Server uses the same application-facing client abstraction directly. Editor generations invalidate old results on input changes/disposal.

## Release

GitVersion and build.yml follow sibling trusted-publishing conventions. CI tests the service, packs consumers, runs browser checks and assembles corresponding source. Main releases attach a version-tagged Docker image export and source archive to the same GitHub release as the NuGet version. Load the image with docker load, then deploy privately. Publish core first. Customer deployments must keep source access available for every distributed service version.

Run node scripts/source-archive.mjs from a clean committed checkout before distributing a container. It includes exact npm tarballs, full GPL upstream source archives at recorded publication commits, notices and integration/build source. Do not distribute the image without that source artifact.

Power SEO/retext browser adapters and browser-side Yoast remain future work. Puppies Plus production integration is separate. See docs/execution.md for measured evidence and limitations.
