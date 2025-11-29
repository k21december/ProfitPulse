# ProfitPulse ♠

ProfitPulse is a full-stack **bankroll & investing intelligence** app.

Right now it’s a high-signal poker tracker; next, it becomes the hub for your whole money game: poker sessions **and** real-world investments (stocks, bonds, ETFs, real estate, etc.) in one clean dashboard.

---

## Features

### Poker Bankroll Intelligence

- **Session logging**
  - Game, stake, format (cash / MTT / SNG)
  - Location (online / live / custom)
  - Buy-in, cash-out, bullets
  - Hours played & hourly rate
  - Style tag: **TAG / LAG / NIT / Manic**
  - Free-text notes for key hands or mental game

- **Bankroll graph**
  - Bankroll over time & profit-per-session modes  
  - Last 10 / last 20 / all sessions  
  - Moving-average overlay to smooth variance

- **Sessions table**
  - Filter by game & location
  - Search by notes / game / location
  - Sort by newest, biggest win, biggest loss
  - Delete & edit sessions

- **Stats dashboard**
  - Total profit, winrate, average profit/session
  - Recorded hours & overall hourly
  - **By game** (profit, hours, hourly)
  - **By location** (online vs live, etc.)
  - Variance, standard deviation, rough 95% profit range
  - Total bullets fired (reload habits)
  - **By style tag** (TAG / LAG / NIT / Manic hourly)
  - **Performance by session length** (0–2h, 2–3h, 3–4h, 4h+)

- **Advice view**
  - Snapshot of sample size, hourly, winrate, bullets
  - Simple rules-based recommendations (bankroll and mental-game hygiene)
  - “Future AI hooks” section for plugging in a leak-finder later

- **Data export**
  - `GET /api/export/csv` → `profitpulse_sessions.csv` (for pandas / Excel / custom analysis)

---

## Future Investing Features

Poker is just one risk asset. ProfitPulse is designed to grow into an **investing hub**:

Planned:

- **Investment accounts**
  - Manual tracking of positions in stocks, ETFs, bonds, and real estate
  - Simple performance metrics (time-weighted & money-weighted returns)
- **Capital allocation rules**
  - Move a fixed % of poker profit into long-term investment buckets
  - Show bankroll vs invested capital as slices of total net worth
- **Comparisons**
  - Compare your poker hourly to a passive ETF / bond portfolio
  - Simple “what if you had invested X% of profit since day 1” charts
- **Unified dashboard**
  - One view for:
    - current bankroll
    - poker profit curve
    - investment account value
    - total “money game” curve over time

The repo structure is already set up to add these modules alongside the poker engine.

---

## Tech Stack

- **Frontend:** React + Vite, Chart.js, modern dark-themed UI
- **Backend:** Python + Flask
- **Data:** JSON file on disk (for now) + CSV export, with optional pandas analysis in `/analysis`

---

## Project Structure

```text
ProfitPulse/
├─ analysis/      # ad-hoc pandas scripts / notebooks
├─ backend/       # Flask API, bankroll engine, storage
├─ data/          # persisted bankroll JSON, exported CSV
├─ frontend/      # React + Vite app
└─ .gitignore
