{"entries":[{"userAgents":["Googlebot-News"],"rules":[{"path":"%2Fbusiness%2Fpress-releases","allowance":false}]}],"sitemaps":["http://www.chron.com/sitemap.xml","http://www.chron.com/sitemap_news.xml"],"defaultEntry":{"userAgents":["*"],"rules":[{"path":"%2Fstyle%2Fbeauty%2Fhearstmagazines%2F","allowance":false},{"path":"%2Fstyle%2Ffashion%2Fhearstmagazines%2F","allowance":false},{"path":"%2Fliving%2Frelationships%2Fhearstmagazines%2F","allowance":false},{"path":"%2Fhomeandgarden%2Fhome%2Fhearstmagazines%2F","allowance":false},{"path":"%2Fliving%2Fwellness%2Fhearstmagazines%2F","allowance":false},{"path":"%2Fsearch%2F","allowance":false},{"path":"%2F%3Faction%3Dsearch","allowance":false},{"path":"%2F%3F%3Fcontrollername%3Dsearch","allowance":false},{"path":"%2F%3F%3Faction%3Dsearch","allowance":false},{"path":"%2F%3FcontrollerName%3Dsearch","allowance":false},{"path":"%2F%3FcontrollerName%3DemailThis","allowance":false},{"path":"%2Fadtest","allowance":false},{"path":"%2Fsponsored","allowance":false},{"path":"%2Fevents%2F","allowance":false}]},"disallowAll":false,"statusCode":200,"allowAll":false,"options":{"headers":{"userAgent":"Mozilla/5.0 (X11; Linux i686; rv:5.0) Gecko/20100101 Firefox/5.0"}},"url":"http://www.chron.com/robots.txt","chunks":["Sitemap: http://www.chron.com/sitemap.xml\nSitemap: http://www.chron.com/sitemap_news.xml\n\nUser-agent: *\nDisallow: /style/beauty/hearstmagazines/\nDisallow: /style/fashion/hearstmagazines/\nDisallow: /living/relationships/hearstmagazines/\nDisallow: /homeandgarden/home/hearstmagazines/\nDisallow: /living/wellness/hearstmagazines/\nDisallow: /search/\nDisallow: /?action=search\nDisallow: /?%3Fcontrollername=search\nDisallow: /?%3Faction=search\nDisallow: /?controllerName=search\nDisallow: /?controllerName=emailThis\nDisallow: /adtest\nDisallow: /sponsored\nDisallow: /events/\n\nUser-agent: Googlebot-News\nDisallow: /business/press-releases\n",null]}