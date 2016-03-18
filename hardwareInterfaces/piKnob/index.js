/**
 *
 * Created by Carsten Strunk on 02/02/116.
 *
 * Copyright (c) 2015 Carsten Strunk
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Set to true to enable the hardware interface
 **/
exports.enabled = false;

if (exports.enabled) {
    var server = require(__dirname + '/../../libraries/HybridObjectsHardwareInterfaces'),
        GPIO = require('onoff').Gpio;
    var ws = require('nodejs-websocket');

    var switchState = undefined;
    var knob1GPIO,
        knob2GPIO,
        buttonGPIO;
    var step = 0.01;
    var CLOCKWISE = 0;
    var COUNTERCLOCKWISE = 1;

    var absolute = 0.5;

    var rotary_a = undefined;
    var rotary_b = undefined;
    var rotary_c = undefined;
    var newState = 0;
    var lastState = 0;
    var direction = undefined;
    var delta;

    var wserv = ws.createServer(function (conn) { }).listen(8001);

    function broadcast(wserver, msg) {
        wserver.connections.forEach(function (conn) {
            conn.sendText(msg)
        });
    }

    function addStep(st) {
        absolute += step;
        if (absolute > 1)
            absolute = 1;
        if (absolute < 0)
            absolute = 0;
    }

    function rotaryEvent() {
        rotary_a = knob1GPIO.readSync();
        rotary_b = knob2GPIO.readSync();
        rotary_c = rotary_a ^ rotary_b;
        newState = rotary_a * 4 + rotary_b * 2 + rotary_c;
        delta = (newState - lastState) % 4;
        lastState = newState;
        if (delta == 1) {
            server.writeIOToServer("piKnob", "value", step, "p");
            direction = CLOCKWISE;
            addStep(step);
            broadcast(wserv, absolute + '');
        } else if (delta == 3) {
            server.writeIOToServer("piKnob", "value", step, "n");
            direction = COUNTERCLOCKWISE;
            addStep(-step);
            broadcast(wserv, absolute + '');
        } else if (delta == 2) {
            if (direction == CLOCKWISE) {
                server.writeIOToServer("piKnob", "value", step * 2, "p");
                addStep(2 * step);
                broadcast(wserv, absolute + '');
            } else if (direction == COUNTERCLOCKWISE) {
                server.writeIOToServer("piKnob", "value", step * 2, "n");
                addStep(-2 * step);
                broadcast(wserv, absolute + '');
            }
        }
    }
    /**
     * @desc setup() runs once
     **/
    function setup() {
        server.developerOn();
        knob1GPIO = new GPIO(3, "in", "falling");
        knob2GPIO = new GPIO(4, "in", "falling");
        buttonGPIO = new GPIO(2, "in", "both");
        buttonGPIO.watch(function (err, value) {
            if (err) {
                console.log("pi: ERROR receiving GPIO " + err);
            } else {
                console.log("Button value: " + value);
            }
        });

        knob1GPIO.watch(function (err, value) {
            if (err) {
                console.log("pi: ERROR receiving GPIO " + err);
            } else {
                rotaryEvent();
            }
        });

        knob2GPIO.watch(function (err, value) {
            if (err) {
                console.log("pi: ERROR receiving GPIO " + err);
            } else {
                rotaryEvent();
            }
        });
    }

    /**
     * @desc teardown() free up any open resources
     **/
    function teardown() {
        buttonGPIO.unexport();
        knob1GPIO.unexport();
        knob2GPIO.unexport();
    }



    /**
     * @desc This function is called once by the server. Place calls to addIO(), clearIO(), developerOn(), developerOff(), writeIOToServer() here.
     *       Start the event loop of your hardware interface in here. Call clearIO() after you have added all the IO points with addIO() calls.
     **/
    exports.receive = function () {
        if (server.getDebug()) console.log("piKnob: receive()");
        setup();
    };

    /**
     * @desc This function is called by the server whenever data for one of your HybridObject's IO points arrives. Parse the input and write the
     *       value to your hardware.
     * @param {string} objName Name of the HybridObject
     * @param {string} ioName Name of the IO point
     * @param {value} value The value
     * @param {string} mode Specifies the datatype of value
     * @param {type} type The type
     **/
    exports.send = function (objName, ioName, value, mode, type) {
        if (objName == "piKnob" && ioName == "value") {
            
        }
    };

    /**
     * @desc prototype for an interface init. The init reinitialize the communication with the external source.
     * @note program the init so that it can be called anytime there is a change to the amount of objects.
     **/
    exports.init = function () {
        if (server.getDebug()) console.log("piKnob: init()");
        server.addIO("piKnob", "value", "default", "piKnob");
        server.clearIO("piKnob");
    };

    /**
     * @desc This function is called once by the server when the process is being torn down. 
     *       Clean up open file handles or resources and return quickly.
     **/
    exports.shutdown = function () {
        if (server.getDebug()) console.log("piKnob: shutdown()");
        teardown();
    };

}