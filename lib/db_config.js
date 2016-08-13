#!/usr/bin/env node

var edit = require('string-editor');
if (process.env.EDITOR === undefined) {
    process.env.EDITOR = "/bin/nano";
}
var check = require("check-types");
var fs = require("fs");
var proto = require(__dirname + "/proto.js");
var parent_dir = proto.getAbsolutePath(__dirname);

/**
	Gets the db_config from the user and writes to disk.
	@constructor
	@author Tilak Patidar <tilakpatidar@gmail.com>

*/
var DBConfig = function() {


    fs.readFile(parent_dir + "/config/db_config.json", function(err, data) {
        if (err) {
            //file must have been deleted
            //create new file
            var stream = fs.createWriteStream(parent_dir + "/config/db_config.json");
            stream.write("{}");
            stream.end();
            stream.on("finish", function() {
                editDBConfig("{}");
            })
        } else {
            editDBConfig(data);
        }

    });

    /**
    	Opens a nano editor with provided config.
    	@private
    	@param {Object} data - JSON data of db_config
    */
    function editDBConfig(data) {

        data = data.toString();
        if (data === "") {
            data = "{}";
        }
        data = JSON.parse(data)
        if (check.emptyObject(data)) {
            //first time edit show help config
            data = "{\n  \"bot_name\": \"zaphod\",\n  \"cluster_name\": \"hitchiker\",\n  \"db_type\": \"mongodb\",\n  \"network_interface\": \"eth0\",\n  \"network_host\": \"127.0.0.1\",\n  \"network_port\": \"2020\",\n  \"cluster_port\": 5555,\n  \"mongodb\": {\n    \"pool_size\": 1000,\n    \"mongodb_uri\": \"mongodb://127.0.0.1:27017/crawl\",\n    \"mongodb_collection\": \"links\",\n    \"bucket_collection\": \"bucket\",\n    \"semaphore_collection\": \"queue\",\n    \"bot_collection\": \"bots\",\n    \"cluster_info_collection\": \"cluster_info\",\n    \"parsers_collection\": \"parsers\",\n    \"sitemap_collection\": \"sitemap_data\",\n    \"robots_collection\": \"robots\",\n    \"graph_collection\": \"graph\",\n    \"seed_collection\": \"seed\",\n    \"author_collection\": \"author\",\n    \"domain_group_collection\": \"domain_groups\"\n  },\n  \"elasticsearch\":{\n    \"host\": \"http://localhost:9200\",\n    \"log\": \"info\",\n    \"index\": \"nutch\",\n    \"type\": \"doc\",\n    \"maxSockets\": 50,\n    \"bulk_batch_size\": 100\n  }\n}\n";
        } else {
            data = JSON.stringify(data, null, 2);
        }
        //console.log("here")
        edit(data, "db.json", function(err, result) {
            fs.writeFile(parent_dir + "/config/db_config.json", result, function(err) {
                if (err) {
                    console.log("Unable to update db config");
                } else {
                    console.log("db config updated");
                }
            })
        });
    };


};


var db = new DBConfig();