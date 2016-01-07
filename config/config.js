var parent_dir=process.getAbsolutePath(__dirname);
var proto=require(parent_dir+'/lib/proto.js');
var JSONX=proto.JSONX;
var config={
  "robot_agent": "*",
  "bot_name": "zaphod",
  "cluster_name": "hitchiker",
  "childs": 5,
  "verbose": true,
  "logging": true,
  "network_interface": "lo",
  "network_host": "127.0.0.1",
  "network_port": "2020",
  "cluster_port": 5555,
  "env": "/usr/local/bin/nodejs",
  "headers": {
    "User-Agent": "Mozilla/5.0 (X11; Linux i686) AppleWebKit/535.7 (KHTML, like Gecko) Chrome/16.0.912.63 Safari/535.7",
    "Accept-Language": "en-us,en-gb,en;"
  },
  "mongodb": {
    "mongodb_uri": "mongodb://127.0.0.1:27017/crawl",
    "mongodb_collection": "links",
    "bucket_collection": "bucket",
    "semaphore_collection": "queue",
    "bot_collection": "bots",
    "cluster_info_collection": "cluster_info",
    "parsers_collection": "parsers",
    "sitemap_collection": "sitemap_data"
  },
  "mysql": {
    "mysql_host": "127.0.0.1",
    "mysql_user": "root",
    "mysql_password": "1",
    "mysql_db": "crawl",
    "mysql_collection": "links",
    "bucket_collection": "bucket",
    "semaphore_collection": "queue",
    "bot_collection": "bots",
    "cluster_info_collection": "cluster_info",
    "parsers_collection": "parsers",
    "mysql_pool": 100
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
  "log_buffer_lines": 10,
  "recrawl_intervals": {
    "monthly": 2592000000,
    "daily": 86400000,
    "weekly": 604800000,
    "yearly": 31536000000
  },
  "default_recrawl_interval": "monthly",
  "override_recrawl_interval_of_sitesmap_file": false,
  "tika_host": "0.0.0.0",
  "tika_port": "9998",
  "tika": true,
  "tika_supported_files": "__REGEXP /\\.(ppt|doc|pdf|docx|pptx)$/gi",
  "tika_batch_size": 5,
  "phantomjs_url": "http://127.0.0.1:9000/?q=",
  "allow_robots": true,
  "external_links": false,
  "max_concurrent_sockets": 10,
  "batch_size": 1000,
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

