'use strict';

const Command = require('./command');
const Packets = require('../packets');

const eventParsers = [];

class BinlogEventHeader {
  constructor(packet) {
    this.timestamp = packet.readInt32();
    this.eventType = packet.readInt8();
    this.serverId = packet.readInt32();
    this.eventSize = packet.readInt32();
    this.logPos = packet.readInt32();
    this.flags = packet.readInt16();
  }
}

class BinlogDump extends Command {
  constructor(opts) {
    super();
    // this.onResult = callback;
    this.opts = opts;
  }

  start(packet, connection) {
    const newPacket = new Packets.BinlogDump(this.opts);
    connection.writePacket(newPacket.toPacket(1));
    return BinlogDump.prototype.binlogData;
  }

  binlogData(packet) {
    // console.log('binlogData', packet);

    // ok - continue consuming events
    // error - error
    // eof - end of binlog
    if (packet.isEOF()) {
      this.emit('eof');
      return null;
    }
    // binlog event header
    packet.readInt8();
    const header = new BinlogEventHeader(packet);
    // console.log('header', header);
    const EventParser = eventParsers[header.eventType];
    let event;
    if (EventParser) {
      event = new EventParser(packet);
    } else {
      event = {
        name: 'UNKNOWN'
      };
    }
    event.header = header;
    // console.log('event', event);
    this.emit('event', event);
    return BinlogDump.prototype.binlogData;
  }
}

class RotateEvent {
  constructor(packet) {
    this.pposition = packet.readInt32();
    // TODO: read uint64 here
    packet.readInt32(); // positionDword2

    const remainingBytes = packet.end - packet.offset;
    this.nextBinlog = packet.readString(remainingBytes, 'binary');
    this.name = 'RotateEvent';
  }
}

class FormatDescriptionEvent {
  constructor(packet) {
    console.log('FormatDescriptionEvent', packet.buffer);
    this.binlogVersion = packet.readInt16();
    this.serverVersion = packet.readString(50, 'latin1').replace(/\u0000.*/, ''); // eslint-disable-line no-control-regex
    this.createTimestamp = packet.readInt32();
    this.eventHeaderLength = packet.readInt8(); // should be 19
    this.eventsLength = packet.readBuffer();
    this.name = 'FormatDescriptionEvent';
  }
}

class QueryEvent {
  constructor(packet) {
    const parseStatusVars = require('../packets/binlog_query_statusvars.js');
    this.slaveProxyId = packet.readInt32();
    console.log('slaveProxyId', this.slaveProxyId);
    this.executionTime = packet.readInt32();
    console.log('executionTime', this.executionTime);
    const schemaLength = packet.readInt8();
    console.log('schemaLength', schemaLength);
    this.errorCode = packet.readInt16();
    console.log('errorCode', this.errorCode);
    const statusVarsLength = packet.readInt16();
    console.log('statusVarsLength', statusVarsLength);
    const statusVars = packet.readBuffer(statusVarsLength);
    console.log('statusVars', statusVars);
    this.schema = packet.readString(schemaLength, 'binary');
    console.log('schema', this.schema);
    packet.readInt8(); // should be zero
    this.query = packet.readString(packet.end - packet.offset, 'binary');
    console.log('query', this.query);
    this.statusVars = parseStatusVars(statusVars);
    console.log('statusVars', this.statusVars);
    this.name = 'QueryEvent';
  }
}

class XidEvent {
  constructor(packet) {
    this.xid = packet.readInt64();
    this.name = 'XidEvent';
  }
}

eventParsers[2] = QueryEvent;
eventParsers[4] = RotateEvent;
eventParsers[15] = FormatDescriptionEvent;
eventParsers[16] = XidEvent;

module.exports = BinlogDump;
