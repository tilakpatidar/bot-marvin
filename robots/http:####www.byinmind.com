{"entries":[],"sitemaps":[],"defaultEntry":"","disallowAll":false,"statusCode":200,"allowAll":false,"options":{"headers":{"userAgent":"Mozilla/5.0 (X11; Linux i686; rv:5.0) Gecko/20100101 Firefox/5.0"}},"url":"http://www.byinmind.com/robots.txt","chunks":["<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.0 Strict//EN\" \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd\">\r\n<!--[if IE 6]><html itemscope itemtype=\"http://schema.org/Product\" xmlns=\"http://www.w3.org/1999/xhtml\" class=\"ie6 ie\"><![endif]-->\r\n<!--[if IE 7]><html itemscope itemtype=\"http://schema.org/Product\" xmlns=\"http://www.w3.org/1999/xhtml\" class=\"ie7 ie\"><![endif]-->\r\n<!--[if IE 8]><html itemscope itemtype=\"http://schema.org/Product\" xmlns=\"http://www.w3.org/1999/xhtml\" class=\"ie8 ie\"><![endif]-->\r\n<!--[if IE 9]><html itemscope itemtype=\"http://schema.org/Product\" xmlns=\"http://www.w3.org/1999/xhtml\" class=\"ie9 ie\"><![endif]-->\r\n<!--[if !IE]><!-->\r\n<html itemscope itemtype=\"http://schema.org/Product\" xmlns=\"http://www.w3.org/1999/xhtml\" class=\"notie\">\r\n\t<!--<![endif]-->\r\n\t<head>\r\n\t\t<meta http-equiv=\"content-type\" content=\"text/html; charset=utf-8\" />\r\n\t\t<meta name=\"description\" content=\"Get to all of your favorite places online in just 1 click with inMind.\" />\r\n\t\t<link rel=\"icon\" href=\"/images/favicon.png\" type=\"image/x-icon\" />\r\n\t\t<link rel=\"shortcut icon\" href=\"/images/favicon.png\" type=\"image/x-icon\" />\r\n\t\t<link rel=\"canonical\" href=\"\" />\r\n\r\n        <link href='http://fonts.googleapis.com/css?family=Roboto:400,300,100' rel='stylesheet' type='text/css'>\r\n        <link href='http://fonts.googleapis.com/css?family=Open+Sans:400,300,700' rel='stylesheet' type='text/css'>\r\n\r\n        <script type=\"text/javascript\">\n//<![CDATA[\n    var _rb_appid = null;\n    var _rb_language = \"en\";\n    var _rb_systemid = \"546\";\n    var _rb_ga_page_name = \"404\";\n    \n    var ga_host = ((\"https:\" == document.location.protocol) ? \"https://ssl.\" : \"http://www.\");\ndocument.write(unescape(\"%3Cscript src=\\\"\"+ga_host+\"google-analytics.com/ga.js\\\" type=\\\"text/javascript\\\"%3E%3C/script%3E\"));\n\nfunction ga_track_download(id){\n    send_ga_query(_rb_ga_page_name+\"/download/btn[\"+id+\"]/sysid[\"+_rb_systemid+\"]/appid[\"+_rb_appid+\"]/lng[\"+_rb_language+\"]\", \"UA-57558948-2\");\n}\n\nfunction ga_track_view( ){\n    send_ga_query(_rb_ga_page_name+\"/view/sysid[\"+_rb_systemid+\"]/appid[\"+_rb_appid+\"]/lng[\"+_rb_language+\"]\", \"UA-57558948-2\");\n}\n\nfunction send_ga_query(query, ga_account){\n    if(typeof _gat != \"undefined\" && _gat != null){\n\t   try{\n\t       var ga_tracker = _gat._getTracker(ga_account);\n\t       ga_tracker._initData( );\n\t       ga_tracker._trackPageview(query);\n\t   }\n\t   catch($e){}\n    }\n    else{\n\t   setTimeout(function(){send_ga_query(query, ga_account)}, 1000);\n    }\n}    var ml_host = (","(\"https:\" == document.location.protocol) ? \"https://\" : \"http://\");\nvar ml_host = ml_host+\"www.mlstat.com\";\ndocument.write(unescape(\"%3Cscript src='\"+ml_host+\"/scripts/appid.V2.js' type='text/javascript'%3E%3C/script%3E\"));\n\nvar _ml_stat_loaded = false;\n\nfunction ml_stats_load(){\n    if(typeof appidObj != \"undefined\" && appidObj != null){\n\t   appidObj.init(_rb_systemid, ml_host);\n\t   appidObj.track(\"hit\");\n\t   _rb_appid = appidObj.getAppID();\n\t   ga_track_view();\n\t   _ml_stat_loaded = true;\n    }\n    else{\n\t   setTimeout(function(){ml_stats_load()}, 1000);\n    }\n}\n\nfunction ml_track_download(){\n    send_ml_query(\"download\");\n}\n\nfunction send_ml_query(_event){\n    if(_ml_stat_loaded == true){\n\t   appidObj.track(_event, _rb_language);\n    }\n    else{\n\t   setTimeout(function(){send_ml_query(_event)}, 1000);\n    }\n}\n\nml_stats_load();    \n    function track_download(id){\n\t   send_ml_query('download');\n\t   ga_track_download(id);\n    }\n//]]>\n</script>        <link href=\"/styles/default/main.css\" rel=\"stylesheet\" type=\"text/css\" />\n<link href=\"/styles/default/inner.css\" rel=\"stylesheet\" type=\"text/css\" />\n        \n        <title></title>\r\n\t</head>\r\n\t<body>\r\n        <div id=\"wrapper\">\r\n            <div id=\"menu\">\r\n        <a id=\"logo\" href=\"/\" title=\"\"><img src=\"images/logo.png\"/></a>\r\n        <a id=\"contact\" href=\"mailto:support@inmind.com\"><img src=\"images/contact.png\" alt=\"\"/></a>\r\n        <br class=\"clear\"/>\r\n</div>\r\n            <div class=\"container\">\r\n                            </div>\r\n            <div id=\"footer-push\"></div>\r\n        </div>\r\n\r\n        <div id=\"footer\">\r\n   <div class=\"container\">\r\n        <div id=\"footer_menu\">\r\n            <ul class=\"nav\">\r\n                <li><a class=\"active\" href=\"/\">2015 &copy; InMind, Inc.</a></li>\r\n                <li><a href=\"/terms_of_use.php\">End-User License Agreement</a></li>\r\n                <li><a href=\"/privacy_policy.php\">Privacy Policy</a></li>\r\n                <li class=\"no-border-right\"><a href=\"mailto:support@inmind.com\">Contact Us</a></li>\r\n            </ul>\r\n        </div>\r\n   </div>\r\n   <iframe id=\"downframe\" width=\"0\" height=\"0\" frameborder=\"0\" src=\"about:blank\" name=\"downframe\"></iframe>\r\n</div>\t</body>\r\n</html>",null]}