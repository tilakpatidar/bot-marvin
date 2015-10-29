var config={
	"mongodb":{
		"mongodb_uri":"mongodb://192.168.101.5:27017/gov",
		"mongodb_collection":"3",
		"bucket_collection":"bucket"
	},
	"mysql":{
		"mysql_uri":""
	},
	"elasticsearch":{
		"elasticsearch_uri":""
	}
};
function load(){
	return config;
}
exports.load=load;


