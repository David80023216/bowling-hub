# 🎳 Bowling Hub

**Your Personal Bowling Companion**

A professional, mobile-first web app for tracking bowling scores, leagues, honor achievements, and challenges. Built as a static single-page application — no server required.

## Features

- **Dashboard** — At-a-glance stats, recent scores, next match, active challenges
- **Score Tracking** — Log sessions with up to 6 games, auto-calculate series & averages, trend charts
- **Honor Roll** — Track 300 games, 299/298 games, 800/700 series, with trophy visuals
- **League Management** — Add leagues, view standings, track season progress, sync standings via LSS ID
- **Schedule** — Upcoming matches with "this week" highlights
- **Challenges** — Create head-to-head challenges with friends, record results, track win/loss record
- **Settings** — Profile management, theme toggle, data import/export, bowl.com sync

## Tech Stack

- **HTML5** with semantic markup
- **Tailwind CSS** via CDN for styling
- **Font Awesome** via CDN for icons
- **Vanilla JavaScript** (ES6 modules)
- **localStorage** for all data persistence

## Getting Started

1. Open `index.html` in a browser, or deploy to any static hosting (GitHub Pages, Netlify, etc.)
2. Complete the one-time profile setup
3. Start logging scores!

## Data Storage

All data is stored in your browser's localStorage. Use the **Settings → Export Data** feature to back up your data as JSON. You can import it back on any device.

### localStorage Keys

| Key | Description |
|-----|-------------|
| `bowling_profile` | Your name, USBC ID, home center |
| `bowling_scores` | All score sessions |
| `bowling_honors` | Honor roll achievements |
| `bowling_leagues` | League memberships |
| `bowling_standings` | League standings data |
| `bowling_schedule` | Upcoming matches |
| `bowling_challenges` | Head-to-head challenges |
| `bowling_contacts` | Bowling contacts |
| `bowling_settings` | App preferences (theme) |

## Deployment

This is a fully static app. Simply deploy all files to any web server or static hosting service:

```bash
# GitHub Pages — just push to a gh-pages branch
# Netlify — drag and drop the folder
# Any web server — copy files to document root
```

## License

MIT
