var Lock = require(__dirname + '/lock.js');
/**
 * Class represents the various triggers set by other classes for specific events.
 * it is used to share globally shared resources.
 * @constructor
 * @author Tilak Patidar <tilakpatidar@gmail.com>
 */
var Message = function() {

    var that = this;

    var triggers = {

        "caught_termination": false, //Ctrl + C event or SIGKILL
        "begin_intervals": false, //trigger to start other setIntervals once bot is launced successfully
        "force_mode": false, // Remove the lock of previous bot
        "my_timers": [], //setIntervals used throughout the bot, usefull for graceful_exit
        "reset": false, // triggers reset event
        'seedFilePath': null, // seed file path
        "removeSeed": null, //dict of seeds to be removed from seed file
        "success_start": false, //if true, then bot has successfully loaded all components and started
        "bot_stopped": null, //if true, bot is successfully stopped
        "distinct_fetch_intervals": {}, //distinct fetch intervals are stored and marked true/false based on current usage for bucket creation
        "domain_group": [], //the list of domains alloted to the bot, it's format is just like a seed file
        "starter_lock": new Lock(), //used in child_manager.js to lock getNextBatch
        "bucket_creator_lock": new Lock(), //used in bucket.js to lock the bucket creator
        "failed_batch_lock": new Lock(), //used in child_manager.js to lock failed queue child creator
        "cluster_master": null, //is this bot running as cluster master
        "proxy_cache": null, //url cache for faster bucket creation
        "inlinks_pool": [], //used in child_manager.js to store discovered urls by spawned workers
        "tikaPID": NaN, //current pid of tika-server.jar
        "log": null, //Logger
        "config": null, //Config
        "mongodb_pool": null,//MongoDB
        "links_store": null, //stores the data from domain_group collection
        "tika_indexer_busy": new Lock(), //used in child_manager.js to lock tika indexer setInterval
        "rss_updator_lock": new Lock() //used in childmanger.js to lock rss update
    }; //these are shared globally to trigger various async events


    /*
            [ { _id: 'ffd1a56dd8e26ef3c548b7f3430b5269',
            domains: 
             [ [Object],
               [Object],
               [Object],
               [Object],
               [Object],
               [Object],
               [Object],
               [Object],
               [Object],
               [Object] ],
            fetch_interval: 'monthly',
            bot_name: 'zaphod' } ]    <======  'domain_group'



            [ 'ffd1a56dd8e26ef3c548b7f3430b5269' ] <======= 'alloted_domain_groups'




            { 'http://www.whitelabelhost.in':     <========== 'links_store'
               { _id: 'http://www.whitelabelhost.in',
                 parseFile: 'nutch',
                 priority: 1,
                 fetch_interval: 'monthly' },
              'http://www.anatta.in': 
               { _id: 'http://www.anatta.in',
                 parseFile: 'nutch',
                 priority: 1,
                 fetch_interval: 'monthly' },
              'http://www.news-stand.in': 
               { _id: 'http://www.news-stand.in',
                 parseFile: 'nutch',
                 priority: 1,
                 fetch_interval: 'monthly' },
              'http://www.chococraft.in': 
               { _id: 'http://www.chococraft.in',
                 parseFile: 'nutch',
                 priority: 1,
                 fetch_interval: 'monthly' },
              'http://www.frivil.in': 
               { _id: 'http://www.frivil.in',
                 parseFile: 'nutch',
                 priority: 1,
                 fetch_interval: 'monthly' },
              'http://www.customercarenumbers.co.in': 
               { _id: 'http://www.customercarenumbers.co.in',
                 parseFile: 'nutch',
                 priority: 1,
                 fetch_interval: 'monthly' },
              'http://www.dgvcl.in': 
               { _id: 'http://www.dgvcl.in',
                 parseFile: 'nutch',
                 priority: 1,
                 fetch_interval: 'monthly' },
              'http://www.absplastic.in': 
               { _id: 'http://www.absplastic.in',
                 parseFile: 'nutch',
                 priority: 1,
                 fetch_interval: 'monthly' },
              'http://www.smshorizon.co.in': 
               { _id: 'http://www.smshorizon.co.in',
                 parseFile: 'nutch',
                 priority: 1,
                 fetch_interval: 'monthly' },
              'http://www.andsanddekh.in': 
               { _id: 'http://www.andsanddekh.in',
                 parseFile: 'nutch',
                 priority: 1,
                 fetch_interval: 'monthly' } } 'links_store'




    */


    /** 
    	Sets the trigger property of private var triggers. 
    	@param {String} key
    	@param {Object} value

    	@public
    */


    this.set = function set(key, value) {

        //first check special triggers
        switch (key) {
            case "stop_bot_and_exit":
                that.get('crawler').exit(function() {
                    that.set('bot_stopped', true);
                });

                break;

            case "grace_exit":
                that.crawler.exit(function() {
                    that.get('crawler').set('bot_stopped', true);
                });
                break;

            case "restart":
                that.get('crawler').restart();
                break;
        };

        triggers[key] = value;

    };


    /** 
    	Get the trigger value. 
    	@param {String} key
    	@public
    */
    this.get = function get(key) {
        return triggers[key];
    };

};

module.exports = Message;