//https://wiki.apache.org/tika/TikaJAXRS
var proto=require(__dirname+'/lib/proto.js');
process.getAbsolutePath=proto.getAbsolutePath;
var exec = require('child_process').exec;
var fs = require('fs');
var request = require('request');
var check=require("check-types");
var log;
var config=require(__dirname+"/lib/spawn_config.js");
var color_debug;
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(__dirname+'/db/sqlite/tika_queue');
var separateReqPool;
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
		var d=exec('java -jar '+__dirname+'/lib/tika-server-1.11.jar -h '+config.getConfig("tika_host"), function(error, stdout, stderr) {
			log.put("[SUCCESS] Tika server started","success");
		    if (check.assigned(error)) {
		    	log.put(error.stack,color_debug);
		        log.put('[INFO] Server is already running',"info");
		    }
		});
		try{
			process.send({"tikaPID":d.pid});
		}catch(e){
			log.put(e.stack,color_debug);
		}
		
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
					
					return callback(err,null);
				}
				log.put(("[SUCCESS] File "+url+" added to store"),"success");
				app.extractText(url,function(err2,body){
					//console.log(err2);
					if(err2){
						err="tikaExtractFailed";
						return callback(err,null);
					}
					app.removeFile(url,function(err3){
						//console.log(err3);
						if(err3){
							err="tikaRemoveDownloadedFailed";
							return callback(err,null);
						}
						log.put(("[SUCCESS] File "+url+" removed from store"),"success");
						callback(err,body);
					});
				})
				
			});
		

		
	},
	"addFileToStore":function(url,callback){
		var st=fs.createWriteStream(app.getFileName(url)).on('error',function(err){
				log.put(err.stack,color_debug);
				callback("TikeFileStreamError");
		});
			var req=request({uri: url,pool:separateReqPool,headers:config.getConfig("http","headers")});
			var done_len=0;
			var init_time=new Date().getTime();
			req.on("response",function(res){
				var len = parseInt(res.headers['content-length'], 10);
				if(!check.assigned(len) || !check.number(len)){
					len=0;
				}
				if(len>config.getConfig("tika_content_length")){
						log.put("content-length is more than specified","error");
						return callback("TikaContentOverflow");
				}
				res.on("data",function(chunk){
					done_len+=chunk.length;
				 	var t=new Date().getTime();
				 	if((t-init_time)>config.getConfig("tika_timeout")){
				 		//console.log((t-init_time)+"ContentTimeOut");
						log.put("Connection timedout change tika_timeout setting in config","error");
						return callback("TikaContentTimeout");
				 	}
				 	if(done_len>config.getConfig("tika_content_length")){
						//console.log(done_len+"ContentOverflowTka");
						log.put("content-length is more than specified","error");
						return callback("TikaContentOverflow");
					}
				});
					res.on('error',function(err){
						log.put(err.stack,color_debug);
						callback("TikaDownloadFailed");

					}).pipe(st).on('error',function(err){
						log.put(err.stack,color_debug);
						callback("TikaFileStoreWriteError");
					}).on('close',function(err){
						if(!err){
							callback(null);
						}else{
							log.put(err.stack,color_debug);
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
					log.put(err.stack,color_debug);
					callback("TikaFileStoreReadError",{});
			});
			var dic={};
			source.pipe(request.put({url:'http://'+config.getConfig("tika_host")+':'+config.getConfig('tika_port')+'/tika',headers: {'Accept': 'text/plain'}},function(err, httpResponse, body){
				//console.log(body)
				dic["text"]=body;
				source = fs.createReadStream(app.getFileName(url)).on('error',function(err){
						log.put(err.stack,color_debug);
						callback("TikaFileStoreReadError",{});
				});;
				source.pipe(request.put({url:'http://'+config.getConfig("tika_host")+':'+config.getConfig('tika_port')+'/meta',headers: {'Accept': 'application/json'}},function(err1, httpResponse1, body1){
					var err=null;
					try{
						log.put("tika.extractText for "+url,"success");
						//unexpected end of input error here check it please
						//console.log(body1)
						dic["meta"]=JSON.parse(body1);
						callback(err,dic);
					}catch(err){
						log.put(err.stack,color_debug);
						err="TikaServerResponseError";
						log.put("tika.extractText for "+url,"error");
						callback(err,dic);
					}
					
				}));
			})).on('error',function(err){
					log.put(err.stack,color_debug);
					callback("TikaServerResponseError",{});
			});
		}catch(err){
			log.put(err.stack,color_debug);
			callback("TikaExtractFailed",{});
		}
		
		

	},
	"processNext":function(){
		if(busy){
			return;
		}
		queue.length(function(count){
			if(check.assigned(count) && count!==0){
				busy=true;
				queue.dequeue(function(li){
				//console.log(li);
				if(li.length===0){
					busy=false;
					return setImmediate(function(){tika.processNext();});
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
										try{
											process.send({"bot":"tika","setCrawled":[fileName,{},err]});
										}catch(errr){
											log.put(errr.stack,color_debug);
										}
										
									}else{
										//console.log(body);
										var parser=require(__dirname+"/parsers/"+parseFile);
										var dic=parser.init.parse(body,fileName);//pluggable parser
										log.put("fetchFile for "+fileName,"success");
										try{
											process.send({"bot":"tika","setCrawled":[fileName,dic[1],200]});
										}catch(e){
											log.put(e.stack,color_debug);
										}
										

									}
									
										
									});
							}
							catch(err){
								log.put("error from fetchFile for "+fileName,"error");
								try{
									process.send({"bot":"tika","setCrawled":[fileName,{},"tikaUnknownError"]});

								}catch(e){
									log.put(e.stack,color_debug);
								}
								
								
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

				
				
			}
			return;

		})
		
				
			
					
		
		
		
		
	},
	"getFileName":function(url){
		return __dirname+"/pdf-store/"+url.replace(/\//gi,"##");
	}

};
exports.init=app;
var busy=false;
var tika=app;
if(require.main === module){
	
	process.on("message",function(data){
		//console.log(data);
		var key=Object.keys(data)[0];
		if(key==="ping"){
			//console.log(data[0])
			//occasional pings to keep queue working
			return tika.processNext();
		}else if(key==="init"){
			//making init ready
			var o=data[key];
			config=config.init(o[0],o[1],o[2]);
			process.bot_config=config;
			var co=config.getConfig("tika_debug");
			if(co){
				color_debug="error";
			}else{
				color_debug="no_verbose";
			}
			log=require(__dirname+"/lib/logger.js");
			separateReqPool = {maxSockets: config.getConfig("tika_max_sockets_per_host")};
			tika.startServer();
		}else if(key==="tika"){
			var d=data["tika"];
			//console.log(d)
			queue.enqueue(d[0],d[1],function(row){
	        	//console.log(fileName+"PUSHED");
	        	log.put("Tika Got request for "+d[0]+" with parse file "+d[1],"info");
		        tika.processNext();
		     
	        });
		}
	        

	});

 

}
