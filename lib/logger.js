var fs = require('fs');
var colors = require('colors/safe');
var check = require('check-types');
var parent_dir = process.getAbsolutePath(__dirname);
colors.setTheme({
    silly: 'rainbow',
    input: 'grey',
    verbose: 'cyan',
    prompt: 'grey',
    info: 'green',
    no_verbose: 'reset',
    data: 'grey',
    help: 'cyan',
    warn: 'yellow',
    debug: 'blue',
    error: 'red'
});

/**

	Logger service for the crawler
	@author Tilak Patidar <tilakpatidar@gmail.com>
	@param {Message} message_obj
	@constructor

*/
function Logger(message_obj) {

    var message = message_obj;
    var config = message.get('config');

    //private vars
    /**
    	Buffer for terminal output, accessed by web service to get terminal contents.
    	@private
    	@type Array
    */
    var terminal_buffer = [];

    /**
		Logger buffer.
		@private
		@type Array
    */
    var buffer = [];
    //public methods

    /**
		Flushes buffer contents to log file.
		@public
		@param {Function} fn -callback
    */
    this.flush = function flush(fn) {
        fs.appendFile(parent_dir + '/log/test.log', buffer.join("\n"), function(err) {
            if (err) throw err;
            return fn();
        });
    };

    /**
		Writes string to log file.
		@private
		@param {String} line

    */
    var appendToLog = function appendToLog(line) {
        buffer.push(line);
        if (buffer.length > config.getConfig("log_buffer_lines")) {
            //flush
            var item = buffer.splice(0, config.getConfig("log_buffer_lines"));
            fs.appendFile(parent_dir + '/log/test.log', item.join("\n"), function(err) {
                if (err) throw err;
            });
        }
    };


    /**
		Main method, called by modules to log an event.
		@param {String} line - main description
		@param {String} color - msg type [error, success, info]
		@param {String} file_name
		@param {String} caller - function from which it is called

    */
    this.put = function put(line, color, file_name, caller) {
        var date = new Date().toString().split(" GMT")[0];
        var con;
        var call = [];
        call.push(file_name);
        if (check.assigned(caller) && caller.trim() !== "") {
            call.push(caller);
        }

        call = call.join(" => ");


        if (color === "success") {
            line = "[ " + date + " ][" + call + "][SUCCESS] " + line;
            con = colors.info;

        } else if (color === "error") {
            line = "[ " + date + " ][" + call + "][ERROR] " + line;
            con = colors.error;
        } else if (color === "info") {
            line = "[ " + date + " ][" + call + "][INFO] " + line;
            con = colors.warn;
        } else if (color === "no_verbose") {
            con = colors.no_verbose;
        }
        if (this.isVerbose()) {
            console.log();
            console.log(con(line));
        } else {
            if (color === "no_verbose") {
                console.log(con(line));
            }
        }
        if (this.isLogging()) {
            appendToLog(line);
        }
        terminal_buffer = terminal_buffer.splice(terminal_buffer.length - 50); //keeping size const
        terminal_buffer.push(line);


    };

    /**
		check if verbose is set.
		@public
		@returns {boolean}
    */
    this.isVerbose = function() {
        return config.getConfig("verbose");
    };

    /**
		check if logging is set.
		@public
		@returns {boolean}
    */
    this.isLogging = function() {
        return config.getConfig("logging");
    }


    /**
		Get terminal data.
		@public
		@returns {Array}
    */
    this.getTerminalData = function() {
        return terminal_buffer;
    }


}


module.exports = Logger;