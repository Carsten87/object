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
    var fs = require('fs'),
        server = require(__dirname + '/../../libraries/HybridObjectsHardwareInterfaces'),
        GPIO = require('onoff').Gpio;

    var switchState = undefined;
    var onGPIO,
        offGPIO;


    /**
     * @desc setup() runs once
     **/
    function setup() {
        server.developerOn();
        onGPIO = new GPIO(4, "in", "both");
        offGPIO = new GPIO(3, "in", "both");
        onGPIO.watch(function (err, value) {
            if (err) {
                console.log("pi: ERROR receiving GPIO " + err);
            } else if (value == 0) {
                switchState = 1;
                server.writeIOToServer("piSwitch", "switch", 1, "d");
            }
        });

        offGPIO.watch(function (err, value) {
            if (err) {
                console.log("pi: ERROR receiving GPIO " + err);
            } else if (value == 0) {
                switchState = 0;
                server.writeIOToServer("piSwitch", "switch", 0, "d");
            }
        });
    }

    /**
     * @desc teardown() free up any open resources
     **/
    function teardown() {
        onGPIO.unexport();
        offGPIO.unexport();
    }



    /**
     * @desc This function is called once by the server. Place calls to addIO(), clearIO(), developerOn(), developerOff(), writeIOToServer() here.
     *       Start the event loop of your hardware interface in here. Call clearIO() after you have added all the IO points with addIO() calls.
     **/
    exports.receive = function () {
        if (server.getDebug()) console.log("piSwitch: receive()");
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
        if (objName == "piSwitch" && ioName == "switch") {
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
        if (server.getDebug()) console.log("piSwitch: init()");
        server.addIO("piSwitch", "switch", "default", "piSwitch");
        server.clearIO("piSwitch");
    };

    /**
     * @desc This function is called once by the server when the process is being torn down. 
     *       Clean up open file handles or resources and return quickly.
     **/
    exports.shutdown = function () {
        if (server.getDebug()) console.log("piSwitch: shutdown()");
        teardown();
    };

}