var parent_dir=process.getAbsolutePath(__dirname);
var log=require(parent_dir+'/lib/logger.js');
var config=require(parent_dir+"/lib/config-reloader.js");
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
		
			pool.bot.startBotGetBotActiveStatus(function(err,result){
				
				if(result){
					log.put("A bot with same is name is still active in cluster","error");

							fn(false);
							return;
					
				}
				else{
					pool.bot.startBotAddNewBot(t,function(err,result){

						if(!err){
							log.put("Inserted new bot info into cluster","success");
							pool.bot.requestToBecomeMaster(config.getConfig("bot_name"),function(status){
									if(status){
										process.cluster_master=true;
									}else{
										process.cluster_master=false;
									}
									fn(true);
									return;
							});
							
						}
						else{
							log.put("Unable to insert new bot into cluster","error");
							fn(false);
							return;
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
		pool.bot.updateBotInfo(n_dic,function(err,results){
			//#debug#console.log(results);
			//#debug#console.log(err);
			if(err){
				log.put("Error ocurred while updating bot info ","error");
				if(check.assigned(fn)){
					fn(false);
					return;
				}
			}
			else{

				log.put("Bot info updated","success");
				if(check.assigned(fn)){
					fn(true);
					return;
				}
			}
		});
	}
var dic={
	updateStats:function(key,value){
		  if(check.number(value)){
		  	//will be incremented by the value given
		  	bot[key]=bot[key]+value;
		  }else{
		  	bot[key]=value;
		  }
	},
	getBotData:function(){
		//data is reseted when it is pulled
		var b=JSON.parse(JSON.stringify(bot));//to avoid reference issue,doing deep copy
		bot=JSON.parse(JSON.stringify(obot));
		return b;
	},
	startBot:function(force_mode,fn){
		startBot1(function(success){
			//#debug#console.log("HEY")
		//start the bot and verify if other bot with same name exists
				if(!success){
					if(force_mode){
						log.put("Force mode enabled",'info');
						//try to kill other bot with same name
						cluster.closeBot(config.getConfig('bot_name'),function(status){

							if(status){
								startBot1(function(status1){
									if(status1){
										fn(true);
										return;
									}
									else{
										fn(false);
										return;
									}
								});
								
							}
							else{
								fn(false);
								return;
							}
						});
					}
					else{
							fn(false);
							return;
					}
				}
				else{
					//#debug#console.log("DDD")
					fn(true);
					return;
				}	
			
		});
	},
	"pingMaster":function(){
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
	stopBot:function(fn){
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
			pool.bot.BotMarkInactive(function(err,results){
			if(err){
				log.put("Bot was not found something fishy ","error");
				fn(false);
				return;
			}
			else{
				botInfoUpdater(false,function(updated){
					if(updated){
						log.put("Bot cleaned up ","success");
						fn(true);
						return;
					}
					else{
						log.put("Bot cleaned up ","error");
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
	if(process.MODE==='exec'){
		
		var b=setInterval(function(){
		botInfoUpdater(false);

		},10000);
		process.my_timers.push(b);
		var c=setInterval(function(){
			pool.bot.checkIfStillMaster(function(status){
				if(status){
					process.cluster_master=true;
				}else{
					process.cluster_master=false;
				}
			});
		},10000);
		process.my_timers.push(c);
		var d=setInterval(function(){
			dic.pingMaster();
		},10000);
		process.my_timers.push(d);
		clearInterval(process.bot_check_mode);//once intervals are set clear the main interval
	}
},5000);