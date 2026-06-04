import { UINT16_MAX, UINT32_MAX } from "./constants";
import { UnsupportedZipError } from "./errors";

export function getU16(view: DataView, offset: number): number {
  return view.getUint16(offset, true);
}

export function getU32(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

export function setU16(view: DataView, offset: number, value: number): void {
  if (value > UINT16_MAX) {
    throw new UnsupportedZipError(`value ${value} exceeds 16-bit ZIP field size`);
  }

  view.setUint16(offset, value, true);
}

export function setU32(view: DataView, offset: number, value: number): void {
  if (value > UINT32_MAX) {
    throw new UnsupportedZipError(`value ${value} exceeds 32-bit ZIP field size; ZIP64 is not implemented yet`);
  }

  view.setUint32(offset, value, true);
}

export function toDosTime(date = new Date()): { time: number; date: number } {
  const year = Math.max(1980, Math.min(2107, date.getFullYear()));
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);

  return {
    time: (hours << 11) | (minutes << 5) | seconds,
    date: ((year - 1980) << 9) | (month << 5) | day
  };
}

export function fromDosDateTime(dateBits: number, timeBits: number): Date | null {
  if (dateBits === 0 && timeBits === 0) {
    return null;
  }

  const year = ((dateBits >>> 9) & 0x7f) + 1980;
  const month = ((dateBits >>> 5) & 0x0f) - 1;
  const day = dateBits & 0x1f;
  const hours = (timeBits >>> 11) & 0x1f;
  const minutes = (timeBits >>> 5) & 0x3f;
  const seconds = (timeBits & 0x1f) * 2;

  return new Date(year, month, day, hours, minutes, seconds);
}

export function concatUint8Arrays(parts: Uint8Array[], totalLength?: number): Uint8Array {
  const size = totalLength ?? parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(size);
  let offset = 0;

  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }

  return output;
}
