//https://wiki.apache.org/tika/TikaJAXRS
var proto=require(__dirname+'/lib/proto.js');
process.getAbsolutePath=proto.getAbsolutePath;
var exec = require('child_process').exec;
var fs = require('fs');
var request = require('request');
var log=require(__dirname+"/lib/logger.js");
var config=require(__dirname+"/lib/config-reloader.js");
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(__dirname+'/db/sqlite/tika_queue');
db.serialize(function() {
	db.run("CREATE TABLE IF NOT EXISTS q (id INTEGER PRIMARY KEY AUTOINCREMENT,fileName TEXT UNIQUE,parseFile TEXT,status INTEGER)");
});
var queue={
	enqueue:function (fileName,parseFile,fn){
		db.serialize(function() {
			db.run("INSERT INTO q(fileName,parseFile,status) VALUES(?,?,0)",[fileName,parseFile],function(err,row){
				//console.log(err+"pushQ");
				//console.log(JSON.stringify(row)+"pushQ");
				fn(row);
			});
		});

	},
	dequeue:function (fn,num){

		if(num===undefined){
			num=1;
		}
		var li=[];
		var done=0;
			db.serialize(function() {
				db.each("SELECT * FROM q WHERE status=0 LIMIT 0,"+num,function(err,row){
					//console.log(row);
					db.run("UPDATE q SET status=1 WHERE id=?",[row.id],function(e,r){

						li.push({fileName:row.fileName,parseFile:row.parseFile,uid:row.id});
						++done;
						if(done===num){
							fn(li);
						}

					});//mark as under process
					
					
				});
			});
		
		

	},
	remove:function (idd,fn){
		db.serialize(function() {
			db.run("DELETE FROM q WHERE id=?",[idd],function(err,row){
					//console.log(err+"QLength");
					//console.log(JSON.stringify(row)+"QLength");
					fn(err,row);
				});
			});
	},
	length:function (fn){
		db.serialize(function() {
			db.each("SELECT COUNT(*) AS `c` FROM q WHERE status=0",function(err,row){
				//console.log(err+"QLength");
				//console.log(JSON.stringify(row)+"QLength");
				fn(row.c);
			});
		});
	}

}




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
			var err;
			//main function of the module
			app.addFileToStore(url,function(err1){
				
				if(err1){
					err="tikaDownloadFailed";
					callback(err,null);
					return;
				}
				log.put(("[SUCCESS] File "+url+" added to store"),"success");
				app.extractText(url,function(err2,body){
					//console.log(err2);
					if(err2){
						err="tikaExtractFailed";
						callback(err,null);
						return;
					}
					app.removeFile(url,function(err3){
						//console.log(err3);
						if(err3){
							err="tikaRemoveDownloadedFailed";
							callback(err,null);
							return;
						}
						log.put(("[SUCCESS] File "+url+" removed from store"),"success");
						callback(err,body);
					});
				})
				
			});
		

		
	},
	"addFileToStore":function(url,callback){
		var st=fs.createWriteStream(app.getFileName(url)).on('error',function(err){
				
				callback("error here");
		});
			request({uri: url}).on('error',function(err){
				
				callback("error here");

			}).pipe(st).on('error',function(err){
				
				callback("error here");
			}).on('close',function(err){
				if(!err){
					callback(null);
				}
				
			});
		
	
  	   
	},
	"removeFile":function(url,cal){
		
			fs.unlink(app.getFileName(url),function(err){
			
				if(err){
					cal("error here");
				}
				else{
					cal(null);
				}
			});
				
		
	
	},
	"extractText":function(url,callback){
		var errr;
		try{
			var source = fs.createReadStream(app.getFileName(url));
			source.on('error',function(err){
				
					callback("error here",{});
			});
			var dic={};
			source.pipe(request.put({url:'http://'+config.getConfig("tika_host")+':'+config.getConfig('tika_port')+'/tika',headers: {'Accept': 'text/plain'}},function(err, httpResponse, body){
				dic["text"]=body;
				source = fs.createReadStream(app.getFileName(url)).on('error',function(err){
				
						callback("error here",{});
				});;
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
			})).on('error',function(err){
				
					callback("error here",{});
			});
		}catch(err){
			errr=err;
			callback(errr,{});
		}
		
		

	},
	"processNext":function(){
		if(active>=config.getConfig('tika_batch_size')){
			return;//if greater than batch size leave
		}
		var expected=(config.getConfig('tika_batch_size')-active);
			active+=(config.getConfig('tika_batch_size')-active);//mark active before even initializing
			queue.length(function(len){
			//console.log(len+"LENGTH");
			if(len!==0){
				
					queue.dequeue(function(li){
						if(li.length!==expected){
							active-=(expected-li.length);//reducing if less items are recieved
						}
						for (var i = li.length - 1; i >= 0; i--) {
							var obj=li[i];
								(function(fileName,parseFile,uniqueId){
									try{
											tika.submitFile(fileName,function(err,body){
												//console.log(err);
												//console.log(body);
											if(err){
												log.put("error from fetchFile for "+fileName,"error");
												process.send({"bot":"tika","setCrawled":[fileName,{},err]});
											}else{
												//console.log(body);
												var parser=require(__dirname+"/parsers/"+parseFile);
												var dic=parser.init.parse(body,fileName);//pluggable parser
												log.put("fetchFile for "+fileName,"success");
												process.send({"bot":"tika","setCrawled":[fileName,dic[1],200]});

											}
											
												
											});
									}
									catch(err){
										log.put("error from fetchFile for "+fileName,"error");
										process.send({"bot":"tika","setCrawled":[fileName,{},"tikaUnknownError"]});
										
									}
									finally{
										active-=1;
										queue.remove(uniqueId,function(err,row){
										//	console.log(row);
										});
											
									
										setImmediate(function(){
											tika.processNext();
										});	
									}


								})(obj.fileName,obj.parseFile,obj.uid);
						};
					
						
						


				},expected);//[[],[]]

				
				
					
			}
			else{
				//if len is 0 then decrement the active counter
				active-=(config.getConfig('tika_batch_size')-active);
			}
			});
		
		
		
	},
	"getFileName":function(url){
		return __dirname+"/pdf-store/"+url.replace(/\//gi,"##");
	}

};
exports.init=app;
var active=0;
if(require.main === module){
	var tika=app;
	tika.startServer();
	 var http = require("http");
	 var url=require("url");
	 var server = http.createServer(function(request, response) {
	    var url_parts = url.parse(request.url.toString(),true);
        var fileName=url_parts.query.fileName;
        var parseFile=url_parts.query.parseFile;
        queue.enqueue(fileName,parseFile,function(row){
        	//console.log(fileName+"PUSHED");
        	log.put("Tika Got request for "+fileName+" with parse file "+parseFile,"info");
	        tika.processNext();
	        
	        
	        response.end();
        });
        

  });
	 server.on("listening",function(){
	 	log.put("TIka server is listening","success");
	 });
server.listen(2030);
server.on("error",function(e){
	//console.log(e);
	if(e.code==="EADDRINUSE"){
		log.put("Tika port occupied maybe an instance is already running ","error");
	}

});
  
}
