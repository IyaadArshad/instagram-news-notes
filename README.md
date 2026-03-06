# Instagram News Notes Updater

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An Appwrite Function that polls over 35 RSS news feeds every 15 minutes and updates your Instagram Note with the latest breaking headline. Powered by Appwrite Functions with cron scheduling.

```
35+ RSS feeds → Appwrite Function (cron) → Deduplicate → Format → Instagram Note
```

## Features

- **Automated Updates**: Runs every 15 minutes via cron schedule
- **Deduplication**: Prevents duplicate posts by tracking published articles
- **Auto-Setup**: Creates necessary database and collections on first run
- **Rate Limiting**: Configurable intervals to avoid Instagram restrictions
- **Multi-Source**: Aggregates from 35+ reputable news sources across categories

## News Sources

The function polls feeds from the following categories (all treated equally):

| Category | Sources |
|---|---|
| **Agencies** | AFP, AP, Reuters, Xinhua |
| **Global** | ABC News, ABS-CBN, Al Jazeera, BBC, CBS News, CNN, DW News, France 24, Sky News, Sky News AU |
| **US Media** | Fox News, MSNBC, NBC News, NPR, HuffPost, Newsmax, USA Today |
| **Newspapers** | NYT, WaPo, NY Post, Boston Globe, Toronto Star, Times of India |
| **Finance** | Bloomberg, CNBC, Financial Times, Forbes, Fox Business, WSJ |
| **Politics** | Politico, The Hill |
| **Sports** | ESPN, NFL |
| **Aggregators** | The Spectator Index |

## Prerequisites

- [Appwrite](https://appwrite.io/) account and project
- Instagram account (No 2FA supported)
- Node.js 18.0 or higher (for local testing)

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/IyaadArshad/instagram-news-notes.git
   cd instagram-news-notes
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   - Copy `.env.example` to `.env`
   - Fill in your credentials (see Environment Variables section below)

## Setup

### 1. Get your Instagram Session ID

Run the session getter script on your local machine (Instagram blocks datacenter IPs):

```bash
node scripts/get-session.js
```

This will prompt for your Instagram username and password, then output a session ID.

> **Note:** Accounts with 2FA enabled are not supported at this time. Use an account without 2FA or disable 2FA temporarily to obtain the session ID.

### 2. Create the Appwrite Function

In your Appwrite Console:

1. Go to **Functions** → **Create function**
2. Connect your Git repository (this repo)
3. Configure:
   - **Runtime:** Node.js 18.0 (or 20.0+)
   - **Entry point:** `src/main.js`
   - **Root directory:** `.` (repository root)
   - **Build command:** `npm install`

### 3. Environment Variables

In the function's **Settings → Environment variables**, add the following:

```
IG_SESSION_ID=Your Instagram session ID (obtained from scripts/get-session.js)
IG_USERNAME=Your Instagram username (optional, for auto re-login)
IG_PASSWORD=Your Instagram password (optional, for auto re-login)
APPWRITE_FUNCTION_PROJECT_ID=Your Appwrite project ID
APPWRITE_FUNCTION_API_ENDPOINT=Your Appwrite API endpoint
```

### 4. Set the Cron Schedule

In the function's **Settings → Schedule**:

```
*/15 * * * *
```

This runs the function **every 15 minutes**.

> You can change the thing at the beginning (`*/15`) to adjust the frequency (e.g., `*/30` for every 30 minutes, `0 * * * *` for hourly).

### 5. Configure Function Permissions

In **Settings → Scopes**, enable:
- `databases.read`
- `databases.write`
- `collections.read`
- `collections.write`
- `documents.read`
- `documents.write`
- `attributes.read`
- `attributes.write`

These permissions allow the function to auto-create its database on the first run.

Note that after you make all the permission changes you need to redeploy the function for the changes to take effect.

If permission issues arise, enable all scopes temporarily to identify the required permissions, then narrow down to only those needed. (Trial and error trust vro)

### 6. Deploy

Push to your Git repository's production branch. Appwrite will automatically build and deploy the function.

## How It Works

1. **Cron Trigger**: Function runs every minute
2. **Feed Fetching**: Concurrently fetches RSS feeds (8s timeout per feed; skips broken ones)
3. **Article Collection**: Gathers the 5 most recent articles from each feed
4. **Sorting**: Orders all articles by publication date
5. **Selection**: Picks the newest article
6. **Deduplication**: Checks Appwrite database to avoid reposting
7. **Formatting**: Truncates headline to 60 characters in format `SOURCE: headline text…`
8. **Update**: Posts to Instagram Note using the `instagram-notes` library
9. **Storage**: Saves article info to database for future deduplication

### Note Format

Instagram Notes are limited to 60 characters. Headlines are formatted as:

```
Oil prices surge after OPEC decision
Major earthquake hits Japan coast
Apple unveils new AI chip lineup…
```

Long headlines are truncated with an ellipsis. (80 chars is the instagram default notes limit, so after the 77th char, the other 3 chars are reserved for the ellipsis)

You can tweak the code a bit if you want to include the source name or change the formatting.

## Auto-Setup

On the first run, the function automatically creates:
- Database: `news-bot`
- Collection: `state`
- Attributes: `lastLink`, `lastTitle`, `igSessionId`, `lastUpdated`

No manual database configuration required.

## Troubleshooting

| Problem | Solution |
|---|---|
| IG note not updating | Session may have expired — re-run `scripts/get-session.js` and update `IG_SESSION_ID` |
| All feeds failing | Check Appwrite function logs; some feeds may be geo-blocked from cloud IPs |
| Duplicate posts | Deduplication uses article links — URL changes can cause duplicates |
| Function timing out | Increase execution timeout in function Settings (15s → 30s) |
| "No articles found" | RSS feeds may be temporarily down — check logs on next run |

## Project Structure

```
instagram-news-notes/
├── src/
│   ├── main.js          # Appwrite Function entry point
│   ├── feeds.js         # RSS feed URLs (35+ sources)
├── scripts/
│   └── get-session.js   # Helper: Obtain Instagram session ID
├── .env.example         # Environment variables template
├── .gitignore           # Git ignore rules
├── package.json         # Dependencies and scripts
├── README.md            # This file
└── LICENSE              # MIT License
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This project is not affiliated with Instagram or any news sources. Use at your own risk and comply with all platform terms of service.
