//https://wiki.apache.org/tika/TikaJAXRS
var proto=require(__dirname+'/lib/proto.js');
process.getAbsolutePath=proto.getAbsolutePath;
var exec = require('child_process').exec;
var fs = require('fs');
var request = require('request');
var check=require("check-types");
var log=require(__dirname+"/lib/logger.js");
var config=require(__dirname+"/lib/config-reloader.js");
var separateReqPool = {maxSockets: config.getConfig("tika_max_sockets_per_host")};
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(__dirname+'/db/sqlite/tika_queue');
db.serialize(function() {
	db.run("CREATE TABLE IF NOT EXISTS q (id INTEGER PRIMARY KEY AUTOINCREMENT,fileName TEXT UNIQUE,parseFile TEXT,status INTEGER)");
});
var queue={
	enqueue:function (fileName,parseFile,fn){
		db.serialize(function() {
			db.run("INSERT OR IGNORE INTO q(fileName,parseFile,status) VALUES(?,?,0)",[fileName,parseFile],function(err,row){
				//console.log(err+"pushQ");
				//console.log(JSON.stringify(row)+"pushQ");
				fn(row);
			});
		});

	},
	dequeue:function (fn,num){

		if(!check.assigned(num)){
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
		    if (check.assigned(error)) {
		        log.put('[INFO] Server is already running',"info");
		    }
		});
	},
	"submitFile":function(url,callback){
			var err;
			//main function of the module
			app.addFileToStore(url,function(err1){
				
				if(err1){
					if(err1==="error"){
						err="tikaDownloadFailed";
					}else{
						err=err1;
					}
					
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
				
				callback("TikeFileStreamError");
		});
			var req=request({uri: url,pool:separateReqPool});
			var done_len=0;
			var init_time=new Date().getTime();
			req.on("response",function(res){
				var len = parseInt(res.headers['content-length'], 10);
				if(!check.assigned(len) || !check.number(len)){
					len=0;
				}
				if(len>config.getConfig("tika_content_length")){
						log.put("content-length is more than specified","error");
						callback("TikaContentOverflow");
						
						return;
				}
				res.on("data",function(chunk){
					done_len+=chunk.length;
				 	var t=new Date().getTime();
				 	if((t-init_time)>config.getConfig("tika_timeout")){
				 		//console.log((t-init_time)+"ContentTimeOut");
						log.put("Connection timedout change tika_timeout setting in config","error");
						callback("TikaContentTimeout");
						return;
				 	}
				 	if(done_len>config.getConfig("tika_content_length")){
						//console.log(done_len+"ContentOverflowTka");
						log.put("content-length is more than specified","error");
						callback("TikaContentOverflow");
						return;
					}
				});
					res.on('error',function(err){
									
						callback("TikaDownloadFailed");

					}).pipe(st).on('error',function(err){
						
						callback("TikaFileStoreWriteError");
					}).on('close',function(err){
						if(!err){
							callback(null);
						}
						
					});
			});
			
		
	
  	   
	},
	"removeFile":function(url,cal){
		
			fs.unlink(app.getFileName(url),function(err){
			
				if(err){
					cal("TikaStoreRemoveError");
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
				
					callback("TikaFileStoreReadError",{});
			});
			var dic={};
			source.pipe(request.put({url:'http://'+config.getConfig("tika_host")+':'+config.getConfig('tika_port')+'/tika',headers: {'Accept': 'text/plain'}},function(err, httpResponse, body){
				dic["text"]=body;
				source = fs.createReadStream(app.getFileName(url)).on('error',function(err){
				
						callback("TikaFileStoreReadError",{});
				});;
				source.pipe(request.put({url:'http://'+config.getConfig("tika_host")+':'+config.getConfig('tika_port')+'/meta',headers: {'Accept': 'application/json'}},function(err1, httpResponse1, body1){
					var err=null;
					try{
						log.put("tika.extractText for "+url,"success");
						dic["meta"]=JSON.parse(body1);
						callback(err,dic);
					}catch(err){
						err="TikaServerResponseError";
						log.put("tika.extractText for "+url,"error");
						callback(err,dic);
					}
					
				}));
			})).on('error',function(err){
				
					callback("TikaServerResponseError",{});
			});
		}catch(err){
			callback("TikaExtractFailed",{});
		}
		
		

	},
	"processNext":function(){
		if(busy){
			return;
		}
		busy=true;
				
					queue.dequeue(function(li){
						//console.log(li);
						if(li.length===0){
							busy=false;
							setImmediate(function(){tika.processNext();});
							return;
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
										
										queue.remove(uniqueId,function(err,row){
										//	console.log(row);
										});
										busy=false;
										setImmediate(function(){tika.processNext();});
											
									
									}


								})(obj.fileName,obj.parseFile,obj.uid);
						};
					
						
						


				},config.getConfig("tika_batch_size"));//[[],[]]

				
				
					
		
		
		
		
	},
	"getFileName":function(url){
		return __dirname+"/pdf-store/"+url.replace(/\//gi,"##");
	}

};
exports.init=app;
var busy=false;
var tika=app;
if(require.main === module){
	tika.startServer();
	process.on("message",function(data){
		//console.log(data);
		if(data[0]==="ping"){
			//console.log(data[0])
			//occasional pings to keep queue working
			tika.processNext();
			return;
		}
	        queue.enqueue(data[0],data[1],function(row){
	        	//console.log(fileName+"PUSHED");
	        	log.put("Tika Got request for "+data[0]+" with parse file "+data[1],"info");
		        tika.processNext();
		     
	        });

	});

 

}
