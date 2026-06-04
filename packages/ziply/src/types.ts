export type ZipInput = Uint8Array | ArrayBuffer | Blob;

export type ZipEntryData = Uint8Array | ArrayBuffer | string;

export interface ZipEntryInput {
  name: string;
  data: ZipEntryData;
  modifiedAt?: Date;
  comment?: string;
}

export interface ZipEntryRecord {
  name: string;
  compressedSize: number;
  uncompressedSize: number;
  crc32: number;
  method: number;
  flags: number;
  localHeaderOffset: number;
  modifiedAt: Date | null;
  comment: string;
}

export type DuplicatePolicy = "append" | "replace" | "error";

export interface AugmentOptions {
  onDuplicate?: DuplicatePolicy;
  modifiedAt?: Date;
}

export interface ParsedZip {
  entries: ZipEntryRecord[];
  centralDirectoryOffset: number;
  centralDirectorySize: number;
  eocdOffset: number;
  comment: string;
}
