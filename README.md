# Ziply

Ziply is a fast JavaScript ZIP library for people who do not want to unpack an entire archive just to add one tiny file.

The main trick: Ziply can append a new entry by moving the ZIP metadata, not by inflating and rebuilding every file inside the archive. That means less memory, less waiting, and fewer dramatic laptop fan moments.

## Why This Exists

Most JS ZIP libraries are great when you want to create or extract a whole archive. But sometimes you already have a ZIP and just need to add something like `upload.yml`.

That should be simple.

Ziply is built around that exact use case:

1. Read the ZIP tail.
2. Find the EOCD record.
3. Insert the new file before the old central directory.
4. Write a fresh central directory and EOCD.

No decompressing existing files. No rebuilding the whole archive in JS memory just for one extra entry.

## Packages

This repo is a `pnpm` monorepo:

- `ziply`: browser-safe core library.
- `ziply-cli`: small Node CLI for quick local work.

## Quick Start

```ts
import { augmentZipWithFile, createZip } from "ziply";

const zip = createZip([
  { name: "hello.txt", data: "hello" }
]);

const next = await augmentZipWithFile(zip, "upload.yml", "true", {
  onDuplicate: "replace"
});
```

Browser `File` helper:

```ts
import { augmentZipFile } from "ziply";

const updated = await augmentZipFile(file, "upload.yml", "true");
```

CLI:

```sh
pnpm --filter ziply-cli ziply add archive.zip upload.yml ./upload.yml -o next.zip
```

## What Works Today

- Fast table-driven CRC32.
- Incremental CRC32 updates.
- Create ZIP archives with stored entries.
- Append one or more stored entries to existing archives.
- Replace duplicate entries by rewriting the central directory.
- Read ZIP central directory metadata.
- Extract stored entries with CRC verification.
- Browser `Blob` and `File` support.
- Zero-copy-ish browser output by reusing `Blob` slices where possible.
- Guardrails for unsupported multi-disk and ZIP64 archives.
- DOS timestamps and UTF-8 filenames.

## Performance Notes

Ziply is trying very hard not to do unnecessary work.

- CRC32 is `O(bytes)` and uses a shared lookup table.
- EOCD search reads at most `65_557` bytes from the end of the archive.
- Appending does not decompress existing entries.
- Browser append output is assembled from slices, so old archive bytes do not need to be copied into JS memory.
- `replace` mode drops old central directory entries but leaves old local data in place, which is valid ZIP behavior and avoids rewriting old file bytes.

In plain English: if you add `upload.yml` to a huge ZIP, Ziply should not act like it has to personally inspect every byte with a clipboard.

## Install

This project is still pre-release, but the workspace is ready:

```sh
pnpm install
pnpm test
pnpm build
```

## Roadmap

The big plan is in [ROADMAP.md](./ROADMAP.md).

Short version:

- Deflate support.
- ZIP64 support.
- Streaming readers and writers.
- Better CLI commands.
- Real benchmarks.
- More compatibility tests against common ZIP tools.
