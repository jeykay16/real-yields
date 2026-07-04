# Real Yields of Major Currencies

Live dashboard of the **real yields** (10-year government bond yield minus latest
year-over-year CPI inflation) of 17 major currencies, with a data-driven
gold (XAU/USD) signal and a central-bank rate-meetings calendar.

**Live site:** https://jeykay16.github.io/real-yields/

## Pages

- **Real yields** (`index.html`) — ranks the currencies by real yield (simple and
  Fisher), with per-currency filtering and a gold signal that scores the level and
  momentum of the US 10-year real yield plus the G10 average, explaining each
  factor's bullish/bearish contribution.
- **Rate meetings** (`meetings.html`) — each central bank's current policy rate,
  its last rate change, 12-month move, stance (cutting / hiking / on hold), and
  the upcoming 2026 decision dates.

## How it works

The site is fully static — there is no backend. Each visitor's browser fetches
the data directly from public APIs on every page load:

- **OECD SDMX API** — 10-year government bond yields (long-term interest rates)
  and CPI inflation (main and G20 price dataflows).
- **BIS Stats API** — daily central bank policy rates; last changes and stances
  are computed client-side from the daily series.

Meeting dates are the officially published 2026 central-bank schedules,
cross-checked against each bank's own calendar.

There is also a standalone CLI version (`real_yields.py`, Python 3 standard
library only):

```
python real_yields.py            # print the real-yield table
python real_yields.py --csv out.csv
```

## Run locally

Open `index.html` in a browser — that's it.

## Data sources & disclaimer

Data: [OECD](https://data-explorer.oecd.org) and [BIS](https://data.bis.org).
Informational only — not investment advice.
