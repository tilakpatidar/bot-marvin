//https://wiki.apache.org/tika/TikaJAXRS
var exec = require('child_process').exec;
var fs = require('fs');
var request = require('request');
var colors = require('colors');
var config=require("./config/config").load();
var app={
	"startServer":function(){
		exec('java -jar ./lib/tika-server-1.11.jar -h '+config["tika_host"], function(error, stdout, stderr) {
			console.log("[SUCCESS] Tika server started".green);
		    if (error !== null) {
		        console.log('[INFO] Server is already running'.yellow);
		    }
		});
	},
	"submitFile":function(url,callback){
		try{
			var err;
			//main function of the module
			app.addFileToStore(url,function(){
				console.log(("[SUCCESS] File "+url+" added to store").green);
				app.extractText(url,function(body){
					app.removeFile(url,function(){
						console.log(("[SUCCESS] File "+url+" removed from store").green);
						callback(err,body);
					});
				})
				
			});
		}
		catch(err){
				callback(err,null);
		}

		
	},
	"addFileToStore":function(url,callback){

  	   request({uri: url}).pipe(fs.createWriteStream(app.getFileName(url))).on('close',callback);
	},
	"removeFile":function(url,cal,sdfs){
		fs.unlink(app.getFileName(url),cal);
	
	},
	"extractText":function(url,callback){
		var source = fs.createReadStream(app.getFileName(url));
		var dic={};
		source.pipe(request.put({url:'http://'+config["tika_host"]+':'+config['tika_port']+'/tika',headers: {'Accept': 'text/plain'}},function(err, httpResponse, body){
			dic["text"]=body;
			source = fs.createReadStream(app.getFileName(url));
			source.pipe(request.put({url:'http://'+config["tika_host"]+':'+config['tika_port']+'/meta',headers: {'Accept': 'application/json'}},function(err1, httpResponse1, body1){
				dic["meta"]=JSON.parse(body1);
				callback(dic);
			}));
		}));

	},
	"getFileName":function(url){
		return __dirname+"/pdf-store/"+url.replace(/\//gi,"##");
	}

};
exports.init=app;