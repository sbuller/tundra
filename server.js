#!/usr/bin/env node
var WSS = require('ws').Server;
var wss = new WSS({port: 8080});
var net = require('net');

function validAddress(addr) {
	var x = addr.split(':');
	return x.length === 2 && net.isIP(x[0]) && 0 < x[1] && x[1] < 65536;
}

function pairClients(client1, client2) {
	client1.send("hello");
	client2.send("hello");
	client1.once("message", function(m) { client2.send(m); });
	client2.once("message", function(m) { client1.send(m); });
}

function Forum() {
	this.rooms = {};
}
Forum.prototype = {
	getRoom: function(name) {
		if (!this.rooms[name]) this.rooms[name] = new Room(name);
		return this.rooms[name];
	}
};
var forum = new Forum();

function Room(name) {
	this.name = name;
	this.clients = [];
}
Room.prototype = {
	removeClient: function(conn) {
		this.clients = this.clients.filter(function(c) {
			return c !== conn;
		});
	},
	pairNewClient: function(client) {
		this.clients.forEach(function(c) {
			pairClients(client, c);
		});
		this.clients.push(client);
	}
};

wss.on('connection', function(ws) {
	var url = ws.upgradeReq.url;
	var room = forum.getRoom(url);
	room.pairNewClient(ws);
	ws.on('message', function(addr) {
		console.log('received: %s on %s', addr, url);
	});
	ws.on('close', function() {
		room.removeClient(ws);
	});
});
