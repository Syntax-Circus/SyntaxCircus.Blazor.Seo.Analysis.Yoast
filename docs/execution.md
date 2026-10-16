# Yoast companion execution

Approved scope: MIT .NET HTTP client; separately deployed GPL Yoast service; packaged Blazor Server and WebAssembly samples. No production Puppies Plus changes or browser Yoast distribution.

## Completion and measured evidence

- Client9 and Node4 tests first failed on unimplemented behavior and passed after implementation. Final Windows/Linux:client10+Node4 each; core19 each. See qualification.json.
- Actual packaged .NET→HTTP→Yoast→.NET:34 retained documents,40 baseline/50 combined findings, baseline retained34/34;136 degraded checks. Linux additionally passes24 owned inputs and96 degraded checks.
- Actual Chromium browser:18 checks pass across Server and WebAssembly, including passive-to-active rewrite, stale editing invalidation, narrow viewport, authenticated endpoint, companion outages and absence of Yoast downloads. Zero page errors. Browser run is Windows; Linux browser CI is configured but not locally executed.
- The service uses a fresh worker per call. A single writing-fixture HTTP measurement records first174ms, subsequent median190ms (range162–203ms), request1545 bytes/response3522 bytes. These are local observations, not production SLOs. Two idle memory samples18.5/49.82MiB are not peak measurements. Image241,219,195 bytes.
- Initial npm audit showed three moderate findings. Pinning WordPress i18n6.6.0 removes the affected runtime/sprintf dependencies:final npm audit reports zero. NuGet sample packages use patched Blazor10.0.13 after10.0.12 restore exposed two high advisories.
- Final review:three Important issues (unbounded nesting, malformed companion results losing baseline, CI dependence on uninstalled RTK) and two Minor issues (missing scores, slash-containing branch filters) addressed. Behavioral fixes have observed RED→GREEN regressions; internal scripts now use standard git/tar/docker. No unresolved Critical/Important findings remain.
- Workflows parse and match feature branches. Package contents inspected:core25,213 bytes/client15,415 bytes; only intended runtime dependencies, license/readme included, no JS or ASP.NET references.
- Source preparation assembles42 dependency inventories/notices,46 exact source artifacts including all GPL publication commits, and retained original TinySegmenter notice. The source pipeline passes in a plain Linux Node24 container with standard git/tar and no RTK installed. The90.5MB measured archive includes the committed integration source; its embedded Git identity is verified against the implementation commit.

## Rulings and limitations

- MIT C# client and GPL service are distinct artifacts; the boundary is not a downstream legal guarantee. Browser Yoast remains future work; Power SEO/retext are recorded permissive candidates.
- The approved in-chat plan is the specification. Shared implementation rulings are recorded in the core sibling's execution.md.
- A sample rebuild initially encountered the still-running sample host's Windows file locks. Stopping that owned process and rebuilding produced zero warnings/errors.
- Local audit commands require the temporary core feed/version until the first core release; an unqualified automatic restore cannot find the intentionally unpublished core.
- No hosted CI, trusted publishing, NuGet release or container publication has executed. The core must publish before this dependent client's ordinary CI restore. No production Puppies Plus integration or deployment was made.

## GHCR publishing follow-up — 2026-10-16

Owner requested public registry distribution and a PR. Branch
`feature/ghcr-publishing` starts at `aa3461a`, whose main workflow is now observed
successful and whose release0.1.0 contains image/source archives. Earlier
unexecuted-release limitations above describe the initial implementation checkpoint.

The existing protected main-push release job now receives package-write permission,
attaches corresponding source before registry publication, loads the tested image
archive and pushes its exact NuGet version to
`ghcr.io/syntax-circus/seo-analysis-yoast:<version>`. No floating latest tag is
published. An empty Docker credential configuration checks anonymous pulls and
records the image digest/source link in the run summary. PR/feature builds retain
read-only permissions and cannot execute that release job. OCI source, license
and documentation labels accompany the service. First-package Public visibility
and failed-job rerun steps are documented in container-publishing.md.

Local verification: .NET10 tests pass10/10, Node service tests4/4, zero failures
or skips. Official actionlint1.7.12 (download checksum verified) accepts the
complete workflow with ShellCheck disabled. Linux amd64 image build succeeds;
the actual workflow load/tag Bash block passes syntax and execution checks using
a qualification version filename and an actual Docker export/load. The GHCR
reference is lowercased and versioned correctly. Image identity is preserved:
`sha256:49002b70ccf1c85d3ee99b7a15a1e5f9258ecc4661f2e55544f34c5709b89c6c`.
OCI labels, nonroot user and architecture checks pass. The owned container's
health endpoint passes on an isolated network with read-only filesystem and
dropped capabilities; the container and temporary qualification tags are removed.
Local evidence is retained under ignored artifacts/ghcr-qualification/.

One fresh read-only review finds no actionable defects. This work does not push
a registry image, change package visibility, merge, release NuGet or deploy an
application. Hosted PR checks and actual push/anonymous pull remain to be measured
after opening the PR and, for publishing, after merge and protected release approval.
No Puppies Plus configuration is changed by this PR.

## Stable latest tag follow-up — 2026-10-16

Owner requested both exact version and `:latest` tags after merging PR2.
`feature/ghcr-latest` starts at merged `d310684`. Stable releases now push the
exact version first, tag that same image as `:latest`, and push it. Prereleases
leave `:latest` unchanged. Anonymous verification and the run summary cover
every published tag. Documentation explains that `:latest` is mutable, including
on stable release reruns; exact versions/digests remain available for pinning.

The actual workflow shell first failed a regression because it pushed no latest
tag. Final seven shell checks pass for stable/prerelease push and anonymous-pull
selection plus version/latest push failure propagation. Only registry commands
are stubbed; actual Bash control flow runs. This dependency-free check now runs
in the normal build after Node setup. Windows CRLF is normalized before parsing.
Local .NET10 tests10/10 and Node service tests4/4 pass; actionlint1.7.12 and
whitespace checks pass. Fresh read-only review finds no actionable defects.
No runtime/image content changes are made; no registry push or deployment is
performed locally. Hosted CI and actual latest publication are left to the PR
and protected main release respectively.
