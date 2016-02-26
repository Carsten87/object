/**
 * Created by Carsten on 02/01/16.
 *
 * Copyright (c) 2015 Carsten Strunk
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 *  KODI Client
 *
 * This hardware interface can communicate with a KODI Media Centre using the JSON RPC API
 *
 * http://kodi.wiki/view/JSON-RPC_API/v6
 *
 */
//Enable this hardware interface
exports.enabled = false;

if (exports.enabled) {
    var fs = require('fs');
    var http = require('http');
    var kodi = require('kodi-ws');
    var _ = require('lodash');
    var server = require(__dirname + '/../../libraries/HybridObjectsHardwareInterfaces');

    var kodiServers = JSON.parse(fs.readFileSync(__dirname + "/config.json", "utf8"));


    /**
     * @desc setup() runs once, adds and clears the IO points
     **/
    function setup() {
        server.developerOn();

        if (server.getDebug()) console.log("KODI setup");

        for (var key in kodiServers) {
            var kodiServer = kodiServers[key];
            kodiServer.connection = null;
            kodiServer.bri = undefined;
            kodiServer.hue = undefined;
            kodiServer.sat = undefined;
            kodiServer.volume = 0;

            //Poll for color changes
            setInterval(function (ks) {
                getColor(ks, server.writeIOToServer);
            }, 500 + _.random(-50, 50), kodiServer);

            kodi(kodiServer.host, kodiServer.port).then(function (connection) {
                kodiServer.connection = connection;
                kodiServer.connection.on('error', function (error) { console.log("KODI error: " + error) });

                //Add Event Handlers
                kodiServer.connection.Application.OnVolumeChanged(function () {
                    var volume = kodiServer.connection.Application.GetProperties({ properties: ['volume'] });
                    volume.then(function (data) {
                        kodiServer.volume = data.volume / 100;
                        server.writeIOToServer(key, "volume", data.volume / 100, "f");
                    });

                });

                kodiServer.connection.Player.OnPause(function () {
                    server.writeIOToServer(key, "playStop", 0.5, "f");
                });

                kodiServer.connection.Player.OnPlay(function () {
                    server.writeIOToServer(key, "playStop", 1, "f");
                    server.writeIOToServer(key, "dim", 0.5, "f");
                });

                kodiServer.connection.Player.OnStop(function () {
                    server.writeIOToServer(key, "playStop", 0, "f");
                    server.writeIOToServer(key, "dim", 1, "f");
                });

            });

        }
    }

    /**
     * @desc getColor() communicates with the KODI media centre and checks the ambilight color
     * @param {Object} kodiServer the media centre to check
     * @param {function} callback function to run when the response has arrived
     **/
    function getColor(kodiServer, callback) {
        var h, s, v;

        var options = {
            host: kodiServer.host,
            path: kodiServer.colorPath,
            port: kodiServer.colorPort,
            method: 'GET',
        };

        callbackHttp = function (response) {
            var str = '';

            response.on('data', function (chunk) {
                str += chunk;
            });

            response.on('end', function () {
                try{
                    color = JSON.parse(str);
                

                    if (color.h != kodiServer.hue) {
                        kodiServer.hue = color.h; // hue is a value between 0 and 65535
                        callback(kodiServer.id, "hue", color.h, "f"); // map hue to [0,1]
                    }

                    if (color.v != kodiServer.bri) {
                        kodiServer.bri = color.v; // brightness is a value between 1 and 254
                        callback(kodiServer.id, "brightness", color.v, "f");
                    }

                    if (color.s != kodiServer.sat) {
                        kodiServer.sat = color.s;
                        callback(kodiServer.id, "saturation", color.s, "f");
                    }
                }catch (error){
                    console.log("KODI getColor Error: " + error.message);
                }

            });
        }



        var req = http.request(options, callbackHttp);
        req.on('error', function (e) {
            console.log('getColor HTTP error: ' + e.message);
        });
        req.end();

    }


    exports.receive = function () {
        setup();

    };

    exports.send = function (objName, ioName, value, mode, type) {
        if (kodiServers.hasOwnProperty(objName) && !_.isNull(kodiServers[objName].connection)) {
            var kodiServer = kodiServers[objName];
            if (ioName == "volume" && (mode =="f" || mode == "d")) {
                kodiServer.connection.Application.SetVolume(_.floor(value * 100));
            } else if (ioName == "volume" && mode == "p") {
                kodiServer.volume += value;
                if (kodiServer.volume > 1) {
                    kodiServer.volume = 1;
                }
                kodiServer.connection.Application.SetVolume(_.floor(value * 100));
            } else if (ioName == "volume" && mode == "n") {
                kodiServer.volume -= value;
                if (kodiServer.volume < 0) {
                    kodiServer.volume = 0;
                }
                kodiServer.connection.Application.SetVolume(_.floor(value * 100));
            } else if (ioName == "playStop" && (mode == "f" || mode == "d")) {
                //play, pause, stop all of the currently active players
                kodiServer.connection.Player.GetActivePlayers().then(function (data) {
                    for (var i = 0; i < data.length; i++) {
                        if (value < 0.33) {
                            kodiServer.connection.Player.Stop({ playerid: data[i].playerid });
                        } else if (value < 0.66) {
                            kodiServer.connection.Player.PlayPause({ playerid: data[i].playerid, play: false });
                        } else {
                            kodiServer.connection.Player.PlayPause({ playerid: data[i].playerid, play: true });
                        }
                    }

                });

            }
        }
    };

    exports.init = function () {
        for (var key in kodiServers) {
            server.addIO(key, "volume", "default", "kodi");
            server.addIO(key, "playStop", "default", "kodi");
            server.addIO(key, "hue", "output", "kodi");
            server.addIO(key, "saturation", "output", "kodi");
            server.addIO(key, "brightness", "output", "kodi");
            server.addIO(key, "dim", "output", "kodi");
        }

        server.clearIO("kodi");
    };
}

