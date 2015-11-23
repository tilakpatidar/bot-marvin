var log=require(__dirname+"/lib/logger.js");
var options={
	"mysql":function(){
		return require(__dirname+'/db/mysql');
	},
	"mongodb":function(){
		return require(__dirname+'/db/mongodb');
	},
	"elasticsearch":function(){
		return require(__dirname+'/db/elasticsearch');
	}

};
function getDB(db){
		var temp=options[db];
		if(temp===undefined){
			log.put(("Invalid db type :"+db),"error");
			process.exit(0);
		}
		else{
			return options[db]();
		}
		
}
exports.getDB=getDB;