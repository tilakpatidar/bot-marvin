var check=require("check-types");
var fs=require("fs");
var request=require("request");
var config=require(__dirname+"/config-reloader.js");
var seed=require(__dirname+"/seed-reloader.js");
if(process.env.EDITOR===undefined){
	process.env.EDITOR=config.getConfig("text_editor");
}
var edit = require('string-editor');
var proto=require(__dirname+"/proto.js");
var JSONX=proto.JSONX;
exports.init=function(){
	var args={};
	var argv = require('minimist')(process.argv.slice(2));
	if(check.assigned(argv["verbose"])){
		var item=JSON.parse(argv["verbose"]);
		args['verbose']=item;
	}
	if(check.assigned(argv["logging"])){
		var item=JSON.parse(argv["logging"]);
		args['logging']=item;
	}
	if(check.assigned(argv["childs"])){
		var item=argv["childs"];
		args['childs']=item;
	}
	if(check.assigned(argv["max_concurrent_sockets"])){
		var item=argv["max_concurrent_sockets"];
		args['max_concurrent_sockets']=item;
	}
	if(check.assigned(argv["batch_size"])){
		var item=argv["batch_size"];
		args['batch_size']=item;
	}
	if(check.assigned(argv["db_type"])){
		var item=argv["db_type"];
		args['db_type']=item;
	}
	if(check.assigned(argv["force"])){
		process.force_mode=true;
	}
	if(check.assigned(argv['reset'])){
		process.reset=true;
	}
	if(check.assigned(argv['loadSeedFile'])){
		process.seedFile=argv['loadSeedFile'];
	}
	if(check.assigned(argv['editSeedFile'])){
		var con=seed.getSeed();
		process.modifyConfig=true;
		edit(JSONX.stringify(con),"seed.json", function(err, result) {
			// when you are done editing result will contain the string 
			console.log("Updating seed please wait!");
			//console.log(result)
			var dic=JSONX.parse(result);
			seed.updateLocalSeed(dic);//update fs copy too
			seed.updateDbSeed(dic);
			setTimeout(function(){
				console.log("Seed updated [SUCCESS]");
				process.exit(0);
			},2000);
		});
		args["verbose"]=false;
		args["logging"]=false;
		process.webappOnly=true;
	}
	if(check.assigned(argv['webapp'])){
		process.webappOnly=true;
	}
	if(check.assigned(argv["allow_robots"])){
		var item=JSON.parse(argv["allow_robots"]);
		args['allow_robots']=item;
	}
	if(check.assigned(argv["external_links"])){
		var item=JSON.parse(argv["external_links"]);
		args['external_links']=item;
	}
	if(check.assigned(argv["parse_sitemaps"])){
		var item=JSON.parse(argv["parse_sitemaps"]);
		args['parse_sitemaps']=item;
	}
	if(check.assigned(argv["config"])){
		var con=config.getConfig();
		process.modifyConfig=true;
		edit(JSONX.stringify(con),"config.json", function(err, result) {
			// when you are done editing result will contain the string 
			console.log("Updating config please wait!");
			//console.log(result)
			var dic=JSONX.parse(result);
			config.updateLocalConfig(dic,false);//update fs copy too
			config.updateDbConfig(JSON.parse(result));//regex safe json update to db
			setTimeout(function(){
				console.log("Config updated [SUCCESS]");
				process.exit(0);
			},2000);
		});
		args["verbose"]=false;
		args["logging"]=false;
		process.webappOnly=true;
	}
	if(check.assigned(argv["help"])){
		console.log("For help options run \"man bot-marvin\"");
		process.exit(0);
	}
	return args;
};

