import { EOCD_SIZE, SIG_EOCD } from "./constants";
import { concatUint8Arrays, setU16, setU32 } from "./binary";
import { createCentralDirectoryEntry, createLocalRecord, normalizeEntry } from "./entry";
import type { ZipEntryInput } from "./types";

export interface CreateZipOptions {
  comment?: string;
  modifiedAt?: Date;
}

export function createZip(entries: ZipEntryInput[], options: CreateZipOptions = {}): Uint8Array {
  const fallbackDate = options.modifiedAt ?? new Date();
  const localParts: Uint8Array[] = [];
  const centralDirectoryParts: Uint8Array[] = [];
  let offset = 0;

  for (const input of entries) {
    const entry = normalizeEntry(input, fallbackDate);
    const local = createLocalRecord(entry);

    localParts.push(local.header, local.data);
    centralDirectoryParts.push(createCentralDirectoryEntry(entry, offset));
    offset += local.header.length + local.data.length;
  }

  const centralDirectoryOffset = offset;
  const centralDirectorySize = centralDirectoryParts.reduce((sum, part) => sum + part.length, 0);
  const commentBytes = new TextEncoder().encode(options.comment ?? "");
  const eocd = createEocd(entries.length, centralDirectorySize, centralDirectoryOffset, commentBytes);

  return concatUint8Arrays([...localParts, ...centralDirectoryParts, eocd]);
}

export function createEocd(
  totalEntries: number,
  centralDirectorySize: number,
  centralDirectoryOffset: number,
  commentBytes = new Uint8Array()
): Uint8Array {
  const eocd = new Uint8Array(EOCD_SIZE + commentBytes.length);
  const view = new DataView(eocd.buffer, eocd.byteOffset, eocd.byteLength);

  setU32(view, 0, SIG_EOCD);
  setU16(view, 4, 0);
  setU16(view, 6, 0);
  setU16(view, 8, totalEntries);
  setU16(view, 10, totalEntries);
  setU32(view, 12, centralDirectorySize);
  setU32(view, 16, centralDirectoryOffset);
  setU16(view, 20, commentBytes.length);
  eocd.set(commentBytes, EOCD_SIZE);

  return eocd;
}
