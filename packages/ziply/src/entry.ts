import {
  CENTRAL_DIRECTORY_SIZE,
  LOCAL_HEADER_SIZE,
  METHOD_STORE,
  SIG_CENTRAL_DIRECTORY,
  SIG_LOCAL_FILE_HEADER,
  UTF8_FLAG
} from "./constants";
import { crc32 } from "./crc32";
import { setU16, setU32, toDosTime } from "./binary";
import { encodeUtf8 } from "./text";
import type { ZipEntryInput } from "./types";

export interface PreparedEntry {
  name: string;
  nameBytes: Uint8Array;
  data: Uint8Array;
  commentBytes: Uint8Array;
  crc: number;
  modifiedAt: Date;
}

export interface LocalRecord {
  header: Uint8Array;
  data: Uint8Array;
}

export function normalizeEntry(input: ZipEntryInput, fallbackDate = new Date()): PreparedEntry {
  const name = normalizeEntryName(input.name);
  const data = normalizeEntryData(input.data);
  const commentBytes = encodeUtf8(input.comment ?? "");

  return {
    name,
    nameBytes: encodeUtf8(name),
    data,
    commentBytes,
    crc: crc32(data),
    modifiedAt: input.modifiedAt ?? fallbackDate
  };
}

export function normalizeEntryName(name: string): string {
  const normalized = name.replace(/\\/g, "/").replace(/^\/+/, "");

  if (normalized.length === 0) {
    throw new Error("ZIP entry name must not be empty");
  }

  if (normalized.split("/").some((part) => part === "..")) {
    throw new Error(`ZIP entry name must not contain '..': ${name}`);
  }

  return normalized;
}

function normalizeEntryData(data: ZipEntryInput["data"]): Uint8Array {
  if (typeof data === "string") {
    return encodeUtf8(data);
  }

  if (data instanceof Uint8Array) {
    return data;
  }

  return new Uint8Array(data);
}

export function createLocalRecord(entry: PreparedEntry): LocalRecord {
  const header = new Uint8Array(LOCAL_HEADER_SIZE + entry.nameBytes.length);
  const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
  const dos = toDosTime(entry.modifiedAt);

  setU32(view, 0, SIG_LOCAL_FILE_HEADER);
  setU16(view, 4, 20);
  setU16(view, 6, UTF8_FLAG);
  setU16(view, 8, METHOD_STORE);
  setU16(view, 10, dos.time);
  setU16(view, 12, dos.date);
  setU32(view, 14, entry.crc);
  setU32(view, 18, entry.data.length);
  setU32(view, 22, entry.data.length);
  setU16(view, 26, entry.nameBytes.length);
  setU16(view, 28, 0);

  header.set(entry.nameBytes, LOCAL_HEADER_SIZE);

  return { header, data: entry.data };
}

export function createCentralDirectoryEntry(entry: PreparedEntry, localHeaderOffset: number): Uint8Array {
  const record = new Uint8Array(CENTRAL_DIRECTORY_SIZE + entry.nameBytes.length + entry.commentBytes.length);
  const view = new DataView(record.buffer, record.byteOffset, record.byteLength);
  const dos = toDosTime(entry.modifiedAt);

  setU32(view, 0, SIG_CENTRAL_DIRECTORY);
  setU16(view, 4, 0x031e);
  setU16(view, 6, 20);
  setU16(view, 8, UTF8_FLAG);
  setU16(view, 10, METHOD_STORE);
  setU16(view, 12, dos.time);
  setU16(view, 14, dos.date);
  setU32(view, 16, entry.crc);
  setU32(view, 20, entry.data.length);
  setU32(view, 24, entry.data.length);
  setU16(view, 28, entry.nameBytes.length);
  setU16(view, 30, 0);
  setU16(view, 32, entry.commentBytes.length);
  setU16(view, 34, 0);
  setU16(view, 36, 0);
  setU32(view, 38, 0);
  setU32(view, 42, localHeaderOffset);

  record.set(entry.nameBytes, CENTRAL_DIRECTORY_SIZE);
  record.set(entry.commentBytes, CENTRAL_DIRECTORY_SIZE + entry.nameBytes.length);

  return record;
}
