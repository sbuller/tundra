#!/usr/bin/env node
var WSS = require('ws').Server;
var port = process.env.PORT || 5000;
var wss = new WSS({port: port});
var net = require('net');

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
