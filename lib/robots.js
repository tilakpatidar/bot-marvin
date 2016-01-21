var parent_dir=process.getAbsolutePath(__dirname);
var request=require("request");
var fs = require('fs');
var log=require(parent_dir+"/lib/logger.js");
var queued=0;
var check=require("check-types");
var app={
	"init":function(urls,fn){
		try{
			if(!config["verbose"]){
				log.put("Preparing robots.txt files this will take time . . .","no_verbose");
			}
			var err;
			app.loadCache();
			for (var i = 0; i < urls.length; i++) {
				(function(req_url){
					var robots = require('robots');
					var parser = new robots.RobotsParser();
					var req_url_new=req_url.split("/").slice(0,3).join("/");
					if(!check.assigned(app.bots[req_url])){
							parser.setUrl(req_url_new+'/robots.txt', function(parser_obj, success) {
								  if(success) {
								  	log.put(("Robots.txt parsed for "+req_url),"success");
								  	var filename=req_url.replace(/\//g,"##");
								  	fs.writeFileSync(__dirname+"/robots/"+filename,JSON.stringify(parser_obj));
								    app.bots[req_url]=parser_obj;//saving robots obj
								  }
								  else{
								  	log.put(("No Robots.txt found for "+req_url),"error");
								  	var filename=req_url.replace(/\//g,"##");
								  	var parser_obj={"NO_ROBOTS":true};
								  	fs.writeFileSync(__dirname+"/robots/"+filename,JSON.stringify(parser_obj));
								  	app.bots[req_url]=parser_obj;//no robots.txt found no restriction
								  }
									queued+=1;
									if(queued===urls.length){
										fn(err,app.bots);
									}
							});
					}
					else{
									queued+=1;
									if(queued===urls.length){
										fn(err,app.bots);
									}
					}
					
						
					
						  

				})(urls[i]);
				
			};
		}
		catch(err){
			fn(err,null);
		}
		
	},
	"loadCache":function(){
			var files=fs.readdirSync(__dirname+'/robots/');
			for (var i = 0; i < files.length; i++) {
				if(files[i].indexOf(".")===0){
					//do not take hidden files
					continue;
				}
				var domain=files[i].replace(/##/g,"/");
				var data=fs.readFileSync(__dirname+'/robots/'+files[i]).toString();
				if(check.assigned(data)){
					var js=JSON.parse(data);
					app.bots[domain]=js;
					log.put(("Robots.txt loaded from cache for "+domain),"success");
				}
			};
		
	},
	"bots":{},
	"sites":{}


};
exports.app=app;

