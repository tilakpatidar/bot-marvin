var request=require("request");
var fs = require('fs');
var queued=0;
var app={
	"init":function(urls,fn){
		app.loadCache();
		for (var i = 0; i < urls.length; i++) {
			(function(req_url){
				var robots = require('robots');
				var parser = new robots.RobotsParser();
				var req_url_new=req_url.split("/").slice(0,3).join("/");
				if(app.bots[req_url]===undefined || app.bots[req_url]===null){
						parser.setUrl(req_url_new+'/robots.txt', function(parser_obj, success) {
							  if(success) {
							  	console.log("[INFO] Robots.txt parsed for "+req_url);
							  	var filename=req_url.replace(/\//g,"##");
							  	fs.writeFileSync("./robots/"+filename,JSON.stringify(parser_obj));
							    app.bots[req_url]=parser_obj;//saving robots obj
							  }
							  else{
							  	console.log("[INFO] No Robots.txt found for "+req_url);
							  	var filename=req_url.replace(/\//g,"##");
							  	var parser_obj={"NO_ROBOTS":true};
							  	fs.writeFileSync("./robots/"+filename,JSON.stringify(parser_obj));
							  	app.bots[req_url]=parser_obj;//no robots.txt found no restriction
							  }
								queued+=1;
								if(queued===urls.length){
									fn(app.bots);
								}
						});
				}
				else{
								queued+=1;
								if(queued===urls.length){
									fn(app.bots);
								}
				}
				
					
				
					  

			})(urls[i]);
			
		};
	},
	"loadCache":function(){
			var files=fs.readdirSync('./robots/');
			for (var i = 0; i < files.length; i++) {
				var domain=files[i].replace(/##/g,"/");
				var data=fs.readFileSync('./robots/'+files[i]).toString();
				if(data!==undefined || data !==null){
					var js=JSON.parse(data);
					app.bots[domain]=js;
					console.log("[INFO] Robots.txt loaded from cache for "+domain);
				}
			};
		
	},
	"bots":{}


};
exports.app=app;

