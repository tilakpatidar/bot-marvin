var request=require("request");
var queued=0;
var app={
	"init":function(urls,fn){
		for (var i = 0; i < urls.length; i++) {
			(function(req_url){
				var robots = require('robots');
				var parser = new robots.RobotsParser();
				var req_url_new=req_url.split("/").slice(0,3).join("/");
				parser.setUrl(req_url_new+'/robots.txt', function(parser_obj, success) {
				  if(success) {
				    app.bots[req_url]=parser_obj;//saving robots obj
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

