#!/usr/bin/env node
var WS = require('ws');
var stun = require('vs-stun');
var stream = require('stream');
var util = require('util');
var net = require('net');

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

util.inherits(Peer, stream.Duplex);
function Peer(opt) {
	if (!(this instanceof Peer))
		return new Peer;
	stream.Duplex.call(this, opt);
	this._readme = false;
	getSocket(this.initSocket.bind(this));
}
Peer.prototype.initSocket = function(socket) {
	var self = this;
	if (!socket) return;
	this.peer = socket;
	this.host = socket.stun.public.host;
	this.port = socket.stun.public.port;
	this.emit("socketReady");
	this.peer.on('data', function(data) {
		self.push(data);
	});
	this.peer.on('close', function() {
		self.push(null);
	});
	if (!this._readme) this.peer.pause();
};
Peer.prototype._write = function (chunk, encoding, callback) {
	if (this.peer && this.remotePort && this.remoteHost) {
		this.peer.send( chunk, 0, chunk.length, this.remotePort, this.remoteHost );
		callback();
	} else {
		callback("port and host not set");
	}
};
Peer.prototype._read =  function() {
	this._readme = true;
	if (this.peer) this.peer.resume();
};
Peer.prototype.attach = function(host, port) {
	this.remoteHost = host;
	this.remotePort = port;
};

if (process.argv.length !== 3) {
	console.log("Usage: node %s <address>", process.argv[1]);
	process.exit(1);
}

var room = new WS(process.argv[2]);
var peer;
room.on('message', function(m) {
	if (m === "hello") {
		peer = new Peer();
		peer.on("socketReady", function() {
			room.send(peer.host + ":" + peer.port);
		});
		process.stdin.pipe(peer);
		peer.pipe(process.stdout);
		peer.on('data', function(data) {
			console.log("we get data %s", data);
		});
		console.log("%s: got a hello", process.pid);
	} else if (m === "ping") {
		//ignore a ping
	} else {
		if (validAddress(m)) {
			var parts = m.split(":");
			var host = parts[0];
			var port = parts[1];
			peer.attach(host, port);
			console.log("%s: it's an address: %s", process.pid, m);
		} else {
			console.log("Not an address :( %s", m);
		}
	}
});
