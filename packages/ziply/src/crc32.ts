const TABLE = new Uint32Array(256);

for (let i = 0; i < 256; i++) {
  let crc = i;

  for (let bit = 0; bit < 8; bit++) {
    crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }

  TABLE[i] = crc >>> 0;
}

export function crc32(bytes: Uint8Array, seed = 0): number {
  let crc = ~seed;

  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ TABLE[(crc ^ bytes[i]) & 0xff];
  }

  return (~crc) >>> 0;
}

export class CRC32 {
  private value = 0;

  update(bytes: Uint8Array): this {
    this.value = crc32(bytes, this.value);
    return this;
  }

  digest(): number {
    return this.value >>> 0;
  }

  reset(): this {
    this.value = 0;
    return this;
  }
}
