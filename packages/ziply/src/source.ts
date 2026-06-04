import type { ZipInput } from "./types";

export interface ByteSource {
  size: number;
  read(offset: number, length: number): Promise<Uint8Array>;
  slice(offset: number, end: number): Blob | Uint8Array;
  kind: "blob" | "bytes";
}

export function createByteSource(input: ZipInput): ByteSource {
  if (isBlob(input)) {
    return {
      size: input.size,
      kind: "blob",
      async read(offset, length) {
        return new Uint8Array(await input.slice(offset, offset + length).arrayBuffer());
      },
      slice(offset, end) {
        return input.slice(offset, end);
      }
    };
  }

  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

  return {
    size: bytes.length,
    kind: "bytes",
    async read(offset, length) {
      return bytes.subarray(offset, offset + length);
    },
    slice(offset, end) {
      return bytes.subarray(offset, end);
    }
  };
}

function isBlob(input: ZipInput): input is Blob {
  return typeof Blob !== "undefined" && input instanceof Blob;
}
