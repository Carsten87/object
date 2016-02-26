/**
 * Created by Carsten on 12/06/15.
 * Modified by Peter Som de Cerff (PCS) on 12/21/15
 *
 * Copyright (c) 2015 Carsten Strunk
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 *  PHILIPS HUE CONNECTOR
 *
 * This hardware interface can communicate with philips Hue lights. The config.json file specifies the connection information
 * for the lamps in your setup. A light in this config file has the following attributes:
 * {
 * "host":"localhost",                  // ip or hostname of the philips Hue bridge
 * "url":"/api/newdeveloper/lights/1",  // base path of the light on the bridge, replace newdeveloper with a valid username (see http://www.developers.meethue.com/documentation/getting-started)
 * "id":"Light1",                       // the name of the HybridObject
 * "port":"80"                          // port the hue bridge is listening on (80 on all bridges by default)
 *                                     
 * }
 *
 * Some helpful resources on the Philips Hue API:
 * http://www.developers.meethue.com/documentation/getting-started
 * http://www.developers.meethue.com/documentation/lights-api
 * 
 * TODO: Add some more functionality, i.e. change color or whatever the philips Hue API offers
 */
//Enable this hardware interface
exports.enabled = false;

if (exports.enabled) {


    var fs = require('fs');
    var http = require('http');
    var _ = require('lodash');
    var io = require('socket.io')(8081);
    var server = require(__dirname + '/../../libraries/HybridObjectsHardwareInterfaces');


    var lights = JSON.parse(fs.readFileSync(__dirname + "/config.json", "utf8"));
    function Color(hue, bri, sat) {
        this.hue = hue;
        this.bri = bri;
        this.sat = sat;
    }

    //io.on('connection', function (socket) {
    //    socket.on('requestPresets', function (objName) {
    //        if (lights.hasOwnProperty(objName)) {
    //            socket.emit('presets', JSON.stringify(lights[objName].presets));
    //        } else {
    //            console.log("requestPresets error: Unknown object: " + objName);
    //        }
    //    });
    //    socket.on('presetChange', function (data) {
    //        var obj = JSON.parse(data);
    //        if (lights.hasOwnProperty(obj.objName)) {
    //            lights[obj.objName].presets[obj.index].bri = obj.bri;
    //            lights[obj.objName].presets[obj.index].hue = obj.hue;
    //            lights[obj.objName].presets[obj.index].sat = obj.sat;
    //        }
    //    });
    //});


    /**
     * @desc setup() runs once, adds and clears the IO points
     **/
    function setup() {
        server.developerOn();

        if (server.getDebug()) console.log("setup philipsHue");
        for (var key in lights) {
            lights[key].switch = undefined;
            lights[key].bri = undefined;
            lights[key].hue = undefined;
            lights[key].sat = undefined;
            //lights[key].presets = [];
            //for (var i = 0; i < 50; i++) {
            //    lights[key].presets[i] = new Color(1 / 49 * i, 1, 1);
            //}
        }
    }


    /**
         * @desc getLightState() communicates with the philipsHue bridge and checks the state of the light
     * @param {Object} light the light to check
     * @param {function} callback function to run when the response has arrived
     **/
    function getLightState(light, callback) {
        var state;

        var options = {
            host: light.host,
            path: light.url,
            port: light.port,
            method: 'GET',
        };

        callbackHttp = function (response) {
            var str = '';

            response.on('data', function (chunk) {
                str += chunk;
            });

            response.on('end', function () {
                //TODO add some error handling
                state = JSON.parse(str).state;
                if (state.on != light.switch) {
                    light.switch = state.on;
                    if (state.on) {
                        callback(light.id, "onOff", 1, "d");
                    } else {
                        callback(light.id, "onOff", 0, "d");
                    }

                }

                if (state.hue != light.hue) {
                    light.hue = state.hue; // hue is a value between 0 and 65535
                    callback(light.id, "hue", state.hue / 65535, "f"); // map hue to [0,1]
                }

                if (state.bri != light.bri) {
                    light.bri = state.bri; // brightness is a value between 1 and 254
                    callback(light.id, "brightness", (state.bri - 1) / 253, "f");
                }

                if (state.sat != light.sat) {
                    light.sat = state.sat;
                    callback(light.id, "saturation", state.sat / 254, "f");
                }

            });
        }



        var req = http.request(options, callbackHttp);
        req.on('error', function (e) {
            console.log('GetLightState HTTP error: ' + e.message);
        });
        req.end();

    }


    /**
     * @desc writeSwitchState() turns the specified light on or off
         * @param {float} state turns the light on if > 0.5, turns it off otherwise
     **/
    function writeSwitchState(light, state) {
        var options = {
            host: light.host,
            path: light.url + "/state",
            port: light.port,
            method: 'PUT',
        };


        var req = http.request(options, function () { });
        req.on('error', function (e) {
            console.log('writeSwitchState HTTP error: ' + e.message);
        });

        if (state < 0.5) {
            req.write('{"on":false}');
        } else {
            req.write('{"on":true}');
        }



        req.end();

        //TODO check for success message from the bridge
    }

    /**
     * @desc writeBrightness() Sets the brightness of the specified light 
     * @param {float} bri is the brightness in the range [0,1]
 **/
    function writeColor(light, hue, sat, bri) {
        var options = {
            host: light.host,
            path: light.url + "/state",
            port: light.port,
            method: 'PUT',
        };

        var req = http.request(options, function () { });
        req.on('error', function (e) {
            console.log('writeColor HTTP error: ' + e.message);
        });

        req.write('{"transitiontime":2, "bri":' + _.floor(bri * 253 + 1) + ', "hue":' + _.floor(hue * 65535) + ', "sat":' + _.floor(sat * 254) + '}');

        req.end();
    }

    /**
         * @desc writeBrightness() Sets the brightness of the specified light 
         * @param {float} bri is the brightness in the range [0,1]
     **/
    function writeBrightness(light, bri) {
        var options = {
            host: light.host,
            path: light.url + "/state",
            port: light.port,
            method: 'PUT',
        };

        var req = http.request(options, function () { });
        req.on('error', function (e) {
            console.log('writeBrightness HTTP error: ' + e.message);
        });

        req.write('{"transitiontime":2, "bri":' + _.floor(bri * 253 + 1) + '}');

        req.end();
    }


    /**
     * @desc writeSaturation() sets the saturation for the specified light 
     * @param {float} sat is the saturatin in the range [0,1]
     **/
    function writeSaturation(light, sat) {
        var options = {
            host: light.host,
            path: light.url + "/state",
            port: light.port,
            method: 'PUT',
        };

        var req = http.request(options, function () { });
        req.on('error', function (e) {
            console.log('writeSaturation HTTP error: ' + e.message);
        });
        req.write('{"transitiontime":2, "sat":' + _.floor(sat * 254) + '}');
        req.end();
    }


    /**
     * @desc writeHue() sets the hue for the specified light 
     * @param {integer} hue is the hue in the range [0,1]
     **/
    function writeHue(light, hue) {
        var options = {
            host: light.host,
            path: light.url + "/state",
            port: light.port,
            method: 'PUT',
        };

        var req = http.request(options, function () { });
        req.on('error', function (e) {
            console.log('writeHue HTTP error: ' + e.message);
        });
        req.write('{"transitiontime":2, "hue":' + _.floor(hue * 65535) + '}');
        req.end();
    }

    /**
     * @desc philipsHueServer() The main function, runs the setup and then periodically checks whether the lights are on.
     **/
    function philipsHueServer() {
        console.log("philipsHue starting philipsHue");
        setup();


        if (server.getDebug()) console.log("philipsHue setup read by poll");
        //TODO poll more often in productive environment
        for (var key in lights) {
            setInterval(function (light) {
                getLightState(light, server.writeIOToServer);
            }, 1000 + _.random(-250, 250), lights[key]);
        }

    }


    exports.receive = function () {
        philipsHueServer();
    };

    exports.send = function (objName, ioName, value, mode, type) {
        if (server.getDebug()) console.log("Incoming: " + objName + "   " + ioName + "   " + value);
        //Write incoming data to the specified light
        if (lights.hasOwnProperty(objName)) {
            var light = lights[objName];
            if (ioName == "onOff" && (mode == "f" || mode == "d")) {
                writeSwitchState(light, value);
            } else if (ioName == "brightness" && (mode == "f" || mode == "d")) {
                writeBrightness(light, value);
            } else if (ioName == "brightness" && mode == "p") {
                var bri = ((light.bri - 1) / 253) + value;
                if (bri > 1) {
                    bri = 1;
                }
                writeBrightness(light, bri);
            } else if (ioName == "brightness" && mode == "n") {
                var bri = ((light.bri - 1) / 253) - value;
                if (bri < 0) {
                    bri = 0;
                }
                writeBrightness(light, bri);
            } else if (ioName == "saturation" && (mode == "f" || mode == "d")) {
                writeSaturation(light, value);
            } else if (ioName == "saturation" && mode == "p") {
                var sat = light.sat / 254 + value;
                if (sat > 1) {
                    sat = 1;
                }
                writeSaturation(light, sat);
            } else if (ioName == "saturation" && mode == "n") {
                var sat = light.sat / 254 - value;
                if (sat < 0) {
                    sat = 0;
                }
                writeSaturation(light, sat);
            } else if (ioName == "hue" && (mode == "f" || mode == "d")) {
                writeHue(light, value);
            } else if (ioName == "hue" && mode == "p") {
                var hue = light.hue / 65535 + value;
                if (hue > 1) {
                    hue = 1;
                }
                writeHue(light, hue);
            } else if (ioName == "hue" && mode == "n") {
                var hue = light.hue / 65535 - value;
                if (hue < 0) {
                    hue = 0;
                }
                writeHue(light, hue);
            }
            //else if (ioName == "presets" && (mode == "f" || mode == "d")) {
            //    var index = _.floor(value * 49);
            //    writeColor(light, light.presets[index].hue, light.presets[index].sat, light.presets[index].bri);
            //    server.writeIOToServer(objName, ioName, value, "f");
            //}
        }
    };

    exports.init = function () {
        for (var key in lights) {
            server.addIO(key, "onOff", "default", "philipsHue");
            server.addIO(key, "brightness", "default", "philipsHue");
            server.addIO(key, "hue", "default", "philipsHue");
            server.addIO(key, "saturation", "default", "philipsHue");
            //server.addIO(key, "presets", "default", "philipsHue");
        }
        server.clearIO("philipsHue");
    };

}



