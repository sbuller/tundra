#!/usr/bin/env node
var WS = require('ws');
var stun = require('vs-stun');
var events = require('events');
var stream = require('stream');
var util = require('util');

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

function Peer() {
	if (!(this instanceof Peer))
		return new Peer;
	stream.Duplex.call(this);
	getSocket(this.initSocket.bind(this));
}
util.inherits(Peer, stream.Duplex);
Peer.prototype = {
	initSocket: function(socket) {
		var self = this;
		if (!socket) return;
		this.peer = socket;
		this.host = socket.stun.public.host;
		this.port = socket.stun.public.host;
		this.emit("socketReady");
		this.peer.on('data', function(data) {
			self.push(data);
		});
		this.peer.on('close', function() {
			self.push(null);
		});
	},
	_write: function (chunk, encoding, callback) {
		if (this.peer && this.remotePort && this.remoteHost) {
			this.peer.send( chunk, 0, chunk.length, this.remotePort, this.remoteHost );
			callback();
		} else {
			callback("port and host not set");
		}
	},
	_read: function() {},
	attach: function(host, port) {
		this.remoteHost = host;
		this.remotePort = port;
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
		c = new Peer();
		console.log("%s: got a hello", process.pid);
	} else if (m === "ping") {
		//ignore a ping
	} else {
		c.attach(address);
		console.log("%s: hope it's an address: %s", process.pid, m);
	}
});
