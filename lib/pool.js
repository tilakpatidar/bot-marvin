var check = require("check-types")
var parent_dir = process.getAbsolutePath(__dirname);
var log = require(parent_dir + "/lib/logger.js");

/**
	Class which provides selected DB class.
	@param {Message} message_obj
	@author Tilak Patidar <tilakpatidar@gmail.com>
	@constructor

*/
var Pool = function Pool(message_obj) {
    var message = message_obj;
    var db = message.get('config').getConfig('db_type');
    /**
    	Hold requires of various db types.
    	@private
    */
    var options = {
        "mysql": function() {
            return require(parent_dir + '/db/mysql');
        },
        "mongodb": function() {
            return require(parent_dir + '/db/mongodb');
        },
        "elasticsearch": function() {
            return require(parent_dir + '/db/elasticsearch');
        }

    };

    /**
    	Returns Db class.
    	@public

    */
    this.getDB = function() {
        var temp = options[db];
        if (!check.assigned(temp)) {
            msg(("Invalid db type :" + db), "error");
            process.exit(0);
        } else {
            return temp();
        }

    };

    function msg() {
        if (!check.assigned(message.get('log'))) {
            console.log(arguments[0]);
            return;
        }
        message.get('log').put(arguments[0], arguments[1], __filename.split('/').pop(), arguments.callee.caller.name.toString());
    }


};


module.exports = Pool;