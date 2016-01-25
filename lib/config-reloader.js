var fs=require("fs");
var path = require('path');
var parent_dir=process.getAbsolutePath(__dirname);
var config=require(path.resolve(parent_dir+"/config/config.js")).load();
var proto=require(parent_dir+'/lib/proto.js');
var JSONX=proto.JSONX;
var ObjectX=proto.ObjectX;
var pool;
var OVERRIDEN_CONFIG={};
var check=require("check-types");
var log=require(parent_dir+"/lib/logger1.js");
function updateDbConfig(dic){
		pool.stats.updateConfig(gc('bot_name'),dic,function(err,results){

		});
		//updates the config changes done from local machine to db
	
}
function gc(){
	var val=config;
	if(!check.assigned(arguments[0])){
		return config;
	}
	for (var i = 0; i < arguments.length; i++) {
		if(check.assigned(OVERRIDEN_CONFIG[arguments[i]])){
			val=OVERRIDEN_CONFIG[arguments[i]];//overrides the config with command line arguments
		}else{
			val=val[arguments[i]];
		}
		
	};
	return val;
};

function ulc(dic,reload){
	//updates local copy of the config from db
	fs.writeFileSync(parent_dir+"/config/config.js","var parent_dir=process.getAbsolutePath(__dirname);\nvar proto=require(parent_dir+'/lib/proto.js');\nvar JSONX=proto.JSONX;\nvar config="+JSONX.stringify(dic)+"\n\nfunction load(){\nreturn JSONX.parse(JSON.stringify(config));\n}\nexports.load=load;\n\n");
	if(!check.assigned(reload) || reload===true){
		process.emit("restart");//will be caught by death and it will cause to restart
	}
	if(process.MODE==='require'){
		config=dic;
	}
	
};

function pullDbConfig(fn){
	pool.config_reloader.pullDbConfig(gc('bot_name'),function(results){
		fn(results);
	});

	};

function configReloader(){
		pullDbConfig(function(new_config){
			if(check.assigned(new_config)){
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
					stream.close();
					data={};
			}
			
			OVERRIDEN_CONFIG=JSON.parse(data);
	}else{
		OVERRIDEN_CONFIG=dic;
		try{
			fs.writeFileSync(parent_dir+'/config/config_override.json',JSON.stringify(dic));
		}catch(err){
			var stream=fs.createWriteStream(parent_dir+"/config/config_override.json");
			stream.write("{}");
			stream.close();
		}
		
	}
	
}
exports.getConfig=gc;
exports.updateLocalConfig=ulc;
exports.updateDbConfig=updateDbConfig;
exports.setOverridenConfig=override;
override();//run for first time
exports.setDB=function(p){
	pool=p;
}