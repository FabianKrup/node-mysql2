'use strict';

// http://dev.mysql.com/doc/internals/en/query-event.html

const keys = {
  FLAGS2: 0,
  SQL_MODE: 1,
  CATALOG: 2,
  AUTO_INCREMENT: 3,
  CHARSET: 4,
  TIME_ZONE: 5,
  CATALOG_NZ: 6,
  LC_TIME_NAMES: 7,
  CHARSET_DATABASE: 8,
  TABLE_MAP_FOR_UPDATE: 9,
  MASTER_DATA_WRITTEN: 10,
  INVOKERS: 11,
  UPDATED_DB_NAMES: 12,
  MICROSECONDS: 3
};

module.exports = function parseStatusVars(buffer) {
  const result = {};
  let offset = 0;
  let key, length, prevOffset;

  while (offset < buffer.length) {
    key = buffer[offset++];
    switch (key) {
      case keys.FLAGS2:
        if (offset + 4 > buffer.length) {
          // Not enough bytes for FLAGS2 – break out of the loop
          break;
        }
        result.flags = buffer.readUInt32LE(offset);
        offset += 4;
        break;
      case keys.SQL_MODE:
        if (offset + 8 > buffer.length) {
          break;
        }
        // value is 8 bytes, but all documented flags are in first 4 bytes
        result.sqlMode = buffer.readUInt32LE(offset);
        offset += 8;
        break;
      case keys.CATALOG:
        if (offset >= buffer.length) break;
        length = buffer[offset++];
        if (offset + length > buffer.length) break;
        result.catalog = buffer.toString('utf8', offset, offset + length);
        offset += length + 1; // Skip null terminator after string
        break;
      case keys.CHARSET:
        if (offset + 6 > buffer.length) break;
        result.clientCharset = buffer.readUInt16LE(offset);
        result.connectionCollation = buffer.readUInt16LE(offset + 2);
        result.serverCharset = buffer.readUInt16LE(offset + 4);
        offset += 6;
        break;
      case keys.TIME_ZONE:
        if (offset >= buffer.length) break;
        length = buffer[offset++];
        if (offset + length > buffer.length) break;
        result.timeZone = buffer.toString('utf8', offset, offset + length);
        offset += length; // No null terminator here
        break;
      case keys.CATALOG_NZ:
        if (offset >= buffer.length) break;
        length = buffer[offset++];
        if (offset + length > buffer.length) break;
        result.catalogNz = buffer.toString('utf8', offset, offset + length);
        offset += length; // No null terminator
        break;
      case keys.LC_TIME_NAMES:
        if (offset + 2 > buffer.length) break;
        result.lcTimeNames = buffer.readUInt16LE(offset);
        offset += 2;
        break;
      case keys.CHARSET_DATABASE:
        if (offset + 2 > buffer.length) break;
        result.schemaCharset = buffer.readUInt16LE(offset);
        offset += 2;
        break;
      case keys.TABLE_MAP_FOR_UPDATE:
        if (offset + 8 > buffer.length) break;
        result.mapForUpdate1 = buffer.readUInt32LE(offset);
        result.mapForUpdate2 = buffer.readUInt32LE(offset + 4);
        offset += 8;
        break;
      case keys.MASTER_DATA_WRITTEN:
        if (offset + 4 > buffer.length) break;
        result.masterDataWritten = buffer.readUInt32LE(offset);
        offset += 4;
        break;
      case keys.INVOKERS:
        if (offset >= buffer.length) break;
        length = buffer[offset++];
        if (offset + length > buffer.length) break;
        result.invokerUsername = buffer.toString('utf8', offset, offset + length);
        offset += length;
        if (offset >= buffer.length) break;
        length = buffer[offset++];
        if (offset + length > buffer.length) break;
        result.invokerHostname = buffer.toString('utf8', offset, offset + length);
        offset += length;
        break;
      case keys.UPDATED_DB_NAMES:
        if (offset >= buffer.length) break;
        length = buffer[offset++];
        result.updatedDBs = [];
        for (; length; --length) {
          prevOffset = offset;
          // Fast forward to null terminating byte
          while (offset < buffer.length && buffer[offset] !== 0) {
            offset++;
          }
          result.updatedDBs.push(buffer.toString('utf8', prevOffset, offset));
          offset++; // Skip the null terminator
        }
        break;
      case keys.MICROSECONDS:
        if (offset + 3 > buffer.length) break;
        result.microseconds = buffer.readInt16LE(offset) + (buffer[offset + 2] << 16);
        offset += 3;
        break;
      default:
        // If key is unrecognized or there are not enough bytes, break out of the loop.
        break;
    }
  }
  return result;
};
