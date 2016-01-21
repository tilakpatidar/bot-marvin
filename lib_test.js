var bot;
require('./index.js').init(function(b){
	bot=b;
	//Displays json config of the crawler
	console.log(bot.getConfig());

	//insert a url to crawl
	bot.insertSeed("http://www.geeksforgeeks.org/","nutch",false,5,"monthly",function(status){
		console.log(status);
		//remove url
		bot.removeSeed("http://www.geeksforgeeks.org/",function(status){
			console.log(status);

		});

	});

	

	bot.set("mongodb","mongodb_collection","links");
	//clearing the crawl list
	bot.clearSeed(function(status){
		console.log(status);
	});
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

			bot.loadSeedFile("/home/tilak/Desktop/seed",function(status){
			
				//check if url already present

						bot.isSeedPresent("http://www.stackoverflow.com",function(status){
						console.log(status);

						});

						//use get and set to modify config

						console.log(bot.get("bot_name"));

						bot.set("bot_name","zaphod");

						bot.set("robot_agent","*");

						

						//to verify a property exists

						console.log(bot.isProperty("bot_name"));
						//bot.set("parse_sitemaps",true);
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
		});


});

