var config={
	"robot_agent":"*",
	"bot_name":"zapphod",
	"mongodb":{
		"mongodb_uri":"mongodb://192.168.101.5:27017/crawl",
		"mongodb_collection":"1",
		"bucket_collection":"bucket"
	},
	"mysql":{
		"mysql_uri":""
	},
	"elasticsearch":{
		"elasticsearch_uri":""
	},
	"recrawl_interval":2592000000,
	"tika_host":"0.0.0.0",
	"tika_port":"9998",
	"tika":true,
	"tika_supported_files":/\.(ppt|doc|pdf|docx|pptx)$/gi,
	"phantomjs_url":"http://192.168.101.5:9000/?q=",
	"allow_robots":true,
	"external_links":false,
	"seed_file":"seed",
	"childs":5,
	"max_concurrent_sockets":10,
	"batch_size":100,
	"db_type":"mongodb",
	"remove_tags":["table","style","script","noscript","img","form","input","iframe","header","footer","button","pre","br","code","select","option","nav"]
};
function load(){
	return config;
}
exports.load=load;

