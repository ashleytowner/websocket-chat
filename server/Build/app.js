"use strict";
exports.__esModule = true;
var WS = require("ws");
var server = new WS.Server({ port: 8080 });
server.on('connection', function () {
    var x = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        x[_i] = arguments[_i];
    }
    console.log(x);
});
