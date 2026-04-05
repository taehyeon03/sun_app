// polyfills.ts — fast-png이 사용하는 latin1 인코딩을 Hermes에서 지원하도록 패치
const OriginalTextDecoder = (global as any).TextDecoder;

if (OriginalTextDecoder) {
  (global as any).TextDecoder = class PatchedTextDecoder {
    private _latin1: boolean;
    private _delegate: any;
    private _encoding: string;

    constructor(label = "utf-8", options?: TextDecoderOptions) {
      const norm = (label || "utf-8").toLowerCase().replace(/[ \-]/g, "");
      this._encoding = norm;
      this._latin1 = ["latin1", "iso88591", "binary", "ascii", "usascii"].includes(norm);
      if (!this._latin1) this._delegate = new OriginalTextDecoder(label, options);
    }

    decode(input?: BufferSource, options?: TextDecodeOptions): string {
      if (this._latin1) {
        const buf = input instanceof ArrayBuffer
          ? new Uint8Array(input)
          : new Uint8Array(
              (input as ArrayBufferView).buffer,
              (input as ArrayBufferView).byteOffset,
              (input as ArrayBufferView).byteLength,
            );
        let str = "";
        for (let i = 0; i < buf.length; i++) str += String.fromCharCode(buf[i]);
        return str;
      }
      return this._delegate.decode(input, options);
    }

    get encoding() { return this._encoding; }
    get fatal() { return this._delegate?.fatal ?? false; }
    get ignoreBOM() { return this._delegate?.ignoreBOM ?? false; }
  };
}
