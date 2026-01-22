export class BabulusError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BabulusError";
  }
}

export class ParseError extends BabulusError {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}

export class CompileError extends BabulusError {
  constructor(message: string) {
    super(message);
    this.name = "CompileError";
  }
}
