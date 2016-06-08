var parent_dir=process.getAbsolutePath(__dirname);
var proto=require(parent_dir+'/lib/proto.js');
var JSONX=proto.JSONX;
var config={
  "robot_agent": "*",
  "childs": 2,
  "child_timeout":1800000,
  "verbose": true,
  "logging": true,
  "parse_sitemaps": true,
  "sitemap_parser_timeout":60000,
  "env": "/usr/local/bin/node",
  "text_editor": "nano",
  "web_graph":true,
  "retry_times_failed_pages":3,
  "failed_queue_size":100,
  "inlink_cache_size":5000,
  "network_interface": "eth0",
  "network_host": "127.0.0.1",
  "network_port": "2020",
  "cluster_port": 5555,
  "http": {
    "http_proxy":"",
    "https_proxy":"",
    "callback_timeout": 20000,
    "timeout": 10000,
    "max_content_length": 10485760,
    "follow_redirect": true,
    "max_sockets_per_host": 10,
    "max_concurrent_sockets": 10,
    "delay_request_same_host":3000,
    "accepted_mime_types":["text/html","text/plain","application/xhtml+xml","text/xhtml"],
    "headers": {
      "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:45.0) Gecko/20100101 Firefox/45.0",
      "Accept": "text/html,application/xhtml+xml,text/plain.text/xhtml;q=0.9",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate",
      "Connection": "keep-alive"
    },
    "html_lang_regex":"^en(-.*|)"
  },
  "log_buffer_lines": 100,
  "recrawl_intervals": {
    "always": 0,
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
  "tika_debug":true,
  "tika_supported_files": "__REGEXP /\\.(ppt|doc|pdf|docx|pptx)$/gi",
  "tika_supported_mime":["application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.ms-powerpoint","application/vnd.openxmlformats-officedocument.presentationml.presentation","application/pdf","application/x-pdf","application/acrobat", "applications/vnd.pdf", "text/pdf", "text/x-pdf"],
  "tika_batch_size": 5,
  "tika_content_length": 104857600,
  "tika_timeout": 300000,
  "tika_max_sockets_per_host": 10,
  "tika_headers":{
      "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:45.0) Gecko/20100101 Firefox/45.0",
      "Accept": "application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/pdf,application/x-pdf,application/acrobat,applications/vnd.pdf,text/pdf,text/x-pdf;q=0.9",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate",
      "Connection": "keep-alive"
    },
  "phantomjs_port": 9000,
  "allow_robots": true,
  "robots_timeout":10000,
  "external_links": false,
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
    "__REGEXP /\\.(gif|jpg|png|ico|css|sit|eps|wmf|zip|ppt|doc|mpg|xls|gz|rpm|tgz|mov|exe|jpeg|bmp|js|swf|pdf|xlsx)$/gi"
  ]
}

function load(){
return JSONX.parse(JSON.stringify(config));
}
exports.load=load;

