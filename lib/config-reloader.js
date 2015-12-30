var fs=require("fs");
var path = require('path');
var parent_dir=process.getAbsolutePath(__dirname);
var config=require(path.resolve(parent_dir+"/config/config.js")).load();
var proto=require(parent_dir+'/lib/proto.js');
var JSONX=proto.JSONX;
var log=require(process.getAbsolutePath(__dirname)+"/lib/logger.js");
var ObjectX=proto.ObjectX;
var pool;
function updateDbConfig(dic){
		//updates the config changes done from local machine to db
		pool.bot_collection.update({"_id":gc('bot_name')},{"$set":{"config":dic}},function(err,results){
			//console.log(results);
			//console.log(err);
			if(err){
				log.put("Error ocurred while updating bot config ","error");
			}
			else{
				log.put("Bot config updated","success");
			}
		});
}
function gc(){
	var val=config;
	if(arguments[0]===undefined){
		return config;
	}
	for (var i = 0; i < arguments.length; i++) {
		val=val[arguments[i]];
	};
	return val;
};

function ulc(dic,reload){
	//updates local copy of the config from db
	fs.writeFileSync(parent_dir+"/config/config.js","var parent_dir=process.getAbsolutePath(__dirname);\nvar proto=require(parent_dir+'/lib/proto.js');\nvar JSONX=proto.JSONX;\nvar config="+JSONX.stringify(dic)+"\n\nfunction load(){\nreturn JSONX.parse(JSON.stringify(config));\n}\nexports.load=load;\n\n");
	if(reload===undefined || reload===true){
		process.emit("restart");//will be caught by death and it will cause to restart
	}
	if(process.MODE==='require'){
		config=dic;
	}
	
};

function pullDbConfig(fn){
		pool.bot_collection.findOne({"_id":gc('bot_name')},function(err,results){

			var c=results.config;
			if(err){
				log.put("Error ocurred while pulling bot config from db ","error");
				fn(null);
				return;
			}
			else{
				log.put("Bot config pulled from db","success");
				fn(c);
				return;
			}
		});
	};

function configReloader(){
		pullDbConfig(function(new_config){
			if(new_config!==null){
				//console.log(new_config);
				//console.log(JSON.parse(JSONX.stringify(gc())));
				if(!ObjectX.isEquivalent(new_config,JSON.parse(JSONX.stringify(gc())))){
					log.put("Config changed from db ","info");
					//if local and db copy unmatches
					//means config has been changed from db
					ulc(JSONX.parse(JSON.stringify(new_config)));
				}
				else{
					log.put("No change in config","info");
				}
			}
		});
	};
process.config_check_mode=setInterval(function(){
	if(process.MODE==='exec'){
		var b=setInterval(function(){
			configReloader();

		},10000);
		process.my_timers.push(b);
		clearInterval(process.config_check_mode);//once intervals are set clear the main interval
	}
},5000);
exports.getConfig=gc;
exports.updateLocalConfig=ulc;
exports.updateDbConfig=updateDbConfig;
exports.setDB=function(p){
	pool=p;
}