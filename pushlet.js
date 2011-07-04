var http = require('http');
var querystring = require('querystring');

var pushlet = {};

//actions object contains actions requested through request url, much like actions in an MVC controller
pushlet.actions = {};

//a 2d array of clients (grouped by modules) that registered for notifications
//a single element contains the client's request, response and a stream id
pushlet.clients = [];

//calls one of the action methods depending on the request url or returns false if action is not defined
pushlet.route = function(request, response) {
	console.log('routing '+request.url);
	var uriComponents = request.url.split('/');
	console.log(uriComponents[1]);
	if (typeof pushlet.actions[uriComponents[1]] == 'function') {
		console.log('action '+uriComponents[1]+' found');
		request.connection.setTimeout(0);
		pushlet.actions[uriComponents[1]].apply(pushlet, [request, response, uriComponents[2]]);
		return true;
	}

	return false;
};

//starts a text/event-stream type http response
pushlet.startStream = function(request, response) {
	console.log('starting stream');
	response.writeHead(200, {
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache',
		'Connection': 'keep-alive'
	});

	return 'pushlet-stream-'+(new Date()).getTime();
}

//turns received data into a query string for http response
pushlet.parseData = function(data) {
	if (typeof data == 'object' && data.length) {
		console.log('parsing data recursively for '+data);
		var response = '';
		for (var d in data)
			response += pushlet.parseData(data[d]);
		return response;
	}
	else {
		if (typeof data != 'string' && typeof data.toString == 'function')
			data = data.toString();
		return "data: " + data + '\n';
	}
}

//send an event to the stream response
pushlet.sendEvent = function(response, id, data) {
	console.log('sending event');
	response.write('id: ' + id + '\n');
	response.write(pushlet.parseData(data)+'\n');
}

//starts a response and puts into clients array
pushlet.actions.register = function(request, response, module) {
	console.log('registering client for module '+module);
	var id = pushlet.startStream(request, response);
	if (typeof pushlet.clients[module] == 'undefined')
		pushlet.clients[module] = [];
	var clientIndex = pushlet.clients[module].push([id, response]) - 1;
	request.on('close', function() {
		console.log('connection closed by the client, removing client at index '+clientIndex+' from array.');
		pushlet.clients[module].splice(clientIndex, 1);
	});
}

//a notification action
pushlet.actions.notify = function(request, response, module, data) {
	console.log('notification received from module '+module);
	console.log('method is '+request.method);
	if (typeof pushlet.clients[module] != 'undefined') {
		var postData = '';
		request.on('data', function(chunk) {
			console.log('data event');
			postData += chunk;
		});
		request.on('end', function() {
			console.log('end event');
			response.writeHead(200);
			console.log('code 200 header sent');
			response.end('ok\n\n');
			console.log('response sent');
			var eventData = (request.method == 'GET')? data : querystring.parse(postData).data;
			if (typeof eventData == 'undefined')
				eventData = '';
			console.log('sending events for module '+module);
			console.log('data is: '+eventData);
			for (var c in pushlet.clients[module])
				pushlet.sendEvent(pushlet.clients[module][c][1], pushlet.clients[module][c][0], eventData);
		});
	} else {
		console.log('No listeners for the module.');
		response.writeHead(200);
		response.end('ok\n\n');
	}
}


//server initialisation
http.createServer(function(request, response) {
	console.log('received request '+request.url);
	if (!pushlet.route(request, response)) {
		console.log('bad request');
		response.writeHead(404);
		response.end();
	}
}).listen(6969);