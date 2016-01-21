var fs=require('fs');
var colors = require('colors/safe');
var parent_dir=process.getAbsolutePath(__dirname);
var config=require(parent_dir+"/lib/config-reloader.js");
colors.setTheme({
  silly: 'rainbow',
  input: 'grey',
  verbose: 'cyan',
  prompt: 'grey',
  info: 'green',
  no_verbose:'reset',
  data: 'grey',
  help: 'cyan',
  warn: 'yellow',
  debug: 'blue',
  error: 'red'
});
var buffer=[];
var terminal_buffer=[];
var app={
	"flush":function(fn){
		fs.appendFile(parent_dir+'/log/test.log',buffer.join("\n"), function (err) {
			  if (err) throw err;
			  fn();
		});
	},
	"appendToLog":function(line){
		buffer.push(line);
		if(buffer.length>config.getConfig("log_buffer_lines")){
			//flush
			var item=buffer.splice(0,config.getConfig("log_buffer_lines"));
			fs.appendFile(parent_dir+'/log/test.log',item.join("\n"), function (err) {
			  if (err) throw err;
			});
		}
		
	},
	"put":function(line,color){
		var date=new Date().toString().split(" GMT")[0];
		var con;
		try{
			var call=arguments.callee.caller.name.toString();
		}catch(err){
			var call="";
		}
		
		if(color==="success"){
			line="[ "+date+" ]["+call+"][SUCCESS] "+line;
			con=colors.info;

		}
		else if(color==="error"){
			line="[ "+date+" ]["+call+"][ERROR] "+line;
			con=colors.error;
		}
		else if(color==="info"){
			line="[ "+date+" ]["+call+"][INFO] "+line;
			con=colors.warn;
		}
		else if (color==="no_verbose") {
			con=colors.no_verbose;
		}
		if(app.isVerbose()){
			console.log(con(line));
		}
		else{
			if(color==="no_verbose"){
				console.log(con(line));
			}
		}
		if(app.isLogging()){
			this.appendToLog(line);
		}
		terminal_buffer=terminal_buffer.splice(terminal_buffer.length-50);//keeping size const
		terminal_buffer.push(line);
		
		
	},
	"isVerbose":function(){
		return config.getConfig("verbose");
	},
	"isLogging":function(){
		return config.getConfig("logging");
	},
	"getTerminalData":function(){
		return terminal_buffer;
	}
};

module.exports=app;