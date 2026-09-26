# HVAC ProComm: Customer Communication Training for HVAC Technicians

A free, browser-based training tool that helps HVAC students and new technicians practice the conversations that follow the diagnosis: price shock, second opinions, upgrade talks, and upset customers.

**Live site:** https://hvac-comms-psychology.netlify.app

Author: Dr. Pantaleon Fassbender, Williston, Florida

## What's inside

| Section | What it does | Data sent anywhere? |
|---|---|---|
| **Comms Models** | L.A.E.R., Feel-Felt-Found, and Cialdini's principles of influence, with an explicit line between persuasion and manipulation | No |
| **Key Scenarios** | Four typical call profiles (maintenance, emergency, upgrade, second opinion) with expandable outlines: customer mindset, goal, fitting models, do/avoid, safety line | No |
| **Base Camp** | Guided five-turn runs per scenario. Each turn offers three responses in random order, with immediate feedback and a retry on wrong picks. A final debrief shows first-try score, a turn-by-turn recap, and takeaways | No, runs entirely in the browser |
| **Five Star Training** | Free-text role-play with an AI-simulated customer, ended by a written panel debrief (customer, veteran tech, communication expert). Students can copy transcript and debrief to hand in. Instructors can build their own scenarios | Yes, see Privacy |
| **HVAC Psychology** | "Windshield Time" podcast episode with classroom discussion questions | No |
| **About** | Author bio and link to Twisters Management Consulting LLC | No |

## Using it in class

- No accounts, no installation, and it works on phones.
- A typical 45-minute session: one Base Camp run each (10 min), two Five Star role-plays (20 min), then compare debriefs in class (15 min).
- The site can be linked or embedded in a learning management system (no frame blocking).
- The AI debrief is a prompt for discussion, not a grade.

## Privacy in brief

- No cookies, no analytics, no browser storage, no database. Fonts, styles, and icons are self-hosted.
- Five Star Training sends the scenario text and the conversation to two Netlify Functions, which forward it to Google Gemini (`gemini-2.5-flash`) and return the reply. Nothing is stored by the site.
- Netlify hosts the site and adds its own page-performance measurement script.
- Anonymous daily counters (AI requests, sessions per scenario, debriefs, cap hits) in Netlify Blobs power a daily AI cap and pilot statistics. No IP, no text, no identifiers.
- Full details: [`legal.html`](legal.html) (also linked in the site footer). **If you change what the functions send or store, update `legal.html` in the same commit.**

## Project structure

```
index.html                     Single-page app (Tailwind + Lucide, self-hosted in vendor/)
legal.html                     Legal notice, privacy, AI disclosure (standalone, no framework)
fonts.css, fonts/              Inter typeface (SIL OFL 1.1)
vendor/                        tailwind.js (3.4.17), lucide.min.js (1.48.0)
podcast1.mp3                   Episode 1 audio
netlify/functions/roleplay.mts AI customer (POST /api/roleplay)
netlify/functions/analysis.mts Panel debrief (POST /api/analysis)
netlify/functions/stats.mts    Owner-only usage statistics (GET /api/stats)
netlify/lib/usage.mts          Daily counters and AI cap (Netlify Blobs)
netlify.toml                   Publish dir, functions dir, security headers
```

## Editing scenarios

All scenarios live in the `coreScenarios` array in `index.html`. Each entry has:

- `context` and `aiPersona`: the dispatch situation and the customer's personality, used by the Five Star AI role-play.
- `steps`: exactly five turns for Base Camp. Each turn has a customer line (`npc`) and three `options`; exactly one has `isGood: true`. Every option carries a `model` (the technique or pitfall) and `feedback` explaining why.
- `debrief`: a `summary` and three `takeaways` for the final Base Camp screen.

A scenario appears automatically in Base Camp and Five Star Training. To add it to **Key Scenarios**, copy one of the `<details class="scenario-card">` blocks and point its buttons to the new `id`.

## Running locally

Static parts (everything except the AI role-play):

```bash
python -m http.server 8384
```

With the AI functions (requires the [Netlify CLI](https://docs.netlify.com/cli/get-started/) and a linked site with Netlify AI Gateway, or a `GEMINI_API_KEY` in the environment):

```bash
npm install
netlify dev
```

## Daily AI cap and pilot statistics

- `DAILY_AI_LIMIT` (Netlify environment variable, default `3000`): maximum AI calls (role-play turns plus debriefs) per day, Eastern time. When reached, the AI features show a friendly pause message; Base Camp keeps working.
- `STATS_KEY` (Netlify environment variable): secret for the owner-only statistics endpoint. Without it, the endpoint returns 404.
- Statistics: `/api/stats?key=<STATS_KEY>` (JSON, last 30 days) or `/api/stats?key=<STATS_KEY>&days=90&format=csv` (spreadsheet).
- Counters are approximate under heavy parallel load (no locking), which is fine for a soft cap and pilot reporting. If storage is unavailable, the AI features keep working (fail open).

## Deployment

Pushing to `main` deploys automatically on Netlify. There is no build step for the page; Netlify bundles the functions with esbuild.

## License

© 2026 Dr. Pantaleon Fassbender. All rights reserved: code, texts, scenarios, and the podcast episode. The source is public for transparency (for example, so schools can see exactly what the AI functions send). No license to copy, modify, or redistribute it is granted.

Instructors and schools may use the live site free of charge in their teaching, link to it, and embed it. For adaptations or a version for your institution, please get in touch.

Third-party components: Inter (SIL Open Font License 1.1), Lucide (ISC), Tailwind CSS (MIT).

## Contact

pantaleonfassbender@gmail.com: feedback from instructors is very welcome.
