{"entries":[{"userAgents":["Googlebot"],"rules":[{"path":"%2Fapi%2F","allowance":true}]}],"sitemaps":["http://www.limeroad.com/sitemap/sitemap_index.xml"],"defaultEntry":{"userAgents":["*"],"rules":[{"path":"%2F%24","allowance":true}]},"disallowAll":false,"statusCode":200,"allowAll":false,"options":{"headers":{"userAgent":"Mozilla/5.0 (X11; Linux i686; rv:5.0) Gecko/20100101 Firefox/5.0"}},"url":"http://www.limeroad.com/robots.txt","chunks":["# See http://www.robotstxt.org/wc/norobots.html for documentation on how to use the robots.txt file\n#\n# To ban all spiders from the entire site uncomment the next two lines:\nUser-Agent: *\nAllow: /$\n\nUser-Agent: Googlebot\nAllow: /api/\n\nDisallow: /search\nDisallow: /search/*\nDisallow: /love$\nDisallow: /products/\n\nSitemap: http://www.limeroad.com/sitemap/sitemap_index.xml\n",null]}