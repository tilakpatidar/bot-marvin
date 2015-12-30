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
bot['_id']=config.getConfig('bot_name');
bot['registerTime']=new Date();
var obot=JSON.parse(JSON.stringify(bot));
function startBot(fn){

		//fn(statusOfSuccess)
		/*
			Checks if an active bot with same name is present return true if you can start the bot
			return false if an instance of the same bot name is running
		*/
		var t=new Date().getTime();
		
			pool.bot_collection.findOne({"_id":config.getConfig("bot_name"),"active":true},function(err,result){
				
				if(result){
					log.put("A bot with same is name is still active in cluster","error");
							fn(false);
							return;
					
				}
				else{
					pool.bot_collection.findAndModify({"_id":config.getConfig("bot_name")},[],{"$set":{"registerTime":t,"active":true,"config":JSON.parse(JSONX.stringify(config.getConfig()))}},{remove:false,upsert:true},function(err,result){

						if(!err){
							log.put("Inserted new bot info into cluster","success");
							fn(true);
							return;
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
			if(typeof dic[key]==="number"){
				if(!n_dic['$inc']){
					n_dic['$inc']={};
				}
				n_dic['$inc'][key]=dic[key];
			}
		}
		if(updateConfig){
			n_dic['config']=JSON.parse(JSONX.stringify(config.getConfig()));
		}
		//console.log(n_dic);
		pool.bot_collection.update({"_id":config.getConfig('bot_name')},n_dic,function(err,results){
			//console.log(results);
			//console.log(err);
			if(err){
				log.put("Error ocurred while updating bot info ","error");
				if(fn!==undefined){
					fn(false);
					return;
				}
			}
			else{

				log.put("Bot info updated","success");
				if(fn!==undefined){
					fn(true);
					return;
				}
			}
		});
	}
var dic={
	updateStats:function(key,value){
		  if(typeof value ==="number"){
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
		startBot(function(success){
		//start the bot and verify if other bot with same name exists
				if(!success){
					if(force_mode){
						log.put("Force mode enabled",'info');
						//try to kill other bot with same name
						cluster.closeBot(config.getConfig('bot_name'),function(status){

							if(status){
								startBot(function(status1){
									if(status1){
										fn(true);
									}
									else{
										fn(false);
									}
								});
								
							}
							else{
								fn(false);
							}
						});
					}
					else{
							fn(false);
					}
				}
				else{
					fn(true);
				}	
			
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
			pool.bot_collection.findAndModify({"_id":config.getConfig("bot_name")},[],{"$set":{"active":false}},{remove:false},function(err,result){
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
		clearInterval(process.bot_check_mode);//once intervals are set clear the main interval
	}
},5000);