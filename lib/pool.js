var check=require("check-types")
var parent_dir=process.getAbsolutePath(__dirname);
var log=require(parent_dir+"/lib/logger.js");

/**
	Class which provides selected DB class.
	@param {String} db_type
	@author Tilak Patidar <tilakpatidar@gmail.com>
	@constructor

*/
var Pool = function Pool(db_type){
	var db = db_type;
	/**
		Hold requires of various db types.
		@private
	*/
	var options={
		"mysql":function(){
			return require(parent_dir+'/db/mysql');
		},
		"mongodb":function(){
			return require(parent_dir+'/db/mongodb');
		},
		"elasticsearch":function(){
			return require(parent_dir+'/db/elasticsearch');
		}

	};

	/**
		Returns Db class.
		@public

	*/
	this.getDB = function(){
		var temp=options[db];
		if(!check.assigned(temp)){
			msg(("Invalid db type :"+db),"error");
			process.exit(0);
		}
		else{
			return temp();
		}

	};


};


module.exports = Pool;
function msg(){log.put(arguments[0],arguments[1],__filename.split('/').pop(), arguments.callee.caller.name.toString());}
