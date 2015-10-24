
var options={
	"mysql":function(){
		return require('./db/mysql');
	},
	"mongodb":function(){
		return require('./db/mongodb');
	},
	"elasticsearch":function(){
		return require('./db/elasticsearch');
	}

};
function getDB(db){
		var temp=options[db];
		if(temp===undefined){
			console.log("[ERROR] Invalid db type :"+db);
			process.exit(0);
		}
		else{
			return options[db]();
		}
		
}
exports.getDB=getDB;