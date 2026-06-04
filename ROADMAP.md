# Ziply Roadmap

Ziply's north star is a complete ZIP library for JavaScript that stays fast by default: avoid decompressing data unless the caller asks for it, avoid copying archive bytes when `Blob` slices can carry them, and keep metadata work proportional to the central directory.

## Principles

- Prefer zero-copy assembly for browser `Blob` inputs.
- Keep append operations from inflating or recompressing existing entries.
- Make time and space costs explicit in APIs and docs.
- Support both browser and Node without forcing Node-only dependencies into the core package.
- Keep compression codecs pluggable so users can choose speed, size, or platform-native implementations.

## Phase 1: Core ZIP Completeness

Status: in progress.

Already available:

- Create stored ZIP archives.
- Read central directory metadata.
- Append stored entries to existing archives.
- Replace duplicate entries by central directory rewrite.
- Extract stored entries with CRC verification.
- Fast table-driven CRC32.
- Browser `Blob` and `File` helpers.
- Node CLI for create, add, and list.

Next:

- Preserve archive comments when augmenting archives.
- Add entry comments to append APIs.
- Add directory entry helpers.
- Add file permission and Unix mode support through external attributes.
- Add platform markers for DOS/Unix-created entries.
- Add deterministic archive options for reproducible builds.
- Add richer validation for malformed local headers.
- Add `hasEntry`, `getEntry`, and duplicate-aware lookup helpers.

## Phase 2: Compression

Goal: support compressed ZIP entries without making the core slow or heavy.

Planned:

- Add Deflate extraction.
- Add Deflate creation.
- Add compression-level options.
- Add codec adapter interface.
- Support browser-native `CompressionStream` and `DecompressionStream` when available.
- Support Node `zlib` through a Node-specific adapter package or conditional entrypoint.
- Add optional high-performance WASM codec adapter.

Complexity targets:

- Stored append: `O(existing prefix + new data + central directory)` output work, no decompression.
- Deflate creation: `O(input bytes)` time, codec-dependent memory.
- Deflate extraction: streamable where possible, avoid buffering full output unless requested.

## Phase 3: ZIP64

Goal: support large archives and large files safely.

Planned:

- Parse ZIP64 EOCD locator and ZIP64 EOCD record.
- Read ZIP64 extended information extra fields.
- Create ZIP64 archives when sizes or offsets exceed 32-bit limits.
- Append to ZIP64 archives.
- Add tests for archives over 4 GiB using sparse or synthetic sources.

Important limits:

- Classic ZIP fields cap sizes and offsets at `0xffffffff`.
- Classic EOCD caps entry counts at `0xffff`.
- ZIP64 must be opt-in or automatic with clear output compatibility docs.

## Phase 4: Streaming

Goal: support large files and archives without full buffering.

Planned:

- Async iterable input sources.
- Async iterable archive writer.
- Node stream writer.
- Web stream writer.
- Streaming CRC32 utility.
- Data descriptor support for unknown sizes.
- Backpressure-aware CLI commands.

Complexity targets:

- Writer memory should be `O(number of entries + chunk size)` for streaming sources.
- Reader memory should be `O(central directory size + chunk size)`.
- CLI should avoid loading whole archives into memory for common add/create flows.

## Phase 5: Reader and Extractor Expansion

Goal: make Ziply useful for inspecting and extracting real-world archives.

Planned:

- Extract all entries.
- Extract to object/map helpers.
- Path traversal safety helpers for Node extraction.
- Optional filename decoding support for non-UTF-8 archives.
- Extra field parser registry.
- Symlink detection.
- Directory tree listing.
- Entry content reader that returns `Blob`, `Uint8Array`, stream, or text.

## Phase 6: CLI Maturity

Goal: make the CLI useful for development, CI, and release workflows.

Planned:

- `ziply extract`.
- `ziply add --content <string>`.
- `ziply add --stdin`.
- `ziply remove`.
- `ziply replace`.
- `ziply cat`.
- `ziply verify`.
- `ziply info`.
- JSON output for automation.
- Progress output for large archives.

## Phase 7: Performance and Benchmarks

Goal: prove Ziply is fast with repeatable benchmarks.

Planned:

- Benchmark CRC32 against common JS implementations.
- Benchmark append against full read/write ZIP libraries.
- Benchmark browser `Blob` append memory behavior.
- Benchmark Node large-file create/add workflows.
- Add CI performance smoke tests.
- Publish benchmark notes with archive sizes, entry counts, and memory usage.

Metrics to track:

- Wall time.
- Peak resident memory in Node.
- JS heap usage.
- Bytes copied into JS memory.
- Bundle size for browser consumers.

## Phase 8: Compatibility

Goal: handle the ZIP files developers actually meet.

Planned:

- Test against Info-ZIP `zip`/`unzip`.
- Test against macOS Archive Utility output.
- Test against Windows Explorer ZIP output.
- Test against Java `java.util.zip`.
- Test against Python `zipfile`.
- Add fixtures for comments, directories, duplicate entries, large central directories, and mixed encodings.

## Package Ideas

Potential future packages:

- `ziply`: browser-safe core.
- `@ziply/node`: Node stream and filesystem helpers.
- `ziply-cli`: command line interface.
- `@ziply/codec-deflate`: Deflate adapter.
- `@ziply/codec-wasm`: high-performance WASM codec adapter.
- `@ziply/bench`: benchmark suite.

## Release Targets

### `0.1.x`

- Stabilize stored-entry create, read, append, replace, and extract APIs.
- Improve tests and docs.
- Add archive comment preservation.

### `0.2.x`

- Add richer metadata support.
- Add remove/replace helpers.
- Add CLI extract and verify.

### `0.3.x`

- Add Deflate extraction and creation through adapters.
- Add stream-oriented extraction APIs.

### `0.4.x`

- Add ZIP64 read support.
- Add ZIP64 append support.

### `1.0.0`

- Stable API.
- Browser and Node compatibility matrix.
- Benchmarks published.
- ZIP64, Deflate, stored entries, metadata, CLI, and extraction workflows covered by tests.
