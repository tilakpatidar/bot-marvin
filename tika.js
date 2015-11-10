var exec = require('child_process').exec;
var fs = require('fs');
var request = require('request');
var app={
	"startServer":function(){
		exec('java -jar ./lib/tika-server-1.11.jar -h 0.0.0.0', function(error, stdout, stderr) {
			console.log("[INFO] Tika server started");
		    if (error !== null) {
		        console.log('[INFO] Server is already running]');
		    }
		});
	},
	"submitFile":function(url,callback){
		app.addFileToStore(url,function(){
			console.log("[INFO] File "+url+" added to store");
			app.extractText(url,function(body){
				app.removeFile(url,function(){
					console.log("[INFO] File "+url+" removed from store");
					callback(body);
				});
			})
			
		});
		
	},
	"addFileToStore":function(url,callback){

  	   request({uri: url}).pipe(fs.createWriteStream(app.getFileName(url))).on('close',callback);
	},
	"removeFile":function(url,cal,sdfs){
		fs.unlink(app.getFileName(url),cal);
	
	},
	"extractText":function(url,callback){
		var source = fs.createReadStream(app.getFileName(url));
		source.pipe(request.put({url:'http://localhost:9998/tika',headers: {'Accept': 'text/plain'}},function(err, httpResponse, body){

			callback(body);
		}));

	},
	"getFileName":function(url){
		return "./pdf-store/"+url.replace(/\//gi,"#");
	}

};
exports.init=app;