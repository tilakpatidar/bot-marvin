//https://wiki.apache.org/tika/TikaJAXRS
var exec = require('child_process').exec;
var fs = require('fs');
var request = require('request');
var log=require(__dirname+"/lib/logger.js");
var config=require(__dirname+"/lib/config-reloader.js");
var app={
	"startServer":function(){
		exec('java -jar '+__dirname+'/lib/tika-server-1.11.jar -h '+config.getConfig("tika_host"), function(error, stdout, stderr) {
			log.put("[SUCCESS] Tika server started","success");
		    if (error !== null) {
		        log.put('[INFO] Server is already running',"info");
		    }
		});
	},
	"submitFile":function(url,callback){
		try{
			var err;
			//main function of the module
			app.addFileToStore(url,function(){
				log.put(("[SUCCESS] File "+url+" added to store"),"success");
				app.extractText(url,function(err,body){
					app.removeFile(url,function(){
						log.put(("[SUCCESS] File "+url+" removed from store"),"success");
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
		source.pipe(request.put({url:'http://'+config.getConfig("tika_host")+':'+config.getConfig('tika_port')+'/tika',headers: {'Accept': 'text/plain'}},function(err, httpResponse, body){
			dic["text"]=body;
			source = fs.createReadStream(app.getFileName(url));
			source.pipe(request.put({url:'http://'+config.getConfig("tika_host")+':'+config.getConfig('tika_port')+'/meta',headers: {'Accept': 'application/json'}},function(err1, httpResponse1, body1){
				var err=null;
				try{
					log.put("tika.extractText for "+url,"success");
					dic["meta"]=JSON.parse(body1);
					callback(err,dic);
				}catch(err){
					log.put("tika.extractText for "+url,"error");
					callback(err,dic);
				}
				
			}));
		}));

	},
	"processNext":function(){
		if(queue.length!==0){
			underProcess=true;
			var item=queue.splice(0,1);//dequeue
			var filename=item[0][0];
			var parseFile=item[0][1];
			tika.submitFile(filename,function(err,body){
				if(err){
						log.put("error from fetchFile for "+filename,"error");
						process.send({"bot":"tika","setCrawled":[filename,{},"tikaError"]});
				}else{
						var parser=require(__dirname+"/parsers/"+parseFile);
						var dic=parser.init.parse(body,filename);//pluggable parser
						log.put("fetchFile for "+filename,"success");
						process.send({"bot":"tika","setCrawled":[filename,dic,200]});

					}
					underProcess=false;

					
					
						setImmediate(function(){
							tika.processNext(filename,parseFile);
						});

					
					
					
					
			});
		}
	},
	"getFileName":function(url){
		return __dirname+"/pdf-store/"+url.replace(/\//gi,"##");
	}

};
exports.init=app;
var queue=[];
var underProcess=false;
if(require.main === module){
	var tika=app;
	tika.startServer();
	 var http = require("http");
	 var url=require("url");
	 var server = http.createServer(function(request, response) {
	    var url_parts = url.parse(request.url.toString(),true);
        var filename=url_parts.query.fileName;
        var parseFile=url_parts.query.parseFile;
        queue.push([filename,parseFile]);
        log.put("Tika Got request for "+filename+" with parse file "+parseFile,"info");
        if(!underProcess){
        	tika.processNext();
        }
        
        response.end();

  });
	 server.on("listening",function(){
	 	log.put("TIka server is listening","success");
	 });
server.listen(2030);
server.on("error",function(e){
	if(e.code==="EADDRINUSE"){
		log.put("Tika port occupied maybe an instance is already running ","error");
	}

});
  
}