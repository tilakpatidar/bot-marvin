var fs=require('fs');
var colors = require('colors/safe');
var temp=__dirname.split("/");
temp.pop();
var parent_dir=temp.join("/");
var config=require(parent_dir+"/config/config").load();
colors.setTheme({
  silly: 'rainbow',
  input: 'grey',
  verbose: 'cyan',
  prompt: 'grey',
  info: 'green',
  data: 'grey',
  help: 'cyan',
  warn: 'yellow',
  debug: 'blue',
  error: 'red'
});
var verbose=false;
var logging=false;
var buffer=[];
var app={
	"appendToLog":function(line){
		buffer.push(line);
		if(buffer.length>1000){
			//flush
			var item=buffer.splice(0,1000);
			fs.appendFile(parent_dir+'/log/test.log',item.join("\n"), function (err) {
			  if (err) throw err;
			});
		}
		
	},
	"put":function(line,color){
		var date=new Date().toString().split(" GMT")[0];
		var con;
		var call=arguments.callee.caller.name.toString();
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
		if(verbose){
			console.log(con(line));
			
		}
		if(logging){
			this.appendToLog(line);
		}
		
		
	},
	"setVerbose":function(bool){
		verbose=bool;
	},
	"setLogging":function(bool){
		logging=bool;
	}
};
app.setVerbose(config["verbose"]);
app.setLogging(config["logging"]);
module.exports=app;