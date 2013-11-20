#!/usr/bin/env node
var WS = require('ws');
var stun = require('vs-stun');

function validAddress(addr) {
	var x = addr.split(':');
	return x.length === 2 && net.isIP(x[0]) && 0 < x[1] && x[1] < 65536;
}

function getSocket(cb) {
	// Uses stun to setup a socket. Public host/port available on
	// callback's parameter.stun.public. Parameter may be undefined.
	var stunServer = {host: 'stun.l.google.com', port: 19302};
	var attempts = 0;
	var done = false;
	var int = setInterval(tryStun, 1100);
	setTimeout(complete, 75000);
	tryStun();
	function complete(socket) {
		clearInterval(int);
		if (done) return;
		done = true;
		cb(socket);
	}
	function tryStun() {
		stun.connect(stunServer, function(error, socket) {
			if (error) return;
			if (socket.stun.public)
				complete(socket);
			else
				socket.close();
		});
	}
}

function Peer(cb) {
	var that = this;
	getSocket(function(socket) {
		if (!socket) {
			console.log("no socket :(");
			return;
		}
		that.peer = socket;
		that.myHost = socket.stun.public.host;
		that.myPort = socket.stun.public.port;
		console.log("got socket");
		that.peer.on("response", function(packet) {
			var attr = stun.attribute.MAPPED_ADDRESS;
			var ip = packet.attrs[attr].address;
			var port = packet.attrs[attr].port;
			var address = ip + ":" + port;
			console.log("got a this: %s", this);
			cb(address);
		});
	});
	return this;
}
Peer.prototype = {
	send: function (str) {
		if (this.port && this.host) {
			this.client.send( new Buffer(str), 0, str.length, this.port, this.host );
		} else {
			throw "port and host not set";
		}
	}
}

if (process.argv.length !== 3) {
	console.log("Usage: node %s <address>", process.argv[1]);
	process.exit(1);
}

var room = new WS(process.argv[2]);
room.on('message', function(m) {
	var c;
	if (m === "hello") {
		c = new Peer(function(address) {
			room.send(address);
		});
		console.log("%s: got a hello", process.pid);
	} else if (m === "ping") {
		//ignore a ping
	} else {
		console.log("%s: hope it's an address: %s", process.pid, m);
	}
});
