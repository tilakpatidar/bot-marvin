{"entries":[{"userAgents":["Scrapy"],"rules":[{"path":"%2F","allowance":false}]}],"sitemaps":[],"defaultEntry":{"userAgents":["*"],"rules":[{"path":"%2Fmyshine%2F","allowance":false},{"path":"%2F1198510%2F","allowance":false},{"path":"%2F*%3F*vendorid%3D*","allowance":false},{"path":"%2Ffeaturedcompanystats%2F","allowance":false},{"path":"%2Flookup%2F","allowance":false},{"path":"%2Fjob-search%2Fsimilar%2F","allowance":false},{"path":"%2Funsubscribe%2F","allowance":false}]},"disallowAll":false,"statusCode":200,"allowAll":false,"options":{"headers":{"userAgent":"Mozilla/5.0 (X11; Linux i686; rv:5.0) Gecko/20100101 Firefox/5.0"}},"url":"http://www.shine.com/robots.txt","chunks":["User-agent: *\nDisallow: /myshine/\nDisallow: /1198510/\nDisallow: /*?*vendorid=*\nDisallow: /featuredcompanystats/\nDisallow: /lookup/\nDisallow: /job-search/similar/\nDisallow: /unsubscribe/\nUser-agent: Scrapy\nDisallow: /\n",null]}