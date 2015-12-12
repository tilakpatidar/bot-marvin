var bot=require('./index.js').init();

//Displays json config of the crawler
console.log(bot.getConfig());

//insert a url to crawl
bot.insertSeed("http://www.geeksforgeeks.org/","nutch",false);

//remove url
bot.removeSeed("http://www.geeksforgeeks.org/");

bot.set("headers",{"User-Agent":"Mozilla/5.0 (X11; Linux i686) AppleWebKit/535.7 (KHTML, like Gecko) Chrome/16.0.912.63 Safari/535.7",
		"Accept-Language":"en-us,en-gb,en;"
	});
//clearing the crawl list
bot.clearSeed();
bot.set("db_type","mongodb");
bot.set("logging",true);
bot.set("verbose",true);
//to reset the crawler
bot.reset(function(){


	//loading a seed file
	//format of seed file
	//tuples of <url>\t<parseFileName>\t<phantomjs_rendering(true/false)>
	//seprated by new lines

	//ex http://www.google.com	nutch	false
	//   http://www.yahoo.com	nutch	true

	bot.loadSeedFile("/home/tilak/Desktop/seed");
	//check if url already present

	console.log(bot.isSeedPresent("http://www.stackoverflow.com"));

	//use get and set to modify config

	console.log(bot.get("bot_name"));

	bot.set("bot_name","zaphod");

	bot.set("robot_agent","*");

	

	//to verify a property exists

	console.log(bot.isProperty("bot_name"));

	bot.crawl();


	/* some test cases for tika testing

	bot.insertSeed("https://training.github.com/kit/downloads/github-git-cheat-sheet.pdf","nutch",false);	
	bot.insertSeed("http://ra.adm.cs.cmu.edu/anon/anon/isri2005/CMU-ISRI-05-100.pdf","nutch",false);	
	bot.insertSeed("http://ra.adm.cs.cmu.edu/anon/anon/isri2005/CMU-ISRI-05-104.pdf","nutch",false);	
	bot.insertSeed("http://ra.adm.cs.cmu.edu/anon/anon/isri2005/CMU-ISRI-05-116.pdf","nutch",false);	
	bot.insertSeed("http://ra.adm.cs.cmu.edu/anon/anon/isri2005/CMU-ISRI-05-121.pdf","nutch",false);	
	bot.insertSeed("http://ra.adm.cs.cmu.edu/anon/anon/isri2005/CMU-ISRI-05-132.pdf","nutch",false);

	*/




});
