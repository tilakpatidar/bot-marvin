var check=require("check-types");
var fs=require("fs");
var request=require("request");
var config=process.bot_config;
var seed=process.bot_seed;
var seed=require(__dirname+"/seed-reloader.js");
if(process.env.EDITOR===undefined){
	process.env.EDITOR="/bin/nano";
}
var edit = require('string-editor');
var proto=require(__dirname+"/proto.js");
var parent_dir=proto.getAbsolutePath(__dirname);
var JSONX=proto.JSONX;
var args={};
var actions = {
	"verbose": function(){
		var item=JSON.parse(argv["verbose"]);
		args['verbose']=item;
	},
	"logging": function(){
		var item=JSON.parse(argv["logging"]);
		args['logging']=item;		
	},
	"childs":function(){
		var item=argv["childs"];
		args['childs']=item;		
	},
	"max_concurrent_sockets":function(){
		var item=argv["max_concurrent_sockets"];
		args['max_concurrent_sockets']=item;		
	},
	"batch_size":function(){
		var item=argv["batch_size"];
		args['batch_size']=item;		
	},
	"db_type":function(){
		var item = argv["db_type"];
		args['db_type'] = item;		
	},
	"force":function(){
		process.force_mode = true;
	},
	"reset":function(){
		process.reset = true;
	},
	"loadSeedFile":function(){
		process.seedFile=argv['loadSeedFile'];
	},
	"editSeedFile":function(){
		process.editSeedFile=true;
		args["verbose"]=false;
		args["logging"]=false;
		process.webappOnly=true;
	},
	"removeSeed":function(){
		process.removeSeed = {};
		process.removeSeed[argv["removeSeed"]] = true;
	},
	"webapp":function(){
		process.webappOnly=true;
	},
	"allow_robots":function(){
		var item=JSON.parse(argv["allow_robots"]);
		args['allow_robots']=item;
	},
	"external_links":function(){
		var item=JSON.parse(argv["external_links"]);
		args['external_links']=item;
	},
	"parse_sitemaps":function(){
		var item=JSON.parse(argv["parse_sitemaps"]);
		args['parse_sitemaps']=item;
	},
	"config":function(){
		process.modifyConfig=true;
		config.getConfigFromDb(function(err,result){
			if(err || (!check.assigned(err) && !check.assigned(result))){
				//config not present in the db user want to set it first time
				var c=require(parent_dir+"/config/config.js").load();
						edit(JSONX.stringify(c),"config.json", function(err, result) {
							// when you are done editing result will contain the string 
							console.log("Updating config please wait!");
							//console.log(result)
							var dic=JSONX.parse(result);
							config.updateDbConfig(JSON.parse(result),function(err){
								setTimeout(function(){
									if(err){
										console.log("Config updated [ERROR]");
									}else{
										console.log("Config updated [SUCCESS]");
									}
									process.bot.stopBot(function(){
										process.exit(0);
									});
								},2000);

							});//regex safe json update to db
							
						});
			}
			else{
				//config update
				var c=result;
				edit(JSON.stringify(c,null,2),"config.json", function(err, result) {
					// when you are done editing result will contain the string 
					console.log("Updating config please wait!");
					//console.log(result)
				var dic=JSONX.parse(result);
				config.updateDbConfig(JSON.parse(result),function(err){
					setTimeout(function(){
						if(err){
							console.log("Config updated [ERROR]");
						}else{
							console.log("Config updated [SUCCESS]");
						}
						process.bot.stopBot(function(){
							process.exit(0);
						});
					},2000);

				});//regex safe json update to db
				
			});
			}
		});
		args["verbose"]=false;
		args["logging"]=false;
		process.webappOnly=true;
	},
	"help":function(){
		console.log("For help options run \"man bot-marvin\"");
		process.exit(0);
	}
}
exports.init=function(){
	
	var argv = require('minimist')(process.argv.slice(2));
	for(var key in actions){
		if(check.assigned(argv[key])){
			argv[key]();
		}
	}
	
	return args;
};

