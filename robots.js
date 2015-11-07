var request=require("request");
var robots = require('cyborg.txt');
var queued=0;
var app={
	"init":function(urls,fn){
		for (var i = 0; i < urls.length; i++) {
			(function(req_url){
				robots.url(req_url);
				var bot = new robots.Bot({});
				app.bots[req_url]=bot;


			})(urls[i]);
			
		};
	},
	"bots":{}


};
exports.app=app;

