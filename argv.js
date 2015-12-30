exports.init=function(app){
	var argv = require('minimist')(process.argv.slice(2));
	if(argv["verbose"]!==undefined){
		var item=JSON.parse(argv["verbose"]);
		app.set("verbose",item);
		app.setVerbose(item);
	}
	if(argv["logging"]!==undefined){
		var item=JSON.parse(argv["logging"]);
		app.set("logging",item);
		app.setLogging(item);
	}
	if(argv["childs"]!==undefined){
		var item=argv["childs"];
		app.set("childs",item);
	}
	if(argv["max_concurrent_sockets"]!==undefined){
		var item=argv["max_concurrent_sockets"];
		app.set("max_concurrent_sockets",item);
	}
	if(argv["batch_size"]!==undefined){
		var item=argv["batch_size"];
		app.set("batch_size",item);
	}
	if(argv["db_type"]!==undefined){
		var item=argv["db_type"];
		app.set("db_type",item);
	}
	if(argv["force"]!==undefined){
		process.force_mode=true;
	}
};
