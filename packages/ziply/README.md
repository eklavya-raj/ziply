# Ziply

Fast JavaScript ZIP utilities focused on appending files without unpacking or recompressing the whole archive.

```ts
import { augmentZipWithFile, createZip } from "ziply";

const zip = createZip([{ name: "hello.txt", data: "hello" }]);

const next = await augmentZipWithFile(zip, "upload.yml", "true", {
  onDuplicate: "replace"
});
```

Highlights:

- Create stored ZIP archives.
- Append stored entries to existing archives.
- Read central directory metadata.
- Extract stored entries with CRC verification.
- Browser `Blob` and `File` support.
- Fast table-driven CRC32.

Full docs and roadmap: https://github.com/eklavya-raj/ziply
