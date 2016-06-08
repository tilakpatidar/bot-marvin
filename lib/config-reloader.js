var fs=require("fs");
var path = require('path');
var parent_dir=process.getAbsolutePath(__dirname);
var config={"verbose":true,"logging":true}; //by default will get overidden once config is loaded from db 
var check=require("check-types");
var log=require(parent_dir+"/lib/logger.js");

var ConfigReloader = function(){


	var proto=require(parent_dir+'/lib/proto.js');
	var JSONX=proto.JSONX;
	var ObjectX=proto.ObjectX;
	var pool;
	var OVERRIDEN_CONFIG={};
	var DB_CONFIG={};
	var that = this;

	
	function override(dic){
			/*
				Overrides the db and local config with command line arguments.
				Writes the overriden config to disk
				Reloades config for current instance
			*/
			for(var k in dic){
				msg("Overriden config "+k+" for value "+dic[k],"info");
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
			
	};

	this.setOverridenConfig = override;

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

	this.updateDbConfig = function updateDbConfig(dic,fn){
	
		pool.stats.updateConfig(that.getConfig('bot_name'),dic,function updateDbConfig_updateConfig(err,results){
			config=JSONX.parse(JSON.stringify(dic));//update config var so that on bot close changes will appear
			return fn(err,results);
		});
		//updates the config changes done from local machine to db
	
	}

	this.getConfigFromDb = function pullDbConfig(fn){
		pool.config_reloader.pullDbConfig(that.getConfig('bot_name'),function pullDbConfig_pullDbConfig(err,results){
			
			return fn(err,results);
		});

	};

	this.getConfig = function getConfig(){

		var val=config;
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

	this.setDB = function setDB(p,fn){
		pool=p;
		return fn();
	};

	this.getGlobals = function getGlobals(){
		return[JSON.parse(JSONX.stringify(config)),OVERRIDEN_CONFIG,DB_CONFIG];
	};

	this.pullConfig = function pullConfig(fn){
		that.getConfigFromDb(function pullDbConfig(err,results){
			if(check.emptyObject(results) || !check.assigned(results)){
				console.log("You have to set your bot config.\nRun bot-marvin --config\nRun bot-marvin --load-config <filename>");
				process.bot.stopBot(function stopBot(){
							process.exit(0);
							return fn(null);
				});
			}else{
				config=JSONX.parse(JSON.stringify(results));
				return fn(config);
			}
			
		});
	};

	function configReloader(){
		that.getConfigFromDb(function configReloader_pullDbConfig(err,new_config){
			//console.log(new_config)
			if(check.assigned(new_config)){
				//console.log(new_config);
				//console.log(JSON.parse(JSONX.stringify(gc())));
				if(!ObjectX.isEquivalent(new_config,JSON.parse(JSONX.stringify(that.getConfig())))){
					msg("Config changed from db ","info");
					//if local and db copy unmatches
					//means config has been changed from db
					
					process.emit("restart");
				}
				else{
					msg("No change in config","info");
				}
			}
		});
	};


	process.config_check_mode=setInterval(function(){
		
			var b=setInterval(function(){
				if(process.begin_intervals){
					configReloader();
				}
				

			},10000);
			process.my_timers.push(b);
			clearInterval(process.config_check_mode);//once intervals are set clear the main interval
		
	},5000);

	override();//run for first time
	setDbConfig();
};

var obj = new ConfigReloader();
module.exports = obj;

function msg(){log.put(arguments[0],arguments[1],__filename.split('/').pop(), arguments.callee.caller.name.toString());}
