var parent_dir=process.getAbsolutePath(__dirname);
var log=require(parent_dir+"/lib/logger.js");
var config=process.bot_config;
var cluster_info;
var enableGracefulShutdown = require('server-graceful-shutdown');
var request=require("request");
var url=require('url');
var sf = require('slice-file');
var check=require("check-types");
var pool;
var port_occupied=false;
var loopback_token;
var server = require('http').createServer(function (request, response) {
	console.log(request)
	var urlparts=url.parse(request.url.toString(),true);
	var js=JSON.parse(urlparts.query.msg);
	switch(Object.keys(js)[0]){

		case "readLog":
				if(js["readLog"]["type"]==="head"){
					var words=sf(__dirname+"/log/test.log");
					words.slice(0,js["readLog"]["n"]).pipe(response);
				}
				else if(js['readLog']['type']==="tail"){
					var words=sf(__dirname+"/log/test.log");
					words.slice(js["readLog"]["n"]*(-1)).pipe(response);
				}
			break;
		case "readTerminal":
			response.write(JSON.stringify(log.getTerminalData()));
			response.end();
			break;
		case "active":
			response.write(JSON.stringify({"active":true}));
			response.end();
			break;
		case "command":
			if(js["command"]==="exit"){
				//console.log(js);
				var dic={"output":"ack"};
				if(loopback_token===js["loopback_token"]){
					//calling same bot
					dic["loopback"]=true;
				}
				
				response.write(JSON.stringify(dic));
				response.end();
				if(loopback_token!==js["loopback_token"]){
					process.nextTick(function(){
						process.emit('grace_exit');
					});	
				}
				
				
			}
			else if(js["command"]==="isActive"){
				var dic={"output":true};
				response.write(JSON.stringify(dic));
				response.end();
			}
			break;
	};


});
var app={
	"send":function(to,msg,fn){
		if(config.getConfig("bot_name")===to){
			//loopback request to same bot which is processing
			var m=Object.keys(msg)[0];
			switch(m){
				case "readLog":
					if(msg["readLog"]["type"]==="head"){
						var words=sf(__dirname+"/log/test.log");
						var st=words.slice(0,msg["readLog"]["n"]);
						var data="";
						st.on("data",function(chunk){
							data+=chunk.toString();
						});
						st.on("end",function(){
							return fn(true,data);
							
						});
						
					}
					else if(msg['readLog']['type']==="tail"){
						var words=sf(__dirname+"/log/test.log");
						var data="";
						var st=words.slice(msg["readLog"]["n"]*(-1));
						st.on("data",function(chunk){
							data+=chunk.toString();
						});
						st.on("end",function(){
							return fn(true,data);
						});
					}
					break;
				case "readTerminal":
					return fn(true,JSON.stringify(log.getTerminalData()));
					break;
				case "active":
					return fn(true,JSON.stringify({"active":true}))
					break;
			}
			
			return;
		}
		if(cluster_info[to]){
			//bot exists
			var host_name="http://"+cluster_info[to]["config"]["network_host"]+":"+cluster_info[to]["config"]["cluster_port"]+"/?msg="+JSON.stringify(msg);
			//console.log(host_name);
			request(host_name,function(err,response,html){
				
				if(!err){
					var js=html;
					return fn(true,js);
				}
				else{
					return fn(false,null);
				}
			});
		}
		else{
			return fn(false,null);
		}
	},
	"removeBot":function(bot_name){
		app.closeBot(bot_name,function(closed){
		
		});
	},
	"sendTo":function(host,port,msg,fn){
		var host_name="http://"+host+":"+port+"/?msg="+JSON.stringify(msg);
			request(host_name,function(err,response,html){
				if(!err){
					var js=response.body;
					return fn(true,js);
				}
				else{
					return fn(false,null);
				}
			});
	},
	"getBotConfig":function(bot_name,fn){
		pool.cluster.getBotConfig(bot_name,function(err,results){
			
			if(!err){
				return fn(results.config);
			}
			else{
				return fn(null);
			}
		});
	},
	"getMaster":function(fn){
		//will also fetch fresh cluster info as this function will be called by bot periodically
		stats.activeBots(function(results){
			log.put("Obtained cluster info ","success");
			cluster_info={};
			for (var i = 0; i < results[0].length; i++) {
				cluster_info[results[0][i]["_id"]]=results[0][i];
			};
			pool.cluster.getMaster(function(res){
				return fn(res);
			});
		});
		

	},
	"closeBot":function(bot_name,fn){
		app.getBotConfig(bot_name,function(c){
			//get the config for the same bot
			loopback_token=parseInt(Math.random()*100000)+""+new Date().getTime();
			app.sendTo(c.network_host,c.cluster_port,{"command":"exit","loopback_token":loopback_token},function(status,results){
						var js=JSON.parse(results);
						//console.log(js);
						//if js is null reply that means the cluster server of the bot is shut down

						if(!check.assigned(js) || (js["output"]==="ack" && check.assigned(js["loopback"]))){
							//the other bot was on the same system and was not shut gracefully
							//console.log("tilakksks");
							process.bot.stopBot(function(st){
									if(st){
										log.put('The bot with same bot_name was killed gracefully','success');
						
										return fn(true);
									}
									else{
										log.put("Unable to kill the other bot same bot_name. Kill manually",'error');
										return fn(false);
									}
							});
						}
						else if(js["output"]==="ack" && !check.assigned(js["loopback"])){
							//this case is for bots running on other systems
							//or if on same systems both are alive

							//ack means the other bot has got your command
							setTimeout(function(){
								//waiting enough time for the other bot to get killed
									app.sendTo(c.network_host,c.cluster_port,{"command":"isActive"},function(status1,results1){
											//console.log("status   ! "+status);
											if(!status || port_occupied){
												//no response from other bot this means it is closed
												process.bot.stopBot(function(st){
													if(st){
														log.put('The bot with same bot_name was killed gracefully','success');
														if(port_occupied){
															 server.listen(config.getConfig("cluster_port"));
															  server.on("listening",function(){
															    log.put("Server is listening Joining the cluster","success");
																    return fn(true);
															  });
															    server.on("error",function(e){
															    	port_occupied=true;
																  if(e.code==="EADDRINUSE"){
																    log.put("cluster client occupied maybe an instance is already running ","error");
																  }
																  return fn(false);

																});
														}
														return fn(true);
													}
													else{
														log.put("Unable to kill the other bot same bot_name. Kill manually",'error');
														return fn(false);
													}
												});
											}
											else{
												log.put("Unable to kill the other bot same bot_name. Kill manually",'error');
												return fn(false);
											}
										});
							},10000);
							
						}
						else{
							log.put("Unable to kill the other bot same bot_name. Kill manually",'error');
							return fn(false);
						}

					});


		});
	}

};
var stats;
exports.init=function(p,fn){
	//start the http server
	pool=p;
	stats=new require(parent_dir+'/lib/stats.js')(pool);
	
		stats.activeBots(function(results){
			log.put("Obtained cluster info ","success");
			cluster_info={};
			for (var i = 0; i < results[0].length; i++) {
				cluster_info[results[0][i]["_id"]]=results[0][i];
			};
			app.cluster_server=server;
			log.put("Joining the cluster ","info");
			  server.listen(config.getConfig('cluster_port'));
			  server.on("listening",function(){
			  	console.log("listening");
			  	enableGracefulShutdown(app.cluster_server)
			    log.put("Server is listening Joining the cluster","success");
				    return fn(app);
			  });
			    server.on("error",function(e){
			    	port_occupied=true;
				  if(e.code==="EADDRINUSE"){
				    log.put("cluster client occupied maybe an instance is already running ","error");
				  }
				 return fn(app);

				});
		});

	
};