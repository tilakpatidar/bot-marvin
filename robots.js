var request=require("request");
var robots = require('robots');
var queued=0;
var app={
	"init":function(urls,fn){
		for (var i = 0; i < urls.length; i++) {
			(function(req_url){
				var parser = new robots.RobotsParser();
				parser.setUrl(req_url+'/robots.txt', function(parser, success) {
				  if(success) {
				    app.bots[req_url]=parser;//saving robots obj
				  }
				  else{
				  	app.bots[req_url]="NO_ROBOTS";//no robots.txt found no restriction
				  }
				});
				
				queued+=1;
				if(queued===urls.length){
					fn(app.bots);
				}

			})(urls[i]);
			
		};
	},
	"bots":{}


};
exports.app=app;

