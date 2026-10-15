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
- Source preparation assembles42 dependency inventories/notices,46 exact source artifacts including all GPL publication commits, and retained original TinySegmenter notice. An initial archive build succeeds; final clean-commit/Linux source verification follows the implementation commit.

## Rulings and limitations

- MIT C# client and GPL service are distinct artifacts; the boundary is not a downstream legal guarantee. Browser Yoast remains future work; Power SEO/retext are recorded permissive candidates.
- The approved in-chat plan is the specification. Shared implementation rulings are recorded in the core sibling's execution.md.
- A sample rebuild initially encountered the still-running sample host's Windows file locks. Stopping that owned process and rebuilding produced zero warnings/errors.
- Local audit commands require the temporary core feed/version until the first core release; an unqualified automatic restore cannot find the intentionally unpublished core.
- No hosted CI, trusted publishing, NuGet release or container publication has executed. The core must publish before this dependent client's ordinary CI restore. No production Puppies Plus integration or deployment was made.
