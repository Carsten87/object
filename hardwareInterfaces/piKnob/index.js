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
exports.enabled = true;

if (exports.enabled) {
    var fs = require('fs'),
        server = require(__dirname + '/../../libraries/HybridObjectsHardwareInterfaces'),
        GPIO = require('onoff').Gpio;

    var switchState = undefined;
    var knob1GPIO,
        knob2GPIO,
        buttonGPIO;

    var rotary_a = undefined;
    var rotary_b = undefined;
    var rotary_c = undefined;
    var newState = 0;
    var lastState = 0;
    var delta;

    function rotaryEvent() {
        rotary_a = knob1GPIO.readSync();
        rotary_b = knob2GPIO.readSync();
        rotary_c = rotary_a ^ rotary_b;
        newState = rotary_a * 4 + rotary_b * 2 + rotary_c;
        delta = (newState - lastState) % 4;
        lastState = newState;
        if (delta == 1) {
            console.log("Clockwise");
        } else if (delta == 3) {
            console.log("Counterclockwise");
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
                console.log("Knob1 value: " + value);
                rotaryEvent();
            }
        });

        knob2GPIO.watch(function (err, value) {
            if (err) {
                console.log("pi: ERROR receiving GPIO " + err);
            } else {
                console.log("Knob2 value: " + value);
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
        if (objName == "piKnob" && ioName == "switch") {
            if (value > 0.5) {
                switchState = 1;
            } else {
                switchState = 0;
            }
        }
    };

    /**
     * @desc prototype for an interface init. The init reinitialize the communication with the external source.
     * @note program the init so that it can be called anytime there is a change to the amount of objects.
     **/
    exports.init = function () {
        if (server.getDebug()) console.log("piKnob: init()");
        server.addIO("piKnob", "switch", "default", "piKnob");
        server.addIO("piKnob", "position", "default", "piKnob");
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