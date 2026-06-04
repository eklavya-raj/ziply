import { concatUint8Arrays } from "./binary";
import { createCentralDirectoryEntry, createLocalRecord, normalizeEntry } from "./entry";
import { parseZip } from "./read";
import { createByteSource } from "./source";
import { createEocd } from "./write";
import type { AugmentOptions, ZipEntryInput, ZipInput } from "./types";

export async function augmentZip(input: ZipInput, entries: ZipEntryInput[], options: AugmentOptions = {}): Promise<Blob | Uint8Array> {
  const source = createByteSource(input);
  const parsed = await parseZip(source);
  const fallbackDate = options.modifiedAt ?? new Date();
  const prepared = entries.map((entry) => normalizeEntry(entry, fallbackDate));
  const incomingNames = new Set(prepared.map((entry) => entry.name));

  if (options.onDuplicate === "error") {
    for (const existing of parsed.entries) {
      if (incomingNames.has(existing.name)) {
        throw new Error(`ZIP already contains entry: ${existing.name}`);
      }
    }
  }

  const localParts: Uint8Array[] = [];
  const newCentralDirectoryParts: Uint8Array[] = [];
  let nextLocalOffset = parsed.centralDirectoryOffset;

  for (const entry of prepared) {
    const local = createLocalRecord(entry);

    localParts.push(local.header, local.data);
    newCentralDirectoryParts.push(createCentralDirectoryEntry(entry, nextLocalOffset));
    nextLocalOffset += local.header.length + local.data.length;
  }

  const oldCentralDirectory = await source.read(parsed.centralDirectoryOffset, parsed.centralDirectorySize);
  const keptCentralDirectoryParts =
    options.onDuplicate === "replace"
      ? filterCentralDirectory(oldCentralDirectory, parsed.entries, incomingNames)
      : [oldCentralDirectory];

  const centralDirectoryParts = [...keptCentralDirectoryParts, ...newCentralDirectoryParts];
  const centralDirectorySize = centralDirectoryParts.reduce((sum, part) => sum + part.length, 0);
  const centralDirectoryOffset = nextLocalOffset;
  const entryCount =
    (options.onDuplicate === "replace"
      ? parsed.entries.filter((entry) => !incomingNames.has(entry.name)).length
      : parsed.entries.length) + prepared.length;
  const eocd = createEocd(entryCount, centralDirectorySize, centralDirectoryOffset);

  if (source.kind === "blob") {
    return new Blob([
      source.slice(0, parsed.centralDirectoryOffset) as BlobPart,
      ...localParts.map(asBlobPart),
      ...centralDirectoryParts.map(asBlobPart),
      asBlobPart(eocd)
    ], { type: "application/zip" });
  }

  const prefix = source.slice(0, parsed.centralDirectoryOffset) as Uint8Array;
  return concatUint8Arrays([prefix, ...localParts, ...centralDirectoryParts, eocd]);
}

export async function augmentZipWithFile(
  input: ZipInput,
  name: string,
  data: ZipEntryInput["data"],
  options: AugmentOptions = {}
): Promise<Blob | Uint8Array> {
  return augmentZip(input, [{ name, data, modifiedAt: options.modifiedAt }], options);
}

export async function augmentZipFile(
  file: Blob,
  name: string,
  data: ZipEntryInput["data"],
  options: AugmentOptions = {}
): Promise<File | Blob> {
  const blob = (await augmentZip(file, [{ name, data, modifiedAt: options.modifiedAt }], options)) as Blob;

  if (typeof File === "undefined" || !(file instanceof File)) {
    return blob;
  }

  return new File([blob], file.name, {
    type: file.type || "application/zip",
    lastModified: file.lastModified || Date.now()
  });
}

function filterCentralDirectory(bytes: Uint8Array, entries: { name: string }[], namesToDrop: Set<string>): Uint8Array[] {
  const parts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const recordLength = readCentralDirectoryRecordLength(bytes, offset);

    if (!namesToDrop.has(entry.name)) {
      parts.push(bytes.subarray(offset, offset + recordLength));
    }

    offset += recordLength;
  }

  return parts;
}

function readCentralDirectoryRecordLength(bytes: Uint8Array, offset: number): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const nameLength = view.getUint16(offset + 28, true);
  const extraLength = view.getUint16(offset + 30, true);
  const commentLength = view.getUint16(offset + 32, true);

  return 46 + nameLength + extraLength + commentLength;
}

function asBlobPart(bytes: Uint8Array): BlobPart {
  return bytes as unknown as BlobPart;
}
