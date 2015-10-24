var config={
	"mongodb_uri":"mongodb://192.168.101.5:27017/dmoz",
	"mongodb_collection":"test"
};
function load(){
	return config;
}
exports.load=load;