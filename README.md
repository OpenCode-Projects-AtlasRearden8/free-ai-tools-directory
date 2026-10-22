# Genuinely Free AI Tools

A static, offline-friendly directory of AI tools that are **actually free** — chat, image,
writing, study, and voice. Every card answers four plain-English questions:

- **What does it do?**
- **What is actually free?** (and where the catch is)
- **Browser or local?**
- **When was it verified free, and when should we re-check?**

No affiliate links. Nothing in this directory earns anyone a commission. No sign-up walls
are hidden from you. Maintained by **Asdale Dynamics, LLC** — Dylan Asdale, RN turned AI
author, who explains AI "like a friend would": plain English, step by step, never
condescending.

## Run it

No build step and no dependencies are needed to **use** the page. Any of these work:

```bash
# Option 1: just open it (works offline)
#   double-click index.html, or
xdg-open index.html

# Option 2: serve it locally (optional, for nicer testing)
python3 -m http.server 8000
# then visit http://localhost:8000
```

Everything is local-first: no CDN assets, no analytics, no network calls at runtime.
The single remote URLs are the "Open site" links on each card, which open the tool's own
website in a new tab when you click them.

## Files

| Path | Purpose |
| --- | --- |
| `index.html` | The page: search box, category filter buttons, card grid |
| `css/style.css` | Styling (warm, accessible, mobile-friendly) |
| `js/app.js` | Loads the data, renders cards, wires search + filters |
| `data/tools.json` | **The single source of truth.** Edit this |
| `data/tools.js` | Generated offline mirror so `file://` double-click works |
| `scripts/build-data.js` | Regenerates `data/tools.js` from `data/tools.json` |
| `tests/validate.js` | Automated checks (JSON schema, links, offline sync, no secrets) |

## Maintenance (the honest part)

Free tiers change constantly. Every tool in the data carries a
`verifiedFreeOn` date and a `recheckDate`. When a recheck date arrives, or you notice
something drifted:

1. Open `data/tools.json`.
2. Add or edit a tool with these required fields:

   ```json
   {
     "id": "unique-short-id",
     "name": "Tool name (free tier)",
     "category": "chat | image | writing | study | voice",
     "url": "https://the-real-page/",
     "whatItDoes": "One or two plain-English sentences.",
     "actuallyFree": "Exactly what a free user gets, without marketing spin.",
     "access": "browser | local",
     "limits": "The honest catch: quotas, waiting, account walls.",
     "verifiedFreeOn": "YYYY-MM-DD",
     "recheckDate": "YYYY-MM-DD"
   }
   ```

3. Update the tool with today's date as `verifiedFreeOn` and a `recheckDate`
   roughly one quarter ahead.
4. Regenerate the offline mirror and run the checks:

   ```bash
   node scripts/build-data.js
   node tests/validate.js
   ```

The validator enforces: required fields, valid `https://` URLs, ISO dates with
`recheckDate` in the future, whitelisted categories, no affiliate/tracking parameters
(`utm_`, `ref=`, `aff=`, `tag=`, …), `data/tools.js` exactly mirroring the JSON, page
references, disclaimers ("not medical advice") in the page, and a scan for accidental
secrets or API keys.

## House rules

- **No affiliate links.** Ever. If a link earns a commission when clicked, it does not
  belong here.
- **Honest limits.** "It's free with a 10-minute monthly cap" beats "free!" every time.
- **Local-first.** The page itself must keep working offline with no network.
- **Education only.** This directory explains products. Nothing here — including anything
  a card links to — is medical advice or professional advice.

Test before you commit: `node tests/validate.js` should print `PASSED`.

## Repository

Clone or download this folder and open `index.html` in any modern browser — that's it.

## License

MIT — see [LICENSE](LICENSE). Copyright (c) 2026 Asdale Dynamics, LLC.
