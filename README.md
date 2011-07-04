# NodeJS-pushlet

A simple pushlet script for NodeJS that enables clients to register for server push messages and to send messages to already registered clients. The registrations and notifications are separated into modules which function like channels: a notification sent to a channel will be received only by clients subscribed to that channel. Server push messages are in the format expected by JavaScript's EventSource object but can be easily parsed by any other kind of software.

## Usage

The pushlet is simply started by typing 'node pushlet.js' in the command line. If it is not started as a daemon, it will send status reports to the console.

By default, the pushlet listens to port 6969, but you can edit this at the bottom of the file to any value you may like for your server.


Clients can register for server push messages by making a http request to http://yourpushleturl:yourpushletport/register/yourmodulename where yourpushleturl:yourpushletport is the address and port the pushlet is listening to and yourmodulename is the name of the module (channel) you wish the client to receive messages from.

Clients can send messages by making requests to http://yourpushleturl:yourpushletport/notify/yourmodulename. The data to be sent to the registered clients should be sent either as POST data or as an additional uri segment of a GET request. All uri segments after module name in a POST request will be ignored. GET requests are a more performant way to send a single string as a message. Sending complex data should be done with POST requests.

The pushlet can be easily extending by adding action methods to the pushlet.actions object. The router method will by default apply the request object, response object and a single uri component after the module name as arguments of the action method.