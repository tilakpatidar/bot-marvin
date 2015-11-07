var config={
	"mongodb":{
		"mongodb_uri":"mongodb://192.168.101.5:27017/crawl55",
		"mongodb_collection":"1",
		"bucket_collection":"bucket"
	},
	"mysql":{
		"mysql_uri":""
	},
	"elasticsearch":{
		"elasticsearch_uri":""
	},
	"allow_robots":false,
	"external_links":false,
	"seed_file":"seed",
	"childs":5,
	"max_concurrent_sockets":10,
	"batch_size":1000,
	"db_type":"mongodb",
	"social_media_external_links_allow":false,
	"social_media_sites_allow":['http://www.twitter.com','http://www.facebook.com','http://www.linkedin.com','http://www.instagram.com','http://www.youtube.com'],
	"remove_tags":["table","style","script","noscript","img","form","input","iframe","header","footer","button","pre","br","code","select","option","nav"]
};
function load(){
	return config;
}
exports.load=load;


