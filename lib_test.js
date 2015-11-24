var bot=require('./index.js').init();

//Displays json config of the crawler
//console.log(bot.getConfig());

//insert a url to crawl
bot.insertSeed("http://www.geeksforgeeks.org/","nutch",false);

//remove url
bot.removeSeed("http://www.geeksforgeeks.org/");

bot.set("mongodb",{"mongodb_uri": "mongodb://192.168.101.5:27017/crawl1","mongodb_collection": "10",});