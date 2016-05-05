var fs=require("fs");
var path = require('path');
var parent_dir=process.getAbsolutePath(__dirname);
var config={"verbose":true,"logging":true}; //by default will get overidden once config is loaded from db
var proto=require(parent_dir+'/lib/proto.js');
var JSONX=proto.JSONX;
var ObjectX=proto.ObjectX;
var pool;
var OVERRIDEN_CONFIG={};
var DB_CONFIG={}; 
var check=require("check-types");
var log=require(parent_dir+"/lib/logger1.js");
function updateDbConfig(dic,fn){
	
		pool.stats.updateConfig(gc('bot_name'),dic,function(err,results){
			config=JSONX.parse(JSON.stringify(dic));//update config var so that on bot close changes will appear
			return fn(err,results);
		});
		//updates the config changes done from local machine to db
	
}
function gc(){

	var val=config;
	//console.log(val)
	if(!check.assigned(arguments[0])){
		return config;
	}
	for (var i = 0; i < arguments.length; i++) {
		if(check.assigned(OVERRIDEN_CONFIG[arguments[i]])){
			val=OVERRIDEN_CONFIG[arguments[i]];//overrides the config with command line arguments
		}
		else if(check.assigned(DB_CONFIG[arguments[i]])){
			val=DB_CONFIG[arguments[i]];
		}
		else{
			val=val[arguments[i]];
		}
		
	};
	return val;
};


function pullDbConfig(fn){
	pool.config_reloader.pullDbConfig(gc('bot_name'),function(err,results){
		
		return fn(err,results);
	});

	};

function configReloader(){
		pullDbConfig(function(err,new_config){
			//console.log(new_config)
			if(check.assigned(new_config)){
				//console.log(new_config);
				//console.log(JSON.parse(JSONX.stringify(gc())));
				if(!ObjectX.isEquivalent(new_config,JSON.parse(JSONX.stringify(gc())))){
					log.put("Config changed from db ","info");
					//if local and db copy unmatches
					//means config has been changed from db
					
					process.emit("restart");
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
			if(process.begin_intervals){
				configReloader();
			}
			

		},10000);
		process.my_timers.push(b);
		clearInterval(process.config_check_mode);//once intervals are set clear the main interval
	}
},5000);
function override(dic){
	/*
		Overrides the db and local config with command line arguments.
		Writes the overriden config to disk
		Reloades config for current instance
	*/
	for(var k in dic){
		log.put("Overriden config "+k+" for value "+dic[k],"info");
	}
	if(!check.assigned(dic)){
			//if undefined reload config from disk
			var data;
			try{
				data=fs.readFileSync(parent_dir+'/config/config_override.json').toString();
			}catch(err){
					var stream=fs.createWriteStream(parent_dir+"/config/config_override.json");
					stream.write("{}");
					stream.end();
					data="{}"; //JSON parse below
			}
			
			OVERRIDEN_CONFIG=JSON.parse(data);
	}else{
		OVERRIDEN_CONFIG=dic;
		try{
			fs.writeFileSync(parent_dir+'/config/config_override.json',JSON.stringify(dic));
		}catch(err){
			var stream=fs.createWriteStream(parent_dir+"/config/config_override.json");
			stream.write("{}");
			stream.end();
		}
		
	}
	
}
function setDbConfig(dic){
	/*
		Overrides the config with db config settings from db_config.json
	*/
	
	if(!check.assigned(dic)){
			//if undefined reload config from disk
			var data;
			try{
				data=fs.readFileSync(parent_dir+'/config/db_config.json').toString();
			}catch(err){
					var stream=fs.createWriteStream(parent_dir+"/config/db_config.json");
					stream.write("{}");
					stream.end();
					stream.on("finish",function(){
						console.log("db config for bot is not set.\nSet using bot-marvin-db");
						process.exit(0);
					});
					
			}
			try{
				DB_CONFIG=JSON.parse(data);
				//file present with no json in it
			}catch(err){
				var stream=fs.createWriteStream(parent_dir+"/config/db_config.json");
				stream.write("{}");
				stream.end();
				stream.on("finish",function(){
					console.log("1db config for bot is not set.\nSet using bot-marvin-db");
					process.exit(0);
				});
			}
			
	}else{
		DB_CONFIG=dic;
		try{
			fs.writeFileSync(parent_dir+'/config/db_config.json',JSON.stringify(dic));
		}catch(err){
			var stream=fs.createWriteStream(parent_dir+"/config/db_config.json");
			stream.write("{}");
			stream.end();
			stream.on("finish",function(){
				console.log("db config for bot is not set.\nSet using bot-marvin-db");
				process.exit(0);
			});
		}
		
	}
	
}
function getGlobals(){
	return[JSON.parse(JSONX.stringify(config)),OVERRIDEN_CONFIG,DB_CONFIG];
}

override();//run for first time
setDbConfig();
exports.getConfig=gc;
exports.setOverridenConfig=override;
exports.updateDbConfig=updateDbConfig;
exports.getConfigFromDb=pullDbConfig;
exports.getGlobals=getGlobals;
exports.setDB=function(p,fn){
	pool=p;
	return fn();
}
exports.pullConfig=function(fn){
	pullDbConfig(function(err,results){
		if(check.emptyObject(results) || !check.assigned(results)){
			console.log("You have to set your bot config.\nRun bot-marvin --config");
			process.bot.stopBot(function(){
						process.exit(0);
						return fn(null);
			});
		}else{
			config=JSONX.parse(JSON.stringify(results));
			return fn(config);
		}
		
	});
};