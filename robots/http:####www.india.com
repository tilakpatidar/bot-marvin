{"entries":[],"sitemaps":["http://www.india.com/sitemap.xml"],"defaultEntry":{"userAgents":["*"],"rules":[{"path":"%2F","allowance":true},{"path":"%2Fwp-admin%2F","allowance":false},{"path":"%2Fwp-includes%2F","allowance":false},{"path":"%2Ftemplates-topics%2F","allowance":false}]},"disallowAll":false,"statusCode":200,"allowAll":false,"options":{"headers":{"userAgent":"Mozilla/5.0 (X11; Linux i686; rv:5.0) Gecko/20100101 Firefox/5.0"}},"url":"http://www.india.com/robots.txt","chunks":["User-agent: *\nAllow: /\nDisallow: /wp-admin/\nDisallow: /wp-includes/\nDisallow: /templates-topics/\n\nSitemap: http://www.india.com/sitemap.xml\n",null]}