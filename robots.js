var request=require("request");
var fs = require('fs');
var queued=0;
var app={
	"init":function(urls,fn){
		for (var i = 0; i < urls.length; i++) {
			(function(req_url){
				req_url=req_url+"/robots.txt";
				request(req_url,function(err,response,html){
					if(err || response.statusCode===404){
						html="NO_ROBOTS";
					}
					(function(req_url,html){
						fs.appendFile('./robots/'+req_url.replace(/\//g,"#"),html, function (err) {
							
							queued+=1;
							if(queued===urls.length){
								fn();
							}
							});




					})(req_url,html);
					
					
				});



			})(urls[i]);
			
		};
	}

};
exports.app=app;

