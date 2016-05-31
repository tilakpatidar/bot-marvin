//https://wiki.apache.org/tika/TikaJAXRS
var proto=require(__dirname+'/lib/proto.js');
process.getAbsolutePath=proto.getAbsolutePath;
process.http_proxy = "";
process.https_proxy = "";
var exec = require('child_process').exec;
var URL=require(__dirname+"/lib/url.js");
var fs = require('fs');
var request = require('request');
var check=require("check-types");
var log;
var crypto = require('crypto');
var config=require(__dirname+"/lib/spawn_config.js");
var color_debug;
var MongoClient = require('mongodb').MongoClient;
var db;
var tika_queue;
var tika_f_queue;
var separateReqPool;
var queue={
	dequeue:function (fn,num){
		var done = 0;
		var li=[];
		tika_queue.find({"status":0}, {limit: num}).toArray(function(err,docs){
			if(check.assigned(err) || !check.assigned(docs)){
				return fn([]);
			}
			for(var index in docs){
				var doc = docs[index];
				(function(doc){
					tika_queue.update({"_id":doc["_id"]},{"$set":{status :1}},function(e){
						//console.log(e);
						if(check.assigned(doc) && check.assigned(doc.fileName) && check.assigned(doc.parseFile) && check.assigned(doc.status) && check.assigned(doc.link_details)){
							li.push(doc);
						}
						++done;
						if(done === docs.length){
							return fn(li);
						}
					});
				})(doc);
			}
		});
/*
		if(!check.assigned(num)){
			num=1;
		}
		var li=[];
		var done=0;
			db.parallelize(function() {
				db.each("SELECT * FROM q WHERE status=0 LIMIT 0,"+num,function(err,row){
					//console.log(row);
					db.run("UPDATE q SET status=1 WHERE id=?",[row.id],function(e,r){

						li.push({fileName:row.fileName,parseFile:row.parseFile,uid:row.id,link_details:JSON.parse(row.link_details)});
						++done;
						if(done===num){
							fn(li);
						}

					});//mark as under process
					
					
				});
			});
		
		
		tika_queue.findAndModify({status: 0},{status :1},{multi: true},function(err,docs){
			fn(docs);
		});
		*/
	},
	remove:function (idd){
		tika_queue.removeOne({_id: idd},function(){

		});
	}

}




