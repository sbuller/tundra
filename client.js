#!/usr/bin/env node
var WS = require('ws');

function connect(host, room) {
	return new WS('ws://'+host+'/'+room);
}

var room = connect('localhost:8080', 'test');
room.on('message', function(m) {
	if (m === "hello") {
		console.log("%s: got a hello", process.pid);
		room.send("192.168.254.100:" + process.pid);
	} else {
		console.log("%s: hope it's an address: %s", process.pid, m);
	}
});
