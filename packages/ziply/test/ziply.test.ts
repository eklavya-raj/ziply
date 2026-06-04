import { describe, expect, it } from "vitest";
import {
  augmentZip,
  augmentZipWithFile,
  createZip,
  crc32,
  extractEntry,
  extractText,
  listEntries,
  readZip
} from "../src";

describe("crc32", () => {
  it("matches the standard check value", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });
});

describe("zip creation and reading", () => {
  it("creates a readable stored zip", async () => {
    const zip = createZip([
      { name: "hello.txt", data: "hello" },
      { name: "folder/note.txt", data: new Uint8Array([1, 2, 3]) }
    ]);

    const entries = await listEntries(zip);

    expect(entries.map((entry) => entry.name)).toEqual(["hello.txt", "folder/note.txt"]);
    expect(entries[0].uncompressedSize).toBe(5);
    expect(entries[1].crc32).toBe(crc32(new Uint8Array([1, 2, 3])));
  });

  it("extracts stored entries with CRC verification", async () => {
    const zip = createZip([{ name: "hello.txt", data: "hello" }]);

    expect(await extractText(zip, "hello.txt")).toBe("hello");
    expect([...await extractEntry(zip, "hello.txt")]).toEqual([104, 101, 108, 108, 111]);
  });
});

describe("augmentZip", () => {
  it("adds a file before the old central directory", async () => {
    const zip = createZip([{ name: "a.txt", data: "a" }]);
    const augmented = await augmentZipWithFile(zip, "upload.yml", "enabled: true\n");

    expect(augmented).toBeInstanceOf(Uint8Array);

    const parsed = await readZip(augmented as Uint8Array);
    expect(parsed.entries.map((entry) => entry.name)).toEqual(["a.txt", "upload.yml"]);
  });

  it("can replace duplicate central directory entries", async () => {
    const zip = createZip([{ name: "upload.yml", data: "old" }]);
    const augmented = await augmentZip(zip, [{ name: "upload.yml", data: "new" }], {
      onDuplicate: "replace"
    });

    const parsed = await readZip(augmented as Uint8Array);

    expect(parsed.entries.map((entry) => entry.name)).toEqual(["upload.yml"]);
    expect(parsed.entries[0].uncompressedSize).toBe(3);
    expect(await extractText(augmented as Uint8Array, "upload.yml")).toBe("new");
  });

  it("returns a blob when a blob is provided", async () => {
    const zip = new Blob([createZip([{ name: "a.txt", data: "a" }]) as unknown as BlobPart]);
    const augmented = await augmentZipWithFile(zip, "upload.yml", "enabled: true\n");

    expect(augmented).toBeInstanceOf(Blob);

    const parsed = await readZip(new Uint8Array(await (augmented as Blob).arrayBuffer()));
    expect(parsed.entries.map((entry) => entry.name)).toEqual(["a.txt", "upload.yml"]);
  });
});
