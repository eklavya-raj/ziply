# Ziply

Ziply is a high-performance JavaScript ZIP library focused on the operation most ZIP libraries make unnecessarily expensive: adding a file to an existing archive without unpacking or recompressing the archive.

It is built as a `pnpm` monorepo:

- `packages/ziply`: browser-safe core library.
- `packages/ziply-cli`: Node CLI for quick local use.

## Why Ziply exists

Most JS ZIP libraries optimize for creating or extracting archives. Ziply also optimizes the metadata surgery path:

1. Locate the EOCD record by reading only the ZIP tail.
2. Insert new local file records before the old central directory.
3. Reuse the old local file data.
4. Write a new central directory and EOCD.

That makes appending stored entries `O(n + m)` in output size, with metadata parsing bounded by the central directory, and avoids inflating existing files.

## Quick Start

```ts
import { augmentZipWithFile, createZip } from "ziply";

const zip = createZip([
  { name: "hello.txt", data: "hello" }
]);

const next = await augmentZipWithFile(zip, "upload.yml", "enabled: true\n", {
  onDuplicate: "replace"
});
```

Browser `File` helper:

```ts
import { augmentZipFile } from "ziply";

const updated = await augmentZipFile(file, "upload.yml", "enabled: true\n");
```

CLI:

```sh
pnpm --filter @ziply/cli ziply add archive.zip upload.yml ./upload.yml -o next.zip
```

## Current Features

- Fast table-driven CRC32 with incremental updates.
- Create ZIP archives with stored entries.
- Append one or more stored entries to existing ZIP archives.
- Replace duplicate central directory entries without touching old local file data.
- Read ZIP central directory metadata.
- Extract stored entries with CRC verification.
- Browser-first `Blob`/`File` output with zero-copy slices where possible.
- Guardrails for unsupported multi-disk and ZIP64 archives.
- DOS timestamp generation and UTF-8 filenames.

## Performance Notes

- CRC32 is `O(bytes)` and uses a shared lookup table.
- EOCD search reads at most `65_557` bytes from the tail.
- Appending does not decompress existing entries.
- For `Blob` inputs, Ziply assembles output from slices so the browser does not need to copy the old archive bytes into JS memory.
- `replace` mode filters central directory entries while leaving obsolete local data orphaned, which is valid ZIP behavior and avoids rewriting old file data.

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for the full plan, including compression adapters, ZIP64, streaming writers, CLI maturity, compatibility testing, and benchmarks.
