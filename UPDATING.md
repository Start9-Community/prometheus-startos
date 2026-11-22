# Updating the upstream version

## Determining the upstream version

The package runs the upstream image `prom/prometheus`, pinned at `images.prometheus.source.dockerTag` in `startos/manifest/index.ts`. The latest release:

```bash
gh release view -R prometheus/prometheus --json tagName -q .tagName
```

Confirm the tag is published for both architectures before pinning it:

```bash
docker manifest inspect prom/prometheus:<tag> | jq -r '.manifests[].platform.architecture'
```

## Applying the bump

Set `dockerTag` to `prom/prometheus:<tag>`. Docker Hub tags keep the leading `v` (`v3.16.0`); the package version in `startos/versions/current.ts` drops it. Use the plain tag, not the `-busybox` or `-distroless` variants: the package relies on the image's busybox shell and CA bundle.

Read the release notes for removed or renamed command-line flags: the package passes the flags listed in `startos/main.ts`.
