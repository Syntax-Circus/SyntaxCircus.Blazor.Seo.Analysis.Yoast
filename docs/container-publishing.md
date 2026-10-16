# Public container releases

The release job publishes the tested Linux amd64 service image as
`ghcr.io/syntax-circus/seo-analysis-yoast:<version>`. The version is derived from
the released NuGet package, matching its GitHub `v<version>` release. Stable and
prerelease versions both get their exact version tag; neither moves `latest`.
No new Docker Hub credentials or personal access token are needed: the protected
release job uses `GITHUB_TOKEN` with `packages: write`.

## Release sequence

The existing main-push build must pass .NET, service, consumer and browser checks.
It exports the image and corresponding source as one workflow artifact. The
protected `release` job publishes NuGet, creates the version tag/release, and
attaches `yoast-image.tar.gz` and `corresponding-source.tar.gz` before publishing
the same image to GHCR. It does not rebuild the image in the publishing job.
The image carries OCI repository, license and documentation labels.

The final step pulls the image with an empty Docker credential configuration.
It fails the job if anonymous access is unavailable. A successful step records
the image reference, registry digest and source-release link in the run summary.
PRs and feature branches run qualification without executing the release job.

## First publication: make the package public

A public GitHub repository does not automatically make a new GHCR package
public. After the first image push, a package administrator must open the
Syntax-Circus organization's **Packages → seo-analysis-yoast → Package settings**,
then set **Change visibility → Public**. Confirm that the package is linked to
this repository and that this repository's Actions have write access. The OCI
source label links newly created packages to the repository.

If the first run fails its anonymous-pull check while the package is private,
make it Public and rerun the failed release job. NuGet duplicate publishing is
already skipped, and the same downloaded build artifact is reused. An anonymous
pull failure can also indicate a registry/network error; inspect the Docker
error before changing settings.

GitHub's [Container registry documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
describes initial visibility, repository linking and anonymous access.

## Pull and deploy

Choose a version whose release job completed the public-pull check. For example,
with `YOAST_VERSION` set to that exact released version:

```sh
docker pull "ghcr.io/syntax-circus/seo-analysis-yoast:$YOAST_VERSION"
```

For Compose, set `image` to that reference and allow normal image pulls; remove
any `pull_policy: never` inherited from archive-only deployments. Deploy on a
private application network, preserving the resource limits and authenticated
application boundary described in the README. Registry visibility does not
require exposing the running HTTP service publicly.

Download and retain `corresponding-source.tar.gz` from the matching `v<version>`
GitHub release whenever distributing the image. Existing image exports remain
available as an alternative installation method. Release0.1.0 predates registry
publishing; do not assume its tag exists in GHCR until independently verified.
See [licensing and corresponding source](LICENSING.md).
