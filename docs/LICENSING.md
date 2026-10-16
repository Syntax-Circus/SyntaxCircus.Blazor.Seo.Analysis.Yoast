# Artifact licensing and corresponding source

Original .NET client and sample code: MIT (root LICENSE). The NuGet package contains no Yoast JavaScript or Node dependencies.

Service code under service/: GPL-3.0-only (service/LICENSE). The Yoast and WordPress dependencies retain their own GPL licenses; other dependencies retain their notices. service/source/dependency-inventory.json records exact resolved versions, package integrity, repositories and notices. TinySegmenter includes a package MIT notice and an upstream BSD-style notice. The latter was retrieved from its declared URL, http://chasen.org/~taku/software/TinySegmenter/LICENCE.txt, on 2026-10-15 and is retained in service/notices/. Preserve both notices and the original source header.

## Build and distribution

1. Install Node 24 and Docker; run npm ci --ignore-scripts inside service/.
2. From the repository root run node scripts/prepare-source.mjs.
3. Run node scripts/source-archive.mjs. It downloads integrity-checked exact npm tarballs and full upstream source repositories at npm publication gitHead commits for every GPL dependency. It includes source/build scripts, notices and source hashes.
4. Run docker compose build. Yoast is unmodified upstream code; the pinned i18n override is recorded in package.json and package-lock.json. The service imports built English assessors from npm; upstream archives retain their preferred source, workspace manifests and build scripts.
5. Distribute artifacts/corresponding-source.tar.gz alongside each versioned container artifact, at the same durable release location. Keep it available for every distributed version. The integration repository's exact release sources are included via git archive.
6. Keep the Node base-image notices. The Dockerfile pins its digest; official Node image sources/build instructions are at https://github.com/nodejs/docker-node and Debian source packages at https://sources.debian.org/. The image export includes base-image notices. The source bundle covers application dependencies, not a mirror of all Debian base sources.

Do not ship minified/built assets as a substitute for corresponding source. Do not remove notices or restrict recipients' rights in the GPL service. The service retains no submitted content.

## Application boundary

A private HTTP service keeps Yoast out of browser downloads and .NET assemblies. This technical separation is not a legal determination that every downstream combination is independent. Obtain licensing review for commercial deployment and any customer-distributed/on-premise bundle. Ordinary GPL differs from AGPL network-use provisions; do not assume that browser downloads count as server-only use.

## Future adapters

Power SEO (MIT) and selected retext plugins (MIT) are candidates for browser-local companions. They were examined in the earlier experiment; each requires its own adapter qualification and exact dependency-license review. Browser-side Yoast remains a separate future experiment requiring licensing review.
