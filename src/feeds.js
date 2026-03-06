/**
 * RSS Feed list — all sources treated equally.
 * Each feed is polled every cron run. If a feed is unreachable it is silently skipped.
 */

const RSS_FEEDS = [
  // ── News agencies ──────────────────────────────────────
  { name: "AFP",             url: "https://www.afp.com/en/rss" },
  { name: "AP",              url: "https://apnews.com/rss" },
  { name: "Reuters",         url: "https://www.reutersagency.com/feed/?best-topics=all&post_type=best" },
  { name: "Xinhua",          url: "http://www.xinhuanet.com/english/rss/worldrss.xml" },

  // ── Global broadcasters ────────────────────────────────
  { name: "ABC News",        url: "https://abcnews.go.com/abcnews/topstories" },
  { name: "ABS-CBN",         url: "https://news.abs-cbn.com/rss" },
  { name: "Al Jazeera",      url: "https://www.aljazeera.com/xml/rss/all.xml" },
  { name: "BBC",             url: "http://feeds.bbci.co.uk/news/rss.xml" },
  { name: "CBS News",        url: "https://www.cbsnews.com/latest/rss/main" },
  { name: "CNN",             url: "http://rss.cnn.com/rss/edition.rss" },
  { name: "DW News",         url: "https://rss.dw.com/xml/rss-en-all" },
  { name: "France 24",       url: "https://www.france24.com/en/rss" },
  { name: "Sky News",        url: "https://feeds.skynews.com/feeds/rss/home.xml" },
  { name: "Sky News AU",     url: "https://www.skynews.com.au/feed" },

  // ── US media ───────────────────────────────────────────
  { name: "Fox News",        url: "http://feeds.foxnews.com/foxnews/latest" },
  { name: "MSNBC",           url: "http://feeds.nbcnews.com/nbcnews/public/news" },
  { name: "NBC News",        url: "https://feeds.nbcnews.com/nbcnews/public/news" },
  { name: "NPR",             url: "https://feeds.npr.org/1001/rss.xml" },
  { name: "HuffPost",        url: "https://www.huffpost.com/section/front-page/feed" },
  { name: "Newsmax",         url: "https://www.newsmax.com/rss/Newsfront/" },
  { name: "USA Today",       url: "https://rssfeeds.usatoday.com/usatoday-NewsTopStories" },

  // ── Newspapers ─────────────────────────────────────────
  { name: "NYT",             url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml" },
  { name: "WaPo",            url: "http://feeds.washingtonpost.com/rss/world" },
  { name: "NY Post",         url: "https://nypost.com/feed/" },
  { name: "Boston Globe",    url: "https://www.bostonglobe.com/rss/news.xml" },
  { name: "Toronto Star",    url: "https://www.thestar.com/content/thestar/feed.RSSManagerServlet.articles.news.rss" },
  { name: "Times of India",  url: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms" },

  // ── Finance / business ────────────────────────────────
  { name: "Bloomberg",       url: "https://feeds.bloomberg.com/markets/news.rss" },
  { name: "CNBC",            url: "https://www.cnbc.com/id/100003114/device/rss/rss.html" },
  { name: "Financial Times",  url: "https://www.ft.com/rss/home" },
  { name: "Forbes",          url: "https://www.forbes.com/real-time/feed2/" },
  { name: "Fox Business",    url: "https://moxie.foxbusiness.com/google-publisher/latest.xml" },
  { name: "WSJ",             url: "https://feeds.a.dj.com/rss/RSSWorldNews.xml" },

  // ── Politics / commentary ─────────────────────────────
  { name: "Politico",        url: "https://www.politico.com/rss/politics08.xml" },
  { name: "The Hill",        url: "https://thehill.com/rss/syndicator/19110" },

  // ── Sports ─────────────────────────────────────────────
  { name: "ESPN",            url: "https://www.espn.com/espn/rss/news" },
  { name: "NFL",             url: "https://www.nfl.com/rss/rsslanding?searchString=home" },

  // ── Aggregators / index ────────────────────────────────
  { name: "Spectator Index", url: "https://www.spectator-index.com/api/rss" },
];

export default RSS_FEEDS;
