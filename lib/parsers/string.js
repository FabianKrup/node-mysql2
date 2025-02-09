'use strict';

const Iconv = require('iconv-lite');
const { createLRU } = require('lru.min');

const decoderCache = createLRU({
  max: 500,
});

exports.decode = function (buffer, encoding, start, end, options) {
  /*const debugEncodings = ["utf8", "latin1", "ascii", "ucs2", "binary", "hex", "utf-8", "utf16le", "utf-16le", "ucs-2", "base64", "base64url"];
  const debugSlice = buffer.slice(start, end);
  for (const debugEnc of debugEncodings) {
    try {
      let debugResult;
    if (Buffer.isEncoding(debugEnc)) {
      debugResult = debugSlice.toString(debugEnc);
    } else {
      const debugDecoder = Iconv.getDecoder(debugEnc);
      debugResult = debugDecoder.write(debugSlice) + debugDecoder.end();
    }
    console.log(`DEBUG Decoding with ${debugEnc}:`, debugResult);
  } catch (err) {
      console.error(`DEBUG Error decoding with ${debugEnc}:`, err.message);
    }
  }*/

  if (Buffer.isEncoding(encoding)) {
    return buffer.toString(encoding, start, end);
  }

  // Optimize for common case: encoding="short_string", options=undefined.
  let decoder;
  if (!options) {
    decoder = decoderCache.get(encoding);
    if (!decoder) {
      decoder = Iconv.getDecoder(encoding);
      decoderCache.set(encoding, decoder);
    }
  } else {
    const decoderArgs = { encoding, options };
    const decoderKey = JSON.stringify(decoderArgs);
    decoder = decoderCache.get(decoderKey);
    if (!decoder) {
      decoder = Iconv.getDecoder(decoderArgs.encoding, decoderArgs.options);
      decoderCache.set(decoderKey, decoder);
    }
  }

  const res = decoder.write(buffer.slice(start, end));
  const trail = decoder.end();

  return trail ? res + trail : res;
};

exports.encode = function (string, encoding, options) {
  if (Buffer.isEncoding(encoding)) {
    return Buffer.from(string, encoding);
  }

  const encoder = Iconv.getEncoder(encoding, options || {});

  const res = encoder.write(string);
  const trail = encoder.end();

  return trail && trail.length > 0 ? Buffer.concat([res, trail]) : res;
};
