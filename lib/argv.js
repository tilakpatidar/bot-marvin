var check=require("check-types");
var fs=require("fs");
var request=require("request");
var config=require(__dirname+"/config-reloader.js");
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
	if(check.assigned(argv['seedFile'])){
		process.seedFile=argv['seedFile'];
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
		console.log(config.getConfig());
		process.exit(0);
	}
	if(check.assigned(argv["more-config"])){
		var network_host=config.getConfig("network_host");
		var network_port=config.getConfig("network_port");
		console.log("Open http://"+network_host+":"+network_port);
		console.log("You can directly edit config. Just choose your bot name from left side pane.")
		console.log("Press Ctrl+c to exit webapp mode after config changes are made");
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

