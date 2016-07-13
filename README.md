# bot-marvin

Highly scalable crawler with best features.

Basic useful feature list:

 * Asynchronus crawling
 * Distributed Breadth first crawls
 * Scalable horizontally as well vertically
 * Url partitioning for better scheduling
 * Scheduling using fetch interval and priority
 * Supports robots.txt and sitemap.xml parsing
 * Uses Apache Tika for file parsing
 * Web app for viewing crawled data and analytics
 * Faul Tolerant and Auto Recovery on failures
 * Wide range support of all meta tags and http codes.
 * Support for all the tags advised by google crawl guide.
 * Creates web graph
 * Collects rss feeds and author info
 * Pluggable parsers
 * Pluggable indexers (currently MongoDB supported)

### install

```bash
sudo npm install bot-marvin
```

### Starting your first crawl
```javascript
	//You need to create a seed.json file first
    //it looks like this
    [
         {
            "_id": "http://www.imdb.com",
            "parseFile": "nutch",
            "priority": 1,
            "fetch_interval": "monthly" 
         },
         {
            "_id": "http://www.elastic.co",
            "parseFile": "nutch",
            "priority": 1,
            "fetch_interval": "monthly"
         },
         {
            "_id": "http://www.rottentomatoes.com",
            "parseFile": "nutch",
            "priority": 1,
            "fetch_interval": "monthly"
         }
    ]
    
    /*
    
    _id : is the url
    parseFile : is the file name present in parsers dir (default: 'nutch')
    priority : is from 1-100 indicates the percentage of urls of the domain in a single crawl job.
    Number of urls of a domain in batch = (priority/100) * batch_size
    Fetch interval is recrawl interval supported values (always|weekly|monthly|yearly) you can add custom time intervals in the config
    
    */
    
```



```bash
# Step 1 Set your db configuration
sudo bot-marvin-db
# Step 2 Set your bot config
sudo bot-marvin --config 
# Step 3 Load your seed file
sudo bot-marvin --loadSeedFile <path_to_your_seed_file> 
# Step 4 Run your crawler
sudo bot-marvin
```


## Contributing
    ###Documentation is available at [http://tilakpatidar.github.io/bot-marvin](http://tilakpatidar.github.io/bot-marvin)
1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

### Stuff used to make this:

 * [request](https://www.npmjs.com/package/request) for making http requests
 * [mongodb](https://www.npmjs.com/package/mongodb) for mongodb connectivity
 * [underscore](https://www.npmjs.com/package/underscore) Js utility functions library
 * [immutable](https://www.npmjs.com/package/immutable) Js lib for advanced data structures
 * [check-types](https://www.npmjs.com/package/check-types) for Strict type checking
 * [cheerio](https://www.npmjs.com/package/cheerio) for parsing html pages
 * [robots](https://www.npmjs.com/package/robots) for parsing robots.txt files
 * [colors](https://www.npmjs.com/package/colors) for beautiful consoling
 * [crypto](https://www.npmjs.com/package/crypto) for encryption
 * [death](https://www.npmjs.com/package/death) for handling gracefull exit
 * [minimist](https://www.npmjs.com/package/minimist) for cmd line features
 * [progress](https://www.npmjs.com/package/progress) for download progress bars
 * [string-editor](https://www.npmjs.com/package/string-editor) for providing nano like editor for editing config from terminal 
 * [node-static](https://www.npmjs.com/package/node-static) server for web app
 * [feed-read](https://www.npmjs.com/package/feed-read) for parsing rss feeds