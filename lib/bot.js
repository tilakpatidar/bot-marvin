var parent_dir=process.getAbsolutePath(__dirname);
var log=require(parent_dir+'/lib/logger.js');
var config=process.bot_config;
var cluster,pool;
var fs=require('fs');
var bot={
	"_id":"",
	"registerTime":"",
	"createdBuckets":0,
	"processedBuckets":0,
	"crawledPages":0,
	"failedPages":0
};
var check=require("check-types");
bot['_id']=config.getConfig('bot_name');
bot['registerTime']=new Date();
var obot=JSON.parse(JSON.stringify(bot));
function startBot1(fn){

		//fn(statusOfSuccess)
		/*
			Checks if an active bot with same name is present return true if you can start the bot
			return false if an instance of the same bot name is running
		*/
		if(process.webappOnly){
			fn(true);//bypass starting the bot if webapp mode is on
			return;
		}
		var t=new Date().getTime();
		
			pool.bot.startBotGetBotActiveStatus(function startBotGetBotActiveStatus(err,result){
				
				if(result){
					msg("A bot with same is name is still active in cluster","error");

							return fn(false);
					
				}
				else{
					pool.bot.startBotAddNewBot(t,function startBotAddNewBot(err,result){

						if(!err){
							msg("Inserted new bot info into cluster","success");
							pool.bot.requestToBecomeMaster(config.getConfig("bot_name"),function(status){
									if(status){
										process.cluster_master=true;
									}else{
										process.cluster_master=false;
									}
									return fn(true);
							});
							
						}
						else{
							msg("Unable to insert new bot into cluster","error");
							return fn(false);
						}

					});
					
					
				}
				
			});

		

}
function botInfoUpdater(updateConfig,fn){
		var dic=process.bot.getBotData();//data is pulled and reseted
		var n_dic={};
		for(var key in dic){
			if(check.number(dic[key])){
				if(!n_dic['$inc']){
					n_dic['$inc']={};
				}
				n_dic['$inc'][key]=dic[key];
			}
		}
		if(updateConfig){
			n_dic['config']=JSON.parse(JSONX.stringify(config.getConfig()));
		}
		//#debug#console.log(n_dic);
		pool.bot.updateBotInfo(n_dic,function updateBotInfo(err,results){
			//#debug#console.log(results);
			//#debug#console.log(err);
			if(err){
				msg("Error ocurred while updating bot info ","error");
				if(check.assigned(fn)){
					return fn(false);
				}
			}
			else{

				msg("Bot info updated","success");
				if(check.assigned(fn)){
					return fn(true);
				}
			}
		});
	}
var dic={
	"updateStats":function updateStats(key,value){
		  if(check.number(value)){
		  	//will be incremented by the value given
		  	bot[key]=bot[key]+value;
		  }else{
		  	bot[key]=value;
		  }
	},
	"getBotData":function getBotData(){
		//data is reseted when it is pulled
		var b=JSON.parse(JSON.stringify(bot));//to avoid reference issue,doing deep copy
		bot=JSON.parse(JSON.stringify(obot));
		return b;
	},
	"startBot":function startBot(force_mode,fn){
		pool.resetBuckets(function(){
		startBot1(function startBot1(success){
			//#debug#console.log("HEY")
		//start the bot and verify if other bot with same name exists
				if(!success){
					if(force_mode){
						msg("Force mode enabled",'info');
						//try to kill other bot with same name
						cluster.closeBot(config.getConfig('bot_name'),function(status){

							if(status){
								startBot1(function(status1){
									if(status1){
										return fn(true);
									}
									else{
										return fn(false);
									}
								});
								
							}
							else{
								return fn(false);
							}
						});
					}
					else{
							return fn(false);
					}
				}
				else{
					//#debug#console.log("DDD")
					return fn(true);
				}	
			
		});
		});
	},
	"pingMaster":function pingMaster(){
		//#debug#console.log("pingMaster")
		//pings master if master is dead ,clears the semaphore collection so that bots can compete again
		cluster.getMaster(function(master){
			//#debug#console.log(master)
			cluster.send(master,{"active":1},function(s,res){
				//#debug#console.log(s,res)
				if(s){
					if(check.assigned(res)){
						if(JSON.parse(res)["active"]===true){
						//	//#debug#console.log("still active");
							//master is still active
						}
						else{
							pool.semaphore_collection.remove({},function(){

							});
						}
					}
					else{
						//#debug#console.log("dead");
						pool.semaphore_collection.remove({},function(){

							});
					}
				}
				else{
					//#debug#console.log("dead");
						pool.semaphore_collection.remove({},function(){

							});
				}

			});
		});
	},
	stopBot:function stopBot(fn){
		var files=fs.readdirSync(parent_dir+'/pdf-store/');
		for (var i = 0; i < files.length; i++) {
			if(files[i].indexOf(".")===0){
				//do not take hidden files
				continue;
			}
			var domain=files[i].replace(/##/g,"/");
			var data=fs.unlinkSync(parent_dir+'/pdf-store/'+files[i]);
		};
		pool.resetBuckets(function(){
			pool.bot.BotMarkInactive(function BotMarkInactive(err,results){
			if(err){
				msg("Bot was not found something fishy ","error");
				return fn(false);
			}
			else{
				botInfoUpdater(false,function botInfoUpdater(updated){
					if(updated){
						msg("Bot cleaned up ","success");
						return fn(true);
					}
					else{
						msg("Bot cleaned up ","error");
						fn(error);
						return;
					}
				});
				
			}

			});


		});
}
};
module.exports=function(cluster_obj,pool_obj){
	//constructor for the bot.js
	cluster=cluster_obj;
	pool=pool_obj;
	return dic;

};
process.bot_check_mode=setInterval(function(){
	
		
		var b=setInterval(function(){
			if(process.begin_intervals){
				botInfoUpdater(false);
			}
		},10000);
		process.my_timers.push(b);
		var c=setInterval(function(){
			if(process.begin_intervals){
				pool.bot.checkIfStillMaster(function(status){
					if(status){
						process.cluster_master=true;
					}else{
						process.cluster_master=false;
					}
				});
			}
			
		},10000);
		process.my_timers.push(c);
		var d=setInterval(function(){
			if(process.begin_intervals){
				dic.pingMaster();
			}
			
		},10000);
		process.my_timers.push(d);
		clearInterval(process.bot_check_mode);//once intervals are set clear the main interval
	
},5000);
function msg(){log.put(arguments[0],arguments[1],__filename.split('/').pop(), arguments.callee.caller.name.toString());}
