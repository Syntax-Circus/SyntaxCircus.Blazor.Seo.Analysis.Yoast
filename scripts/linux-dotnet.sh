#!/bin/sh
set -eu
version=${SEO_ANALYSIS_VERSION:-0.1.0-local.4}
mkdir -p /work/SyntaxCircus.Seo.Analysis /work/SyntaxCircus.Seo.Analysis.Yoast
for repo in SyntaxCircus.Seo.Analysis SyntaxCircus.Seo.Analysis.Yoast; do
  tar -C "/input/$repo" --exclude=node_modules --exclude=artifacts --exclude=bin --exclude=obj --exclude=.git --exclude=nuget.local.config -cf - . | tar -C "/work/$repo" -xf -
done
cd /work/SyntaxCircus.Seo.Analysis
dotnet test -c Release -p:DisableGitVersionTask=true
dotnet restore samples/CoreOnly -p:SeoAnalysisVersion="$version" --source /input/SyntaxCircus.Seo.Analysis/artifacts/feed --source https://api.nuget.org/v3/index.json
dotnet run --project samples/CoreOnly -c Release --no-restore -p:SeoAnalysisVersion="$version"
cd /work/SyntaxCircus.Seo.Analysis.Yoast
dotnet restore -p:SeoAnalysisVersion="$version" --source /input/SyntaxCircus.Seo.Analysis/artifacts/feed --source https://api.nuget.org/v3/index.json
dotnet test -c Release --no-restore -p:DisableGitVersionTask=true -p:SeoAnalysisVersion="$version"
dotnet restore samples/Qualification -p:SeoAnalysisVersion="$version" -p:YoastAnalysisVersion="$version" --source /input/SyntaxCircus.Seo.Analysis/artifacts/feed --source /input/SyntaxCircus.Seo.Analysis.Yoast/artifacts/feed --source https://api.nuget.org/v3/index.json
YOAST_URL=http://host.docker.internal:5088/ dotnet run --project samples/Qualification -c Release --no-restore -p:SeoAnalysisVersion="$version" -p:YoastAnalysisVersion="$version" -- fixtures/owned-inputs.json /evidence/linux-corpus.json
