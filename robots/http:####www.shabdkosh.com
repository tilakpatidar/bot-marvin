{"entries":[{"userAgents":["Mediapartners-Google"],"rules":[{"path":"","allowance":true}]},{"userAgents":["008"],"rules":[{"path":"%2F","allowance":false}]},{"userAgents":["CCBot"],"rules":[{"path":"%2F","allowance":false}]},{"userAgents":["AhrefsBot"],"rules":[],"crawl_delay":"30"},{"userAgents":["netseer"],"rules":[{"path":"%2F","allowance":false}]},{"userAgents":["YoudaoBot"],"rules":[{"path":"%2F","allowance":false}]},{"userAgents":["proximic"],"rules":[{"path":"%2F","allowance":false}]},{"userAgents":["ia_archiver"],"rules":[],"crawl_delay":"600"},{"userAgents":["Exabot"],"rules":[],"crawl_delay":"600"},{"userAgents":["Yandex"],"rules":[],"crawl_delay":"60"},{"userAgents":["msnbot"],"rules":[],"crawl_delay":"1"},{"userAgents":["Bingbot"],"rules":[],"crawl_delay":"1"},{"userAgents":["spbot"],"rules":[{"path":"%2F","allowance":false}]},{"userAgents":["A6-Indexer"],"rules":[{"path":"%2F","allowance":false}]},{"userAgents":["A6-Indexer/1.0"],"rules":[{"path":"%2F","allowance":false}]}],"sitemaps":[],"defaultEntry":{"userAgents":["*"],"rules":[{"path":"%2Fforums%2Fmember%2F","allowance":false},{"path":"%2Fforums%2Fmember","allowance":false},{"path":"%2Fmember%2Fmemberlist","allowance":false},{"path":"%2Fmember%2Flogin","allowance":false},{"path":"%2Fcontribute","allowance":false},{"path":"%2Fcontribute%2F","allowance":false},{"path":"%2Fmember%2Fregister","allowance":false},{"path":"%2Fmember","allowance":false},{"path":"%2Fmember%2F","allowance":false},{"path":"%2Fspeech%2F","allowance":false},{"path":"%2F","allowance":true}],"crawl_delay":"5"},"disallowAll":false,"statusCode":200,"allowAll":false,"options":{"headers":{"userAgent":"Mozilla/5.0 (X11; Linux i686; rv:5.0) Gecko/20100101 Firefox/5.0"}},"url":"http://www.shabdkosh.com/robots.txt","chunks":["User-agent: Mediapartners-Google\nDisallow:\n\nUser-agent: 008\nDisallow: /\n\nUser-agent: CCBot\nDisallow: /\n\nUser-Agent: AhrefsBot\nCrawl-Delay: 30\n\nUser-agent: netseer\nDisallow: /\n\nUser-Agent: YoudaoBot\nDisallow: /\n\nUser-agent: proximic\nDisallow: /\n\nUser-agent: ia_archiver\nCrawl-delay: 600\n\nUser-agent: Exabot\nCrawl-delay: 600\n\nUser-agent: Yandex\nCrawl-delay: 60\n\nUser-agent: msnbot\nCrawl-delay: 1\n\nUser-agent: Bingbot\nCrawl-delay: 1\n\nUser-agent: spbot\nDisallow: /\n\nUser-agent: A6-Indexer\nDisallow: /\n\nUser-agent: A6-Indexer/1.0\nDisallow: /\n\nUser-agent: *\nCrawl-delay: 5\nDisallow: /forums/member/\nDisallow: /forums/member\nDisallow: /member/memberlist\nDisallow: /member/login\nDisallow: /contribute\nDisallow: /contribute/\nDisallow: /member/register\nDisallow: /member\nDisallow: /member/\nDisallow: /speech/\nAllow: /\n",null]}