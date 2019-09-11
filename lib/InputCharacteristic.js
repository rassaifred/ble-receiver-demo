var util = require('util');
var bleno = require('bleno');


//==============================================================================
// InputCharacteristic
//==============================================================================
var InputCharacteristic = function(controllerClient) {

  // store controller client reference
  this.controllerClient = controllerClient;

  // configure characteristic
  var charUUID = '1337',
      descUUID = '2901',
      desc     = 'Controller data port';

  bleno.Characteristic.call(this, {
    uuid: charUUID,
    properties: ['writeWithoutResponse'],
    descriptors: [
      new bleno.Descriptor({
        uuid: descUUID,
        value: desc
      })
    ]
  });
};

util.inherits(InputCharacteristic, bleno.Characteristic);

// handle write requests
InputCharacteristic.prototype.onWriteRequest = function(data, offset, withoutResponse, callback) {

  // expects 32 bits (4 bytes) data packet:
  // ======================================
  //
  // Byte 1:           Byte 2:           Byte 3:           Byte 4:
  // Digital input     Analog input X    Analog input Y    Analog input Z
  // -+-+-+-+-+-+-+-   -+-+-+-+-+-+-+-   -+-+-+-+-+-+-+-   -+-+-+-+-+-+-+-
  // 0|0|0|0|0|0|0|0   0|0|0|0|0|0|0|0   0|0|0|0|0|0|0|0   0|0|0|0|0|0|0|0
  // -+-+-+-+-+-+-+-   -+-+-+-+-+-+-+-   -+-+-+-+-+-+-+-   -+-+-+-+-+-+-+-
  // 7 6 5 4 3 2 1 0   7 6 5 4 3 2 1 0   7 6 5 4 3 2 1 0   7 6 5 4 3 2 1 0
  //
  // Digital values:   Analog values (Byte 2 - 4):
  // ---------------   ---------------------------
  // 0: up             Signed CHAR values
  // 1: down           Range -127 to +127
  // 2: left           Positive: Counterclockwise rotation
  // 3: right          Negative: Clockwise rotation
  // 4: start
  // 5: select
  // 6: btn a
  // 7: btn b

  if(offset) {
    callback(this.RESULT_ATTR_NOT_LONG);
    return;
  }
  else if(data.length != 4) {
    // payload is not 32 bit (4 byte) long
    callback(this.RESULT_INVALID_ATTRIBUTE_LENGTH);
    return;
  }

  // read the digital and analog values
  var byteBtn = data.readUInt8(0);
  var byteX = data.readInt8(1);
  var byteY = data.readInt8(2);
  var byteZ = data.readInt8(3);

  // convert the input data
  var controllerData = {
    dpad: {
      up:     (byteBtn & (1 << 0)),
      down:   (byteBtn & (1 << 1)),
      left:   (byteBtn & (1 << 2)),
      right:  (byteBtn & (1 << 3))
    },
    buttons: {
      start:  (byteBtn & (1 << 4)),
      select: (byteBtn & (1 << 5)),
      btn_a:  (byteBtn & (1 << 6)),
      btn_b:  (byteBtn & (1 << 7))
    },
    axis: {
      x: byteX,
      y: byteY,
      z: byteZ
    }
  };

  // pass the data back to controller client
  this.controllerClient.onData(controllerData);

  if(!withoutResponse) {
    callback(this.RESULT_SUCCESS);
  }
}

module.exports = InputCharacteristic;