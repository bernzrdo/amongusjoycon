const HID = require('node-hid');
const robot = require('robotjs');

// --- JOYCONS ---
const joycons = {
    left: {
        globalPacketNumber: 0,
        device: new HID.HID(1406,8198),
        send: data=>{
            joycons.left.globalPacketNumber = (joycons.left.globalPacketNumber + 0x1) % 0x10;
            const bytes = [...data];
            bytes[1] = joycons.left.globalPacketNumber;
            joycons.left.device.write(bytes);
        },
        setLEDs: value=>{
            const bytes = new Array(0x40).fill(0);
            bytes[0] = 0x01;
            bytes[10] = 0x30;
            bytes[11] = value;
            joycons.left.send(bytes);
        }
    },
    right: {
        globalPacketNumber: 0,
        device: new HID.HID(1406,8199),
        send: data=>{
            joycons.right.globalPacketNumber = (joycons.right.globalPacketNumber + 0x1) % 0x10;
            const bytes = [...data];
            bytes[1] = joycons.right.globalPacketNumber;
            joycons.right.device.write(bytes);
        },
        setLEDs: value=>{
            const bytes = new Array(0x40).fill(0);
            bytes[0] = 0x01;
            bytes[10] = 0x30;
            bytes[11] = value;
            joycons.right.send(bytes);
        }
    }
}

// --- LED VALUES ---
const LED_VALUES = {
    ONE: 1,
    TWO: 2,
    THREE: 4,
    FOUR: 8,
    ONE_FLASH: 16,
    TWO_FLASH: 32,
    THREE_FLASH: 64,
    FOUR_FLASH: 128,
}

// --- DIRECTIONS ---
const LEFT_DIRECTIONS = {
    0x00: 'RIGHT',
    0x01: 'DOWN_RIGHT',
    0x02: 'DOWN',
    0x03: 'DOWN_LEFT',
    0x04: 'LEFT',
    0x05: 'UP_LEFT',
    0x06: 'UP',
    0x07: 'UP_RIGHT',
    0x08: 'NEUTRAL'
}
const RIGHT_DIRECTIONS = {
    0x00: 'LEFT',
    0x01: 'UP_LEFT',
    0x02: 'UP',
    0x03: 'UP_RIGHT',
    0x04: 'RIGHT',
    0x05: 'DOWN_RIGHT',
    0x06: 'DOWN',
    0x07: 'DOWN_LEFT',
    0x08: 'NEUTRAL'
}

// --- SET INPUT REPORT MODE ---
var bytes = new Array(0x40).fill(0);
bytes[0] = 0x01;
bytes[10] = 0x03;
bytes[11] = 0x3f;
joycons.left.send(bytes);
joycons.right.send(bytes);

