import { Buffer } from "buffer/";
const BrowserBuffer: any = Buffer;

function installBigIntBufferMethods(BufferCtor: any) {
  if (!BufferCtor?.prototype) {
    return;
  }

  if (typeof BufferCtor.prototype.writeBigUInt64BE !== "function") {
    BufferCtor.prototype.writeBigUInt64BE = function writeBigUInt64BE(
      value: bigint,
      offset = 0,
    ) {
      const view = new DataView(this.buffer, this.byteOffset, this.byteLength);
      view.setBigUint64(offset, BigInt(value), false);
      return offset + 8;
    };
  }

  if (typeof BufferCtor.prototype.readBigUInt64BE !== "function") {
    BufferCtor.prototype.readBigUInt64BE = function readBigUInt64BE(offset = 0) {
      const view = new DataView(this.buffer, this.byteOffset, this.byteLength);
      return view.getBigUint64(offset, false);
    };
  }
}

installBigIntBufferMethods(BrowserBuffer);

if (typeof window !== "undefined") {
  (window as any).Buffer = BrowserBuffer;
}

if (typeof globalThis.Buffer === "undefined") {
  (globalThis as any).Buffer = BrowserBuffer;
}

if (typeof global !== "undefined" && typeof global.Buffer === "undefined") {
  (global as any).Buffer = BrowserBuffer;
}
