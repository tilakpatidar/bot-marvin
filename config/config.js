var temp=__dirname.split("/");
temp.pop();
var parent_dir=temp.join("/");
var proto=require(parent_dir+'/lib/proto.js');
var JSONX=proto.init;
var config={
  "robot_agent": "*",
  "bot_name": "zaphod",
  "verbose": false,
  "logging": true,
  "headers": {
    "User-Agent": "Mozilla/5.0 (X11; Linux i686) AppleWebKit/535.7 (KHTML, like Gecko) Chrome/16.0.912.63 Safari/535.7",
    "Accept-Language": "en-us,en-gb,en;"
  },
  "mongodb": {
    "mongodb_uri": "mongodb://192.168.101.5:27017/crawl",
    "mongodb_collection": "1",
    "bucket_collection": "bucket"
  },
  "mysql": {
    "mysql_uri": "",
    "mysql_collection": "1",
    "bucket_collection": "bucket"
  },
  "elasticsearch": {
    "elasticsearch_uri": ""
  },
  "file": {
    "max_content_length": 104857600
  },
  "http": {
    "timeout": 10000,
    "max_content_length": 10485760,
    "follow_redirect": true
  },
  "log_buffer_lines": 1000,
  "recrawl_interval": 2592000000,
  "tika_host": "0.0.0.0",
  "tika_port": "9998",
  "tika": true,
  "tika_supported_files": "__REGEXP /\\.(ppt|doc|pdf|docx|pptx)$/gi",
  "phantomjs_url": "http://192.168.101.5:9000/?q=",
  "allow_robots": true,
  "external_links": false,
  "childs": 2,
  "max_concurrent_sockets": 10,
  "batch_size": 100,
  "db_type": "mongodb",
  "remove_tags": [
    "table",
    "style",
    "script",
    "noscript",
    "img",
    "form",
    "input",
    "iframe",
    "header",
    "footer",
    "button",
    "pre",
    "br",
    "code",
    "select",
    "option",
    "nav"
  ],
  "accept_regex": "__REGEXP /http(|s):\\/\\/archive\\.org\\/details\\/.+|http(|s):\\/\\/archive\\.org\\/details\\/texts\\?&sort=-downloads&page=.+/gi",
  "reject_regex": [
    "__REGEXP /^(file|ftp|mailto|javascript|javascrpt|skype|whatsapp|tel):/g",
    "__REGEXP /\\.(gif|jpg|png|ico|css|sit|eps|wmf|zip|ppt|doc|mpg|xls|gz|rpm|tgz|mov|exe|jpeg|bmp|js|swf|pdf)$/gi"
  ]
}

function load(){
return JSONX.parse(JSON.stringify(config));
}
exports.load=load;

