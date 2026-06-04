import { LOCAL_HEADER_SIZE, METHOD_STORE, SIG_LOCAL_FILE_HEADER } from "./constants";
import { getU16, getU32 } from "./binary";
import { crc32 } from "./crc32";
import { InvalidZipError, UnsupportedZipError } from "./errors";
import { parseZip } from "./read";
import { createByteSource } from "./source";
import { decodeUtf8 } from "./text";
import type { ZipEntryRecord, ZipInput } from "./types";

export interface ExtractOptions {
  verifyCrc?: boolean;
}

export async function extractEntry(
  input: ZipInput,
  nameOrEntry: string | ZipEntryRecord,
  options: ExtractOptions = {}
): Promise<Uint8Array> {
  const source = createByteSource(input);
  const parsed = await parseZip(source);
  const entry = typeof nameOrEntry === "string" ? findLastEntry(parsed.entries, nameOrEntry) : nameOrEntry;

  if (!entry) {
    throw new Error(`ZIP entry not found: ${nameOrEntry}`);
  }

  if (entry.method !== METHOD_STORE) {
    throw new UnsupportedZipError(`cannot extract compression method ${entry.method}; only STORE is available`);
  }

  const header = await source.read(entry.localHeaderOffset, LOCAL_HEADER_SIZE);
  const view = new DataView(header.buffer, header.byteOffset, header.byteLength);

  if (getU32(view, 0) !== SIG_LOCAL_FILE_HEADER) {
    throw new InvalidZipError(`local header signature mismatch for ${entry.name}`);
  }

  const nameLength = getU16(view, 26);
  const extraLength = getU16(view, 28);
  const dataOffset = entry.localHeaderOffset + LOCAL_HEADER_SIZE + nameLength + extraLength;
  const data = await source.read(dataOffset, entry.compressedSize);

  if (options.verifyCrc !== false && crc32(data) !== entry.crc32) {
    throw new InvalidZipError(`CRC32 mismatch for ${entry.name}`);
  }

  return data;
}

export async function extractText(
  input: ZipInput,
  nameOrEntry: string | ZipEntryRecord,
  options: ExtractOptions = {}
): Promise<string> {
  return decodeUtf8(await extractEntry(input, nameOrEntry, options));
}

function findLastEntry(entries: ZipEntryRecord[], name: string): ZipEntryRecord | undefined {
  for (let index = entries.length - 1; index >= 0; index--) {
    if (entries[index].name === name) {
      return entries[index];
    }
  }

  return undefined;
}
