var fs = require("fs");
var proto = require(__dirname + "/proto.js");
var parent_dir = proto.getAbsolutePath(__dirname);
var check = require("check-types");
var crypto = require('crypto');

/**
	Checks software dependencies.
	@constructor
	@author Tilak Patidar <tilakpatidar@gmail.com>
*/

var DepCheck = function() {

    /**
    	Stores various dependencies and their functions.
    	@type Object
    	@private
    */
    var dependencies = {
        "check-tika": function() {
            try {
                var data = fs.readFileSync(__dirname + "/tika-server-1.11.jar");
            } catch (err) {
                console.log("Tika server not found please run\n bot-marvin-init");
                return false;
            }

            var md5sum = crypto.createHash('md5');
            md5sum.update(data);
            var hash = md5sum.digest('hex');
            if (hash !== "7e28f3288c3bcd0c26ac6f557ddfb977") {
                console.log("Tika server not found please run\n bot-marvin-init");
                return false;
            }
            return true;
        },
        "check-db": function() {
            try {
                var string_data = fs.readFileSync(parent_dir + "/config/db_config.json").toString()
                var data = JSON.parse(string_data);
                if (!check.assigned(data) || check.emptyObject(data)) {
                    console.log("Db config not set. Set using bot-marvin-db");
                    return false;
                }
            } catch (err) {
                //file not exists touch the file and exit
                //or may be a parsing error
                console.log("Db config not set. Set using bot-marvin-db");
                touchDbConfigFile();
                return false;

            }
            return true;
        },
        "check-pid": function() {
            try {
                var string_data = fs.readFileSync(parent_dir + "/db/pids/active_pids.txt");
            } catch (err) {
                touchActivePidFile();
                return false;
            }
            return true;
        }
    };



    /**
    	Touches the pid file if not exists;
    	@private
    */
    function touchActivePidFile() {
        var stream = fs.createWriteStream(parent_dir + "/db/pids/active_pids.txt");
        stream.write(JSON.stringify({}, null, 2));
        stream.end();
    }

    /**
    	Touches the db config file.
    	@private
    */
    function touchDbConfigFile() {
        try {
            var stream = fs.createWriteStream(parent_dir + "/config/db_config.json");
            stream.write(JSON.stringify({}, null, 2));
            stream.end();

        } catch (ee) {
            //error in creating config file
            console.log(ee)
                //console.log(ee,"s")
        }
    };


    /**
    	Checks all dependencies and returns true if all met.
    	@public
    */
    this.check = function() {
        for (var key in dependencies) {
            var status = dependencies[key]();
            if (!status) {
                return false;
            }
        }
        return true;
    };


};

module.exports = DepCheck;