import {
  CENTRAL_DIRECTORY_SIZE,
  EOCD_SIZE,
  MAX_EOCD_SEARCH,
  SIG_CENTRAL_DIRECTORY,
  SIG_EOCD,
  UINT16_MAX,
  UINT32_MAX
} from "./constants";
import { fromDosDateTime, getU16, getU32 } from "./binary";
import { InvalidZipError, UnsupportedZipError } from "./errors";
import { createByteSource } from "./source";
import { decodeUtf8 } from "./text";
import type { ByteSource } from "./source";
import type { ParsedZip, ZipEntryRecord, ZipInput } from "./types";

interface EocdRecord {
  offset: number;
  centralDirectoryOffset: number;
  centralDirectorySize: number;
  totalEntries: number;
  comment: string;
}

export async function readZip(input: ZipInput): Promise<ParsedZip> {
  const source = createByteSource(input);
  return parseZip(source);
}

export async function listEntries(input: ZipInput): Promise<ZipEntryRecord[]> {
  return (await readZip(input)).entries;
}

export async function parseZip(source: ByteSource): Promise<ParsedZip> {
  const eocd = await findEocd(source);

  if (eocd.centralDirectoryOffset + eocd.centralDirectorySize > eocd.offset) {
    throw new InvalidZipError("central directory points outside archive bounds");
  }

  const centralDirectory = await source.read(eocd.centralDirectoryOffset, eocd.centralDirectorySize);
  const entries = parseCentralDirectory(centralDirectory, eocd.totalEntries);

  return {
    entries,
    centralDirectoryOffset: eocd.centralDirectoryOffset,
    centralDirectorySize: eocd.centralDirectorySize,
    eocdOffset: eocd.offset,
    comment: eocd.comment
  };
}

async function findEocd(source: ByteSource): Promise<EocdRecord> {
  if (source.size < EOCD_SIZE) {
    throw new InvalidZipError("file is too small to contain EOCD");
  }

  const tailSize = Math.min(source.size, MAX_EOCD_SEARCH);
  const tailStart = source.size - tailSize;
  const tail = await source.read(tailStart, tailSize);
  const view = new DataView(tail.buffer, tail.byteOffset, tail.byteLength);

  for (let i = tail.length - EOCD_SIZE; i >= 0; i--) {
    if (getU32(view, i) !== SIG_EOCD) {
      continue;
    }

    const commentLength = getU16(view, i + 20);

    if (i + EOCD_SIZE + commentLength !== tail.length) {
      continue;
    }

    const diskNumber = getU16(view, i + 4);
    const centralDirectoryDisk = getU16(view, i + 6);
    const entriesThisDisk = getU16(view, i + 8);
    const totalEntries = getU16(view, i + 10);
    const centralDirectorySize = getU32(view, i + 12);
    const centralDirectoryOffset = getU32(view, i + 16);

    if (diskNumber !== 0 || centralDirectoryDisk !== 0 || entriesThisDisk !== totalEntries) {
      throw new UnsupportedZipError("multi-disk archives are not supported");
    }

    if (totalEntries === UINT16_MAX || centralDirectorySize === UINT32_MAX || centralDirectoryOffset === UINT32_MAX) {
      throw new UnsupportedZipError("ZIP64 archives are not supported yet");
    }

    return {
      offset: tailStart + i,
      centralDirectoryOffset,
      centralDirectorySize,
      totalEntries,
      comment: decodeUtf8(tail.subarray(i + EOCD_SIZE, i + EOCD_SIZE + commentLength))
    };
  }

  throw new InvalidZipError("EOCD not found");
}

function parseCentralDirectory(bytes: Uint8Array, totalEntries: number): ZipEntryRecord[] {
  const entries: ZipEntryRecord[] = [];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;

  for (let index = 0; index < totalEntries; index++) {
    if (offset + CENTRAL_DIRECTORY_SIZE > bytes.length) {
      throw new InvalidZipError("central directory entry is truncated");
    }

    if (getU32(view, offset) !== SIG_CENTRAL_DIRECTORY) {
      throw new InvalidZipError("central directory signature mismatch");
    }

    const flags = getU16(view, offset + 8);
    const method = getU16(view, offset + 10);
    const timeBits = getU16(view, offset + 12);
    const dateBits = getU16(view, offset + 14);
    const crc = getU32(view, offset + 16);
    const compressedSize = getU32(view, offset + 20);
    const uncompressedSize = getU32(view, offset + 24);
    const nameLength = getU16(view, offset + 28);
    const extraLength = getU16(view, offset + 30);
    const commentLength = getU16(view, offset + 32);
    const localHeaderOffset = getU32(view, offset + 42);
    const variableStart = offset + CENTRAL_DIRECTORY_SIZE;
    const variableEnd = variableStart + nameLength + extraLength + commentLength;

    if (variableEnd > bytes.length) {
      throw new InvalidZipError("central directory variable fields are truncated");
    }

    const name = decodeUtf8(bytes.subarray(variableStart, variableStart + nameLength));
    const commentStart = variableStart + nameLength + extraLength;
    const comment = decodeUtf8(bytes.subarray(commentStart, commentStart + commentLength));

    entries.push({
      name,
      compressedSize,
      uncompressedSize,
      crc32: crc,
      method,
      flags,
      localHeaderOffset,
      modifiedAt: fromDosDateTime(dateBits, timeBits),
      comment
    });

    offset = variableEnd;
  }

  if (offset !== bytes.length) {
    throw new InvalidZipError("central directory contains trailing bytes");
  }

  return entries;
}
