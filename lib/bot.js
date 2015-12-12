var temp=__dirname.split("/");
temp.pop();
var parent_dir=temp.join("/");
var config=require(parent_dir+"/lib/config-reloader.js");
var bot={
	"_id":"",
	"registerTime":"",
	"createdBuckets":0,
	"processedBuckets":0,
	"crawledPages":0,
	"failedPages":0
};
bot['_id']=config.getConfig('bot_name');
bot['registerTime']=new Date();
var obot=JSON.parse(JSON.stringify(bot));
function update(key,value){
  if(typeof value ==="number"){
  	//will be incremented by the value given
  	bot[key]=bot[key]+value;
  }else{
  	bot[key]=value;
  }
};
function getBotData(){
	//data is reseted when it is pulled
	var b=JSON.parse(JSON.stringify(bot));
	bot=JSON.parse(JSON.stringify(obot));
	return b;
};
var dic={update:update,getBotData:getBotData};
module.exports=dic;
