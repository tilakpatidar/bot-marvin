{"entries":[],"sitemaps":["http://ul-sitemap.s3.amazonaws.com/sitemaps/sitemap.xml.gz"],"defaultEntry":{"userAgents":["*"],"rules":[{"path":"%2Fcheckout","allowance":false},{"path":"%2Fcart","allowance":false},{"path":"%2Forders","allowance":false},{"path":"%2Fcountries","allowance":false},{"path":"%2Fline_items","allowance":false},{"path":"%2Fpassword_resets","allowance":false},{"path":"%2Fstates","allowance":false},{"path":"%2Fuser_sessions","allowance":false},{"path":"%2Fuser_registrations","allowance":false},{"path":"%2Fusers","allowance":false},{"path":"%2Faccount","allowance":false},{"path":"%2Fassets%2Ficofont-preview.html","allowance":false}]},"disallowAll":false,"statusCode":200,"allowAll":false,"options":{"headers":{"userAgent":"Mozilla/5.0 (X11; Linux i686; rv:5.0) Gecko/20100101 Firefox/5.0"}},"url":"https://www.urbanladder.com/robots.txt","chunks":["# See http://www.robotstxt.org/wc/norobots.html for documentation on how to use the robots.txt file\n#\n# To ban all spiders from the entire site uncomment the next two lines:\n# User-agent: *\n# Disallow: /\nUser-agent: *\nDisallow: /checkout\nDisallow: /cart\nDisallow: /orders\nDisallow: /countries\nDisallow: /line_items\nDisallow: /password_resets\nDisallow: /states\nDisallow: /user_sessions\nDisallow: /user_registrations\nDisallow: /users\nDisallow: /account\nDisallow: /assets/icofont-preview.html\nSitemap: http://ul-sitemap.s3.amazonaws.com/sitemaps/sitemap.xml.gz\n",null]}