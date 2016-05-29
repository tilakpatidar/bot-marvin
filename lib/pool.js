var check=require("check-types")
var parent_dir=process.getAbsolutePath(__dirname);
var log=require(parent_dir+"/lib/logger.js");
log.setFilename(__filename.split("/").pop());
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
function getDB(db){
		var temp=options[db];
		if(!check.assigned(temp)){
			log.put(("Invalid db type :"+db),"error");
			process.exit(0);
		}
		else{
			return options[db]();
		}
		
}
exports.getDB=getDB;