var app={
	"startServer":function startServer(){
		//first kill an old instance of tika if exists
		var pid = "";
			try{
					pid=fs.readFileSync(__dirname+"/db/sqlite/tikaPID.txt").toString();
					msg("Trying to kill an old instance of tika if active","info");
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
				msg("Old tika instance was already killed","info");
				msg("Reset tika pid file","info");
				var stream=fs.createWriteStream(__dirname+"/db/sqlite/tikaPID.txt");
				stream.write("");
				stream.end();
			}else{
				msg(err.stack,color_debug,err.type);
			}
			
		}
		var d=exec('java -jar '+__dirname+'/lib/tika-server-1.11.jar -h '+config.getConfig("tika_host"), function tika_jar_exec(error, stdout, stderr) {
			msg("[SUCCESS] Tika server started","success");
		    if (check.assigned(error)) {
		    	msg(error.stack,color_debug);
		        msg('Server is already running',"info");
		    }
		});
		try{
			process.send({"tikaPID":d.pid});
		}catch(e){
			msg(e.stack,color_debug);
		}
		
	},
	"submitFile":function submitFile(url,callback){
			var err;
			//main function of the module
			app.addFileToStore(url,function addFileToStore1(err1){
				
				if(err1){
					if(err1==="error"){
						err="tikaDownloadFailed";
					}else{
						err=err1;
					}
					
					return callback(err,null);
				}
				msg(("[SUCCESS] File "+url+" added to store"),"success");
				app.extractText(url,function extractText1(err2,body){
					//console.log(err2);
					if(err2){
						err="tikaExtractFailed";
						return callback(err,null);
					}
					app.removeFile(url,function removeFile1(err3){
						//console.log(err3);
						if(err3){
							err="tikaRemoveDownloadedFailed";
							return callback(err,null);
						}
						msg(("[SUCCESS] File "+url+" removed from store"),"success");
						callback(err,body);
					});
				})
				
			});
		

		
	},
	"addFileToStore":function addFileToStore(url,callback){
		var st=fs.createWriteStream(app.getFileName(url)).on('error',function fsstream_addfilestore(err){
				msg(err.stack,color_debug);
				return callback("TikeFileStreamError");
		});
		//console.log(url,"tika");
			var req=request({uri: url,pool:separateReqPool,headers:config.getConfig("tika_headers")});
			var done_len=0;
			var init_time=new Date().getTime();
			req.on("response",function res_on_response(res){
				var len = parseInt(res.headers['content-length'], 10);
				if(!check.assigned(len) || !check.number(len)){
					len=0;
				}
				if(len>config.getConfig("tika_content_length")){
						msg("content-length is more than specified","error");
						res.emit('error',"TikaContentOverflow");
				}
				res.on("data",function res_on_data(chunk){
					done_len+=chunk.length;
				 	var t=new Date().getTime();
				 	if((t-init_time)>config.getConfig("tika_timeout")){
				 		//console.log((t-init_time)+"ContentTimeOut");
						msg("Connection timedout change tika_timeout setting in config","error");
						res.emit('error',"TikaContentTimeout");
				 	}
				 	if(done_len>config.getConfig("tika_content_length")){
						//console.log(done_len+"ContentOverflowTka");
						msg("content-length is more than specified","error");
						res.emit('error',"TikaContentOverflow");
					}
				});
					res.on('error',function res_on_error(err){
						var msg = err;
						if(msg === "TikaContentOverflow" || msg === "TikaContentTimeout"){
							return callback(err);
						}else{
							msg(err.stack,color_debug);
							return callback("TikaDownloadFailed");	
						}
						


					}).pipe(st).on('error',function res_pipe_on_error(err){
						msg(err.stack,color_debug);
						return callback("TikaFileStoreWriteError");
					}).on('close',function res_on_close(err){
						if(!err){
							return callback(null);
						}else{
							msg(err.stack,color_debug);
							return callback(err);
						}
						
					});
			});
			
		
	
  	   
	},
	"removeFile":function removeFile(url,cal){
		
			fs.unlink(app.getFileName(url),function(err){
			
				if(err){
					cal("TikaStoreRemoveError");
				}
				else{
					cal(null);
				}
			});
				
		
	
	},
	"extractText":function extractText(url,callback){
		var errr;
		try{
			var source = fs.createReadStream(app.getFileName(url));
			source.on('error',function source_on_error1(err){
					msg(err.stack,color_debug);
					callback("TikaFileStoreReadError",{});
			});
			var dic={};
			source.pipe(request.put({url:'http://'+config.getConfig("tika_host")+':'+config.getConfig('tika_port')+'/tika',headers: {'Accept': 'text/plain'}},function(err, httpResponse, body){
				//console.log(body)
				//for testing 
				dic["text"]=body+""+parseInt(Math.random()*1000000)+""+new Date().getTime();
				//dic["text"] = body;
				source = fs.createReadStream(app.getFileName(url)).on('error',function source_create(err){
						msg(err.stack,color_debug);
						callback("TikaFileStoreReadError",{});
				});;
				source.pipe(request.put({url:'http://'+config.getConfig("tika_host")+':'+config.getConfig('tika_port')+'/meta',headers: {'Accept': 'application/json'}},function source_response(err1, httpResponse1, body1){
					var err=null;
					try{
						msg("tika.extractText for "+url,"success");
						//unexpected end of input error here check it please
						//console.log(body1)
						dic["meta"]=JSON.parse(body1);
						callback(err,dic);
					}catch(err){
						msg(err.stack,color_debug);
						err="TikaServerResponseError";
						msg("tika.extractText for "+url,"error");
						callback(err,dic);
					}
					
				}));
			})).on('error',function source_on_error(err){
					msg(err.stack,color_debug);
					callback("TikaServerResponseError",{});
			});
		}catch(err){
			msg(err.stack,color_debug);
			callback("TikaExtractFailed",{});
		}
		
		

	},
	"indexTikaDoc":function(link){
		var filename = app.getParsedFileName(link.details.urlID);
		tika_f_queue.insert({"content": filename, "urlID":link.details.urlID},function(){
				var stream=fs.createWriteStream(filename);
				stream.write(JSON.stringify(link.details));
				stream.on("end",function tika_doc_index(){
					msg('Tika doc dumped for indexing','info');
				});
		});
	},
	"processNext":function processNext(){
		console.log("here");
		if(process.busy){
			return;
		}
		console.log("there")
		process.busy = true;
		process.last_lock_time = new Date().getTime();
		
		
		try{
			queue.dequeue(function tika_dequeue(li){
				//console.log(li);
				if(!check.assigned(li)){
					process.busy =false;
					return;
				}
				else if(check.assigned(li) && li.length===0){
					process.busy=false;
					return;
				}
				else if(check.assigned(li) && li.length !==0){
					process.busy=true;
					process.last_lock_time = new Date().getTime();
				}
				var done = 0;
				for (var i in li) {
					var obj=li[i];
						(function(fileName,parseFile,uniqueId,link_details){
							
							try{
									tika.submitFile(fileName,function tika_submit_file(err,body){
										//console.log(err);
										//console.log(body);
										if(err){
											msg("error from fetchFile for "+fileName,"error");
											try{
												var link = URL.url(fileName);
												link.setUrlId(link_details.urlID);
												link.setStatusCode(err);
												link.setParsed({});
												link.setResponseTime(0);
												link.setContent({});
												app.indexTikaDoc(link);
											}catch(errr){
												msg(errr.stack,color_debug);
											}
											
										}else{
											//console.log(body);
											var parser=require(__dirname+"/parsers/"+parseFile);
											var dic=parser.init.parse(body,fileName);//pluggable parser
											msg("fetchFile for "+fileName,"success");
											try{
												var link = URL.url(fileName);
												link.setUrlId(link_details.urlID);
												link.setStatusCode(200);
												link.setParsed(dic[1]);
												link.setResponseTime(0);
												link.setContent(dic[3]);
												if(check.assigned(body) && check.assigned(body["text"])){
													var md5sum = crypto.createHash('md5');
													md5sum.update(body["text"]);
													var hash=md5sum.digest('hex');
													link.setContentMd5(hash);
												}
												
												app.indexTikaDoc(link);
											}catch(e){
												msg(e.stack,color_debug);
											}
											

										}
										++done;
										if(done === li.length){
											msg("Tika batch completed",'success');
											process.busy=false;
										}
										
										queue.remove(uniqueId);
										
										
									});
							}
							catch(err){
								msg("error from fetchFile for "+fileName,"error");
								try{
									var link = URL.url(fileName);
									link.setStatusCode("tikaUnknownError");
									link.setUrlId(link_details.urlID);
									link.setParsed({});
									link.setResponseTime(0);
									link.setContent({});
									app.indexTikaDoc(link);


								}catch(e){
									msg(e.stack,color_debug);
								}finally{
									++done;
									if(done === li.length){
										msg("Tika batch completed",'success');
										process.busy=false;
									}
									
									queue.remove(uniqueId);
								}
								
								
							}


						})(obj.fileName,obj.parseFile, obj.link_details.urlID, obj.link_details);
				};

			},config.getConfig("tika_batch_size"));//[[],[]]
		}catch(e){
			process.busy = false;
		}


						
						
		

		
				
			
					
		
		
		
		
	},
	"getFileName":function getFileName(url){
		return __dirname+"/pdf-store/"+url.replace(/\//gi,"##");
	},
	"getParsedFileName":function getParsedFileName(url){
		return __dirname+"/pdf-store-parsed/"+url.replace(/\//gi,"##")+".json";
	}

};
process.last_lock_time = new Date().getTime();
function failSafe(){
	if((new Date().getTime() - process.last_lock_time) >=(1000*60*10)){ //10 min check
		msg("Unlocking tika queue",'info');
		process.busy = false;

	}
}


exports.init=app;
process.busy=false;
var tika=app;
if(require.main === module){
	
	process.on("message",function process_on_msg(data){
		//console.log(data);
		var key=Object.keys(data)[0];

		if(key==="init"){
			//making init ready
			var o=data[key];
			//console.log(o);
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
			msg("pdf-store cache reset","success");
			tika.startServer();
			var serverOptions = {
			  'auto_reconnect': true,
			  'poolSize': config.getConfig("pool-size")
			};
			var mongodb=config.getConfig("mongodb","mongodb_uri");
			process.mongo=MongoClient.connect(mongodb,serverOptions, function(err, db1) {
				db=db1;
				//#debug#console.log(err,db)
				tika_queue = db.collection(config.getConfig("bot_name")+"_tika_queue");
				tika_queue.update({"status":1},{"status":0},function revert_queue(){
					msg("pdf-store queue reverted","success");
					tika_f_queue=db.collection(config.getConfig("bot_name")+"_tika_f_queue");
					setInterval(tika.processNext,1000);
					setInterval(failSafe,1000);
				});

			});
			
			separateReqPool = {maxSockets: config.getConfig("tika_max_sockets_per_host")};
			
		}
	        

	});



}
function msg(){log.put(arguments[0],arguments[1],__filename.split('/').pop(), arguments.callee.caller.name.toString());}
