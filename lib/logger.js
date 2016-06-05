var fs = require('fs');
var colors = require('colors/safe');
var check = require('check-types');
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

function Logger() {

    //private vars
    var terminal_buffer = [];
    var buffer = [];
    var parent_dir = process.getAbsolutePath(__dirname);
    
    //public methods


    this.flush = function flush(fn) {
    	var config = process.bot_config;
        fs.appendFile(parent_dir + '/log/test.log', buffer.join("\n"), function(err) {
            if (err) throw err;
            return fn();
        });
    };

    this.appendToLog = function appendToLog(line) {
    	var config = process.bot_config;
        buffer.push(line);
        if (buffer.length > config.getConfig("log_buffer_lines")) {
            //flush
            var item = buffer.splice(0, config.getConfig("log_buffer_lines"));
            fs.appendFile(parent_dir + '/log/test.log', item.join("\n"), function(err) {
                if (err) throw err;
            });
        }
    };

    this.put = function put(line, color, file_name, caller) {
    	var config = process.bot_config;
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
            this.appendToLog(line);
        }
        terminal_buffer = terminal_buffer.splice(terminal_buffer.length - 50); //keeping size const
        terminal_buffer.push(line);


    };

    this.isVerbose = function() {
    	var config = process.bot_config;
        return config.getConfig("verbose");
    };

    this.isLogging = function() {
    	var config = process.bot_config;
        return config.getConfig("logging");
    }

    this.getTerminalData = function() {
    	var config = process.bot_config;
        return terminal_buffer;
    }


}

var logger_obj = new Logger();
module.exports = logger_obj;