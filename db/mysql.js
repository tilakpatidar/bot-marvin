//global connection to mongodb
//mongodb connection file
var MySQLClient = require('mysql');
var parent_dir=process.getAbsolutePath(__dirname);
var log=require(parent_dir+"/lib/logger.js");
var config=require(parent_dir+"/lib/config-reloader.js");
var fs=require('fs');
var cluster;
var proto=require(parent_dir+'/lib/proto.js');
var JSONX=proto.JSONX;
var ObjectX=proto.ObjectX;
var mysql_collection=config.getConfig("mysql","mysql_collection");
var bucket_collection=config.getConfig("mysql","bucket_collection");
var bot_collection=config.getConfig("mysql","bot_collection");
var semaphore_collection=config.getConfig("mysql","semaphore_collection");
var cluster_info_collection=config.getConfig("mysql","cluster_info_collection");
var parsers_collection=config.getConfig("mysql","parsers_collection");
var mongoToSQL=require(parent_dir+"/db/lib/mongo_to_sql.js");
//read seed file

function mysql_real_escape_string (str) {
    return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
        switch (char) {
            case "\0":
                return "\\0";
            case "\x08":
                return "\\b";
            case "\x09":
                return "\\t";
            case "\x1a":
                return "\\z";
            case "\n":
                return "\\n";
            case "\r":
                return "\\r";
            case "\"":
            case "'":
            case "\\":
            case "%":
                return "\\"+char; // prepends a backslash to backslash, percent,
                                  // and double/single quotes
        }
    });
}


var pool={
	"createConnection":function(fn){
		var err;
		try{
			process.connection = MySQLClient.createConnection({
			  host     : config.getConfig("mysql","mysql_host"),
			  user     : config.getConfig("mysql","mysql_user"),
			  password : config.getConfig("mysql","mysql_password"),
			  multipleStatements:true
			});
			process.connection.connect();
			pool.setupTables(function(){

				mongoToSQL.init(process.mysql_pool);
				fn(err,process.mysql_pool);
			});

		}catch(err){
			fn(err,null);
		}
		
		
	
	},
	"setupTables":function(fn){
		process.connection.query('CREATE DATABASE '+config.getConfig("mysql","mysql_db" ),function(err, rows, fields) {
			 
			  process.mysql_pool = MySQLClient.createPool({
			  connectionLimit : config.getConfig("mysql","mysql_pool"),
			  host     : config.getConfig("mysql","mysql_host"),
			  user     : config.getConfig("mysql","mysql_user"),
			  password : config.getConfig("mysql","mysql_password"),
			  database : config.getConfig("mysql","mysql_db"),
			  multipleStatements:true
			});
			process.mysql_pool.getConnection(function(err,connection){
				connection.query("CREATE TABLE "+config.getConfig("mysql","mysql_collection")+" ( _id VARCHAR(767) PRIMARY KEY,done TINYINT(1),domain VARCHAR(767),data LONGTEXT,hash VARCHAR(25),response VARCHAR(20),lastModified VARCHAR(25))", function(err, rows, fields) {
			  		connection.query("CREATE TABLE "+config.getConfig("mysql","bucket_collection")+" ( _id VARCHAR(100) PRIMARY KEY,underProcess TINYINT(1),bot VARCHAR(25),recrawlAt BIGINT(25),lastModified TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)", function(err, rows, fields) {
			  			connection.query("CREATE TABLE "+config.getConfig("mysql","semaphore_collection")+" ( _id INT(100) PRIMARY KEY AUTO_INCREMENT,bot_name VARCHAR(25),requestTime DATE)", function(err, rows, fields) {
				  			connection.query("CREATE TABLE "+config.getConfig("mysql","bot_collection")+" ( _id VARCHAR(25) PRIMARY KEY,registerTime INT(20),active TINYINT(1),config LONGTEXT,createdBuckets INT(20),processedBuckets INT(20),crawledPages INT(20),failedPages INT(20))", function(err, rows, fields) {
						  			connection.query("CREATE TABLE "+config.getConfig("mysql","cluster_info_collection")+" ( _id VARCHAR(25) PRIMARY KEY,createdAt DATE,registerTime INT(20),webapp_host VARCHAR(20),webapp_port VARCHAR(20),initiatedBy VARCHAR(20),seedFile LONGTEXT)", function(err, rows, fields) {
							  			
										connection.query("CREATE TABLE "+config.getConfig("mysql","parsers_collection")+" ( _id VARCHAR(25) PRIMARY KEY,data LONGBLOB,hash VARCHAR(100))", function(err, rows, fields) {
							  			
	
								  			connection.release();
								  			fn();
							
										});
						
									});
								});
						});
			
					});
		
				});

			}); 
			  
		
		});
	},
	"close":function(){
		process.connection.end();
		process.mysql_pool.end();
	},
	"drop":function(fn){
		process.connection.query("DROP DATABASE "+config.getConfig("mysql","mysql_db"),function(err,rows,fields){
			fn();


		});
	},
	"seedCount":0,
	"cache":{}
};



/*

Adding same functions from mongodb plugin

*/

var mongodb=ObjectX.clone(require(parent_dir+"/db/mongodb.js").getDic(),true);//get the basic functionality from the mongodb std module
for(var keys in pool){
	delete mongodb[keys];
}
for(var keys in mongodb){
	pool[keys]=mongodb[keys];
}
pool.setParent();
var obj=mongoToSQL.inject();//injecting the pool var with utility functions
for(var keys in config.getConfig("mysql")){
		(function(keys){
			if(keys.indexOf("_collection")>=0){
				if(pool[keys]===undefined){
					pool[keys]={};
				}
				pool[keys]=obj;
				pool[keys]['table_name']=keys;//saving table name
			}
		})(keys);
}



//End of adding functions from mongodb.js

process.pool_check_mode=setInterval(function(){
	if(process.MODE==='exec'){
		var c=setInterval(function(){
			pool.seedReloader();

		},10000);
		process.my_timers.push(c);
		var d=setInterval(function(){
			pool.parserReloader();

		},10000);
		process.my_timers.push(d);
		clearInterval(process.pool_check_mode);//once intervals are set clear the main interval
	}
},5000);




function init(){
	return pool;
}
//console.log(pool);
exports.init=init;