// --- HANDLE DATA ---
var keyState = [];
var leftMouseDown = false;
joycons.left.device.on('data',bytes=>{
    if(bytes[0] !== 0x3f) return;
    const keys = {
        dpadLeft: Boolean(bytes[1] & 0x01),
        dpadDown: Boolean(bytes[1] & 0x02),
        dpadUp: Boolean(bytes[1] & 0x04),
        dpadRight: Boolean(bytes[1] & 0x08),
  
        minus: Boolean(bytes[2] & 0x01),
        screenshot: Boolean(bytes[2] & 0x20),
  
        l: Boolean(bytes[2] & 0x40),
        zl: Boolean(bytes[2] & 0x80),
  
        analogStickPress: Boolean(bytes[2] & 0x04),
        analogStick: LEFT_DIRECTIONS[bytes[3]]
    }
    // LEFT JOYCON CODE HERE
    if(keys.zl) robot.keyTap('r');
    if(keys.l){
        leftMouseDown = true;
        robot.mouseToggle('down','left');
    }else if(leftMouseDown){
        leftMouseDown = false;
        robot.mouseToggle('up','left');
    }
    if(keys.minus) robot.keyTap('tab');

    var x = 1;
    var y = 1;
    const direction = keys.analogStick.split('_');
    if(direction.includes('UP')) keys.dpadUp = true;
    if(direction.includes('DOWN')) keys.dpadDown = true;
    if(direction.includes('LEFT')) keys.dpadLeft = true;
    if(direction.includes('RIGHT')) keys.dpadRight = true;
    if(keys.dpadLeft) x--;
    if(keys.dpadRight) x++;
    if(keys.dpadUp) y--;
    if(keys.dpadDown) y++;
    var newKeyState = [];
    if(x == 0) newKeyState.push('a');
    if(x == 2) newKeyState.push('d');
    if(y == 0) newKeyState.push('w');
    if(y == 2) newKeyState.push('s');
    keyState.filter(k=>!newKeyState.includes(k)).forEach(k=>robot.keyToggle(k,'up'));
    keyState = newKeyState;
    keyState.forEach(k=>robot.keyToggle(k,'down'));
});
var mouseInterval;
const speed = 5;
var rightMouseDown = false;
joycons.right.device.on('data',bytes=>{
    if(bytes[0] !== 0x3f) return;
    const keys = {
        a: Boolean(bytes[1] & 0x01),
        x: Boolean(bytes[1] & 0x02),
        b: Boolean(bytes[1] & 0x04),
        y: Boolean(bytes[1] & 0x08),
  
        plus: Boolean(bytes[2] & 0x02),
        home: Boolean(bytes[2] & 0x10),
  
        r: Boolean(bytes[2] & 0x40),
        zr: Boolean(bytes[2] & 0x80),
  
        analogStickPress: Boolean(bytes[2] & 0x08),
        analogStick: RIGHT_DIRECTIONS[bytes[3]]
    }
    // RIGHT JOYCON CODE HERE
    if(keys.zr) robot.keyTap('q');
    if(keys.r){
        rightMouseDown = true;
        robot.mouseToggle('down','right');
    }else if(rightMouseDown){
        rightMouseDown = false;
        robot.mouseToggle('up','right');
    }
    if(keys.plus){
        robot.moveMouseSmooth(20,90,.05);
        robot.mouseClick();
    }
    if(keys.a) robot.keyTap('e');
    if(keys.b) robot.keyTap('escape');
    clearInterval(mouseInterval);
    if(keys.analogStick == 'NEUTRAL') return;
    var x = 0;
    var y = 0;
    const direction = keys.analogStick.split('_');
    if(direction.includes('UP')) y--;
    if(direction.includes('DOWN')) y++;
    if(direction.includes('LEFT')) x--;
    if(direction.includes('RIGHT')) x++;
    mouseInterval = setInterval(()=>{
        const mousePos = robot.getMousePos();
        robot.moveMouse(mousePos.x+x*speed,mousePos.y+y*speed);
    });
});

// --- LED ANIMATION ---
// const animations = [
//     ['#   |   #',' #  |  # ','  # | #  ','   #|#   ','  # | #  ',' #  |  # '],
//     ['    |    ','#   |    ','##  |    ','### |    ','####|    ','####|#   ','####|##  ','####|### ','####|####',' ###|####','  ##|####','   #|####','    |####','    | ###','    |  ##','    |   #'],
//     ['#   |    ','##  |    ','### |    ','####|    ',' ###|#   ','  ##|##  ','   #|### ','    |####','    | ###','    |  ##','    |   #','    |    '],
//     ['   #|   #','  ##|   #',' ###|  ##','  ##| ###',' ###| ###','  ##|####',' ###|  ##','####| ###','  ##| ###','   #| ###']
// ]
// var animIndex = 0;
// var currentAnim;
// var keyframe = 16;
// setInterval(()=>{
//     if(keyframe == 16){
//         keyframe = 0;
//         var newIndex;
//         do{
//             newIndex = Math.floor(Math.random()*animations.length);
//         }while(newIndex == animIndex);
//         animIndex = newIndex;
//         currentAnim = animations[animIndex];
//         if(Math.random()<=.5) currentAnim.reverse();
//         if(Math.random()<=.5) currentAnim.forEach((v,i)=>currentAnim[i]=`${v.split('|')[1]}|${v.split('|')[0]}`);
//         if(Math.random()<=.5) currentAnim.forEach((v,i)=>currentAnim[i]=`${v.split('|')[0].split('').reverse().join('')}|${v.split('|')[1].split('').reverse().join('')}`);
//     }
//     const leftFrame = currentAnim[keyframe%currentAnim.length].split('|')[0];
//     const rightFrame = currentAnim[keyframe%currentAnim.length].split('|')[1];
//     var leds = 0;
//     if(leftFrame[0]=='#') leds += LED_VALUES.ONE;
//     if(leftFrame[1]=='#') leds += LED_VALUES.TWO;
//     if(leftFrame[2]=='#') leds += LED_VALUES.THREE;
//     if(leftFrame[3]=='#') leds += LED_VALUES.FOUR;
//     joycons.left.setLEDs(leds);
//     leds = 0;
//     if(rightFrame[0]=='#') leds += LED_VALUES.ONE;
//     if(rightFrame[1]=='#') leds += LED_VALUES.TWO;
//     if(rightFrame[2]=='#') leds += LED_VALUES.THREE;
//     if(rightFrame[3]=='#') leds += LED_VALUES.FOUR;
//     joycons.right.setLEDs(leds);
//     keyframe++;
// },100);