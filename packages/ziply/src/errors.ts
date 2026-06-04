export class ZiplyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ZiplyError";
  }
}

export class InvalidZipError extends ZiplyError {
  constructor(message: string) {
    super(`Invalid ZIP: ${message}`);
    this.name = "InvalidZipError";
  }
}

export class UnsupportedZipError extends ZiplyError {
  constructor(message: string) {
    super(`Unsupported ZIP: ${message}`);
    this.name = "UnsupportedZipError";
  }
}
