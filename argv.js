exports.init=function(){
	var args={};
	var argv = require('minimist')(process.argv.slice(2));
	if(argv["verbose"]!==undefined){
		var item=JSON.parse(argv["verbose"]);
		args['verbose']=item;
	}
	if(argv["logging"]!==undefined){
		var item=JSON.parse(argv["logging"]);
		args['logging']=item;
	}
	if(argv["childs"]!==undefined){
		var item=argv["childs"];
		args['childs']=item;
	}
	if(argv["max_concurrent_sockets"]!==undefined){
		var item=argv["max_concurrent_sockets"];
		args['max_concurrent_sockets']=item;
	}
	if(argv["batch_size"]!==undefined){
		var item=argv["batch_size"];
		args['batch_size']=item;
	}
	if(argv["db_type"]!==undefined){
		var item=argv["db_type"];
		args['db_type']=item;
	}
	if(argv["force"]!==undefined){
		process.force_mode=true;
	}
	if(argv['reset']!==undefined){
		process.reset=true;
	}
	if(argv['seedFile']!==undefined){
		process.seedFile=argv['seedFile'];
	}
	if(argv['webapp']!==undefined){
		process.webappOnly=true;
	}
	return args;
};
