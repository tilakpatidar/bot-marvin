# bot-marvin

Highly scalable crawler with best features.

Basic useful feature list:

 * Asynchronus crawling
 * Url partitioning for better scheduling
 * Scheduling using fetch interval and priority
 * Cluster model with no master
 * Web app for viewing crawled data and analytics
 * Uses Apache Tika for file parsing
 * Supports robots.txt rules
 * Supports seeding using sitemap.xml files
 * Auto cluster restart on config changes
 * Faul Tolerant and Auto Recovery on failures
 * Pluggable parsers
 * Pluggable indexers (currently MongoDB supported)
 * Can also write your own parsers for different domains
 * Uses phantomjs for dynamic pages

### install

```bash
sudo npm install bot-marvin
```

### API

Setting up bot object
```javascript
var bot;
require('bot-marvin').init(function(b){
	bot=b;	//global bot object
    
});
```

Making configuration changes
```javascript
bot.getConfig(); //shows complete configuration json file


bot.get("db_type");  //show config value for certain property

bot.set("db_type","mongodb");	//sets value for a certain property
bot.set("logging",true);
bot.set("verbose",true);

bot.isProperty("bot_name"); //shows if property exists

```

Making nested configuration changes
```javascript

bot.get("mongodb","mongodb_uri");  //accepts var args to traverse json

bot.set"mongodb","mongodb_uri","mongodb://127.0.0.1:27017/crawl");	//accepts var args for traversing last parameter is value

```


Seeding the bot
```javascript
bot.isSeedPresent("http://www.stackoverflow.com",function(status){
	console.log(status); //checks if seed present
});
bot.loadSeedFile("/home/tilak/Desktop/seed",function(status){
	//loading seeds from file
    //format of csv file
    //<url>\t<parseFileName>\t<phantomjs_rendering(true/false)>\t<priority>\t<fetch_interval(daily/weekly/monthly/yearly)>
    
    
    //example
    /*
      http://www.google.com	nutch	false	5	monthly
      http://www.dmoz.org	nutch	false	5	monthly
      http://9gag.com	nutch	false	5	monthly
    */

});


//insert seed 	url,parse_file,priority,fetch_interval,callback
bot.insertSeed("http://www.geeksforgeeks.org/","nutch",false,5,"monthly",function(status){
		console.log(status);

});

//update seed 	url,parse_file,priority,fetch_interval,callback
bot.updateSeed("http://www.geeksforgeeks.org/","nutch",false,5,"monthly",function(status){
		console.log(status);

});

//remove url
bot.removeSeed("http://www.geeksforgeeks.org/",function(status){
	console.log(status);
});

//clear seed for bot
bot.clearSeed(function(status){
	console.log(status);
});

```

Crawler operations
```javascript
// start crawling  
//args:force_mode(true/default=false) (Usage :if same bot exists in cluster it will kill it)
bot.crawl(true);

//reset crawler
//This will drop all crawled pages and revert all configurations

bot.reset(function(status){

}:

```


Working with parsers

There are two functions for writing your own parser for particular domain.
* WebPage function functon(dictionary_for_db,html_data,cheerio_obj)
* File function	functon(dictionary_for_db,file_data)

Below is the example
```javascript
// args:parser_label,WebPage_function,File_function,callback
bot.setParser("custom_parser",function(dic.html,$){
	dic["my_new_title"]=$("title").text();
    
    //in db you will see my_new_title with title text


},function(d,f){},function(status){

	//callback

});

```
API is underconstruction.


## Contributing
1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

### Stuff used to make this:

 * [request](https://www.npmjs.com/package/request) for making http requests
 * [mongodb](https://www.npmjs.com/package/mongodb) for mongodb connectivity
 * [sqlite3](https://www.npmjs.com/package/sqlite3) for local caching
 * [underscore](https://www.npmjs.com/package/underscore) JS utility functions library
 * [check-types](https://www.npmjs.com/package/check-types) for Strict type checking
 * [cheerio](https://www.npmjs.com/package/cheerio) for parsing html pages
 * [colors](https://www.npmjs.com/package/colors) for beautiful consoling
 * [crypto](https://www.npmjs.com/package/crypto) for encryption
 * [death](https://www.npmjs.com/package/death) for handling gracefull exit
 * [minimist](https://www.npmjs.com/package/minimist) for cmd line features
 * [phantomjs](https://www.npmjs.com/package/phantomjs) for dynamic rendering
 * [phantom](https://www.npmjs.com/package/phantom) interface for phantomjs
 * [progress](https://www.npmjs.com/package/progress) for download progress bars
 * [node-static](https://www.npmjs.com/package/node-static) server for web app