//https://wiki.apache.org/tika/TikaJAXRS
var proto=require(__dirname+'/lib/proto.js');
process.getAbsolutePath=proto.getAbsolutePath;
var exec = require('child_process').exec;
var URL=require(__dirname+"/lib/url.js");
var fs = require('fs');
var request = require('request');
var check=require("check-types");
var log;
var config=require(__dirname+"/lib/spawn_config.js");
var color_debug;
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(__dirname+'/db/sqlite/tika_queue');
var tika_f_db = new sqlite3.Database(__dirname+'/db/sqlite/tika_f_queue');
var separateReqPool;
db.serialize(function() {
	db.run("CREATE TABLE IF NOT EXISTS q (id INTEGER PRIMARY KEY AUTOINCREMENT,fileName TEXT UNIQUE,parseFile TEXT,status INTEGER)");
});
tika_f_db.serialize(function() {
	tika_f_db.run("CREATE TABLE IF NOT EXISTS q (id INTEGER PRIMARY KEY AUTOINCREMENT,content TEXT)");
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
	remove:function (idd){
		db.parallelize(function() {
			db.run("DELETE FROM q WHERE id=?",[idd],function(err,row){
					//console.log(err+"QLength");
					//console.log(JSON.stringify(row)+"QLength");
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
		//first kill an old instance of tika if exists
		var pid = "";
			try{
					pid=fs.readFileSync(__dirname+"/db/sqlite/tikaPID.txt").toString();
					log.put("Trying to kill an old instance of tika if active","info");
			}catch(err){
				//if file not exists
					//touch file if not exists
					var stream=fs.createWriteStream(__dirname+"/db/sqlite/tikaPID.txt");
					stream.write("");
					stream.end();
			}
		
		
		try{
			if(pid !== ""){
				process.kill(parseInt(pid));
			}
			
		}
		catch(err){
			if(err.code === "ESRCH"){
				//cannot reach the process by the pid
				//maybe process is already killed
				log.put("Old tika instance was already killed","info");
				log.put("Reset tika pid file","info");
				var stream=fs.createWriteStream(__dirname+"/db/sqlite/tikaPID.txt");
				stream.write("");
				stream.end();
			}else{
				log.put(err.stack,color_debug,err.type);
			}
			
		}
		var d=exec('java -jar '+__dirname+'/lib/tika-server-1.11.jar -h '+config.getConfig("tika_host"), function(error, stdout, stderr) {
			log.put("[SUCCESS] Tika server started","success");
		    if (check.assigned(error)) {
		    	log.put(error.stack,color_debug);
		        log.put('Server is already running',"info");
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
				return callback("TikeFileStreamError");
		});
			var req=request({uri: url,pool:separateReqPool,headers:config.getConfig("tika_headers")});
			var done_len=0;
			var init_time=new Date().getTime();
			req.on("response",function(res){
				var len = parseInt(res.headers['content-length'], 10);
				if(!check.assigned(len) || !check.number(len)){
					len=0;
				}
				if(len>config.getConfig("tika_content_length")){
						log.put("content-length is more than specified","error");
						res.emit('error',"TikaContentOverflow");
				}
				res.on("data",function(chunk){
					done_len+=chunk.length;
				 	var t=new Date().getTime();
				 	if((t-init_time)>config.getConfig("tika_timeout")){
				 		//console.log((t-init_time)+"ContentTimeOut");
						log.put("Connection timedout change tika_timeout setting in config","error");
						res.emit('error',"TikaContentTimeout");
				 	}
				 	if(done_len>config.getConfig("tika_content_length")){
						//console.log(done_len+"ContentOverflowTka");
						log.put("content-length is more than specified","error");
						res.emit('error',"TikaContentOverflow");
					}
				});
					res.on('error',function(err){
						var msg = err;
						if(msg === "TikaContentOverflow" || msg === "TikaContentTimeout"){
							return callback(err);
						}else{
							log.put(err.stack,color_debug);
							return callback("TikaDownloadFailed");	
						}
						


					}).pipe(st).on('error',function(err){
						log.put(err.stack,color_debug);
						return callback("TikaFileStoreWriteError");
					}).on('close',function(err){
						if(!err){
							return callback(null);
						}else{
							log.put(err.stack,color_debug);
							return callback(err);
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
		if(process.busy){
			return;
		}
		process.busy = true;
		process.last_lock_time = new Date().getTime();
		try{
				queue.length(function(count){
					if(!check.assigned(count)){
						process.busy =false;
						return;
					}
					if(check.assigned(count) && count!==0){
						process.busy=true;
						process.last_lock_time = new Date().getTime();
						try{
							queue.dequeue(function(li){
								//console.log(li);
								if(!check.assigned(li)){
									process.busy =false;
									return;
								}
								if(check.assigned(li) && li.length===0){
									process.busy=false;
									return;
								}
								var done = 0;
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
																var link = URL.url(fileName);
																link.setStatusCode(err);
																link.setParsed({});
																link.setResponseTime(0);
																link.setContent({});
																(function(link){
																	tika_f_db.parallelize(function() {
																		tika_f_db.run("INSERT OR IGNORE INTO q(content) VALUES (?)",[JSON.stringify(link.details)],function(err,row){
																			//console.log(err+"QLength");
																			//console.log(JSON.stringify(row)+"QLength");
																			log.put('Tika doc dumped for indexing','info');
																		});
																	});

																})(link);
															}catch(errr){
																log.put(errr.stack,color_debug);
															}
															
														}else{
															//console.log(body);
															var parser=require(__dirname+"/parsers/"+parseFile);
															var dic=parser.init.parse(body,fileName);//pluggable parser
															log.put("fetchFile for "+fileName,"success");
															try{
																var link = URL.url(fileName);
																link.setStatusCode(200);
																link.setParsed(dic[1]);
																link.setResponseTime(0);
																link.setContent(dic[3]);
																(function(link){
																	tika_f_db.parallelize(function() {
																		tika_f_db.run("INSERT OR IGNORE INTO q(content) VALUES (?)",[JSON.stringify(link.details)],function(err,row){
																			//console.log(err+"QLength");
																			//console.log(JSON.stringify(row)+"QLength");
																			log.put('Tika doc dumped for indexing','info');
																		});
																	});

																})(link);
															}catch(e){
																log.put(e.stack,color_debug);
															}
															

														}
														
														
													});
											}
											catch(err){
												log.put("error from fetchFile for "+fileName,"error");
												try{
													var link = URL.url(fileName);
													link.setStatusCode("tikaUnknownError");
													link.setParsed({});
													link.setResponseTime(0);
													link.setContent({});
													(function(link){
															tika_f_db.parallelize(function() {
																tika_f_db.run("INSERT OR IGNORE INTO q(content) VALUES (?)",[JSON.stringify(link.details)],function(err,row){
																		//console.log(err+"QLength");
																		//console.log(JSON.stringify(row)+"QLength");
																		log.put('Tika doc dumped for indexing','info');
																	});
															});

													})(link);


												}catch(e){
													log.put(e.stack,color_debug);
												}
												
												
											}
											finally{
												++done;
												if(done === li.length){
													log.put("Tika batch completed",'success');
													process.busy=false;
												}
												
												queue.remove(uniqueId);
												
													
											
											}


										})(obj.fileName,obj.parseFile,obj.uid);
								};

							},config.getConfig("tika_batch_size"));//[[],[]]
						}catch(e){
							process.busy = false;
						}


						
						
					}
					return;

				});
		}catch(e){
			process.busy = false;
		}

		
				
			
					
		
		
		
		
	},
	"getFileName":function(url){
		return __dirname+"/pdf-store/"+url.replace(/\//gi,"##");
	}

};
process.last_lock_time = new Date().getTime();
function failSafe(){
	if((new Date().getTime() - process.last_lock_time) >=(1000*60*10)){ //10 min check
		log.put("Unlocking tika queue",'info');
		process.busy = false;

	}
}


exports.init=app;
process.busy=false;
var tika=app;
if(require.main === module){
	
	process.on("message",function(data){
		//console.log(data);
		var key=Object.keys(data)[0];

		if(key==="init"){
			//making init ready
			var o=data[key];
			config=config.init(o[0],o[1],o[2]);
			regex_urlfilter = {};
			regex_urlfilter["accept"]=config.getConfig("accept_regex");
			regex_urlfilter["reject"]=config.getConfig("reject_regex");
			URL.init(config, regex_urlfilter);
			process.bot_config=config;
			var co=config.getConfig("tika_debug");
			if(co){
				color_debug="error";
			}else{
				color_debug="no_verbose";
			}
			log=require(__dirname+"/lib/logger.js");


			var files=fs.readdirSync(__dirname+'/pdf-store/');
			for (var i = 0; i < files.length; i++) {
				if(files[i].indexOf(".")===0){
					//do not take hidden files
					continue;
				}
				var data=fs.unlinkSync(__dirname+'/pdf-store/'+files[i]);
			};
			db.serialize(function(){
				db.run("UPDATE q SET status=0 WHERE status=?",[1],function(e,r){
					log.put("pdf-store queue sqlite reverted","success");
				});	
		
			});
			log.put("pdf-store cache reset","success");
			separateReqPool = {maxSockets: config.getConfig("tika_max_sockets_per_host")};
			tika.startServer();
		}
	        

	});

 setInterval(tika.processNext,1000);
 setInterval(failSafe,1000);

}
