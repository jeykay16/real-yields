#!/usr/bin/env python3
"""Real yields of the world's major currencies.

Fetches the latest 10-year government bond yields (OECD long-term interest
rates) and the latest year-over-year CPI inflation for each currency's
economy, then computes the real yield:

    simple real yield = nominal 10Y yield - CPI inflation (YoY)
    Fisher real yield = ((1 + nominal) / (1 + inflation) - 1) * 100

Data source: OECD public SDMX API (no API key required).
For the euro, the euro area aggregate (EA20) is used.

Usage:
    python real_yields.py            # print table
    python real_yields.py --csv out.csv   # also save as CSV
"""

import argparse
import csv
import io
import re
import sys
import urllib.request

OECD_BASE = "https://sdmx.oecd.org/public/rest/data"

# currency -> (OECD reference-area code, display name)
CURRENCIES = {
    "USD": ("USA", "US Dollar"),
    "EUR": ("EA20", "Euro (euro area)"),
    "JPY": ("JPN", "Japanese Yen"),
    "GBP": ("GBR", "British Pound"),
    "CHF": ("CHE", "Swiss Franc"),
    "CAD": ("CAN", "Canadian Dollar"),
    "AUD": ("AUS", "Australian Dollar"),
    "NZD": ("NZL", "New Zealand Dollar"),
    "SEK": ("SWE", "Swedish Krona"),
    "NOK": ("NOR", "Norwegian Krone"),
    "KRW": ("KOR", "South Korean Won"),
    "CNY": ("CHN", "Chinese Yuan"),
    "INR": ("IND", "Indian Rupee"),
    "BRL": ("BRA", "Brazilian Real"),
    "MXN": ("MEX", "Mexican Peso"),
    "ZAR": ("ZAF", "South African Rand"),
    "PLN": ("POL", "Polish Zloty"),
}


def fetch_csv(url):
    """Fetch a URL and return parsed CSV rows as dicts ([] on 404/no data)."""
    req = urllib.request.Request(url, headers={"User-Agent": "real-yields/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            text = resp.read().decode("utf-8-sig")
    except urllib.error.HTTPError as e:
        if e.code == 404:  # NoRecordsFound
            return []
        raise
    if not text.startswith("DATAFLOW"):
        return []
    return list(csv.DictReader(io.StringIO(text)))


def period_sort_key(period):
    """Sortable key for periods like '2026-05' or '2026-Q1'."""
    m = re.match(r"(\d{4})-Q(\d)", period)
    if m:
        return (int(m.group(1)), int(m.group(2)) * 3)  # quarter -> end month
    m = re.match(r"(\d{4})-(\d{2})", period)
    if m:
        return (int(m.group(1)), int(m.group(2)))
    return (0, 0)


def latest_by_area(rows, prefer_monthly=True):
    """Reduce SDMX CSV rows to {area: (period, value)} keeping the latest
    observation; monthly beats quarterly for the same period."""
    out = {}
    for row in rows:
        area = row["REF_AREA"]
        period = row["TIME_PERIOD"]
        try:
            value = float(row["OBS_VALUE"])
        except (ValueError, KeyError):
            continue
        freq_rank = 1 if (prefer_monthly and row.get("FREQ") == "M") else 0
        key = (*period_sort_key(period), freq_rank)
        if area not in out or key > out[area][0]:
            out[area] = (key, period, value)
    return {a: (p, v) for a, (_, p, v) in out.items()}


def fetch_yields(areas, start_period):
    """Latest long-term (10Y) government bond yields per area."""
    url = (
        f"{OECD_BASE}/OECD.SDD.STES,DSD_STES@DF_FINMARK,4.0/"
        f"{'+'.join(areas)}.M.IRLT.PA.....?startPeriod={start_period}&format=csvfile"
    )
    return latest_by_area(fetch_csv(url))


def fetch_inflation(areas, start_period):
    """Latest CPI YoY inflation per area.

    Most economies are in the main OECD prices dataflow; a few (e.g. Japan
    and other G20-only members) are only in the G20 prices dataflow, so
    query both and merge.
    """
    key = f"{'+'.join(areas)}.M+Q.N.CPI.PA._T.N.GY"
    query = f"{key}?startPeriod={start_period}&format=csvfile"
    rows = fetch_csv(f"{OECD_BASE}/OECD.SDD.TPS,DSD_PRICES@DF_PRICES_ALL,1.0/{query}")
    rows += fetch_csv(f"{OECD_BASE}/OECD.SDD.TPS,DSD_G20_PRICES@DF_G20_PRICES,1.0/{query}")
    return latest_by_area(rows)


def main():
    parser = argparse.ArgumentParser(description="Real yields of major currencies")
    parser.add_argument("--csv", metavar="FILE", help="also write results to a CSV file")
    parser.add_argument(
        "--months", type=int, default=15,
        help="how many months back to search for the latest data (default 15)",
    )
    args = parser.parse_args()

    from datetime import date
    today = date.today()
    total = today.year * 12 + (today.month - 1) - args.months
    start_period = f"{total // 12}-{total % 12 + 1:02d}"

    areas = [area for area, _ in CURRENCIES.values()]
    print("Fetching 10Y government bond yields (OECD)...", file=sys.stderr)
    yields = fetch_yields(areas, start_period)
    print("Fetching CPI inflation (OECD)...", file=sys.stderr)
    inflation = fetch_inflation(areas, start_period)

    results = []
    for ccy, (area, name) in CURRENCIES.items():
        y = yields.get(area)
        i = inflation.get(area)
        if not y or not i:
            missing = "yield" if not y else "inflation"
            print(f"  warning: no {missing} data for {ccy} ({area}), skipping",
                  file=sys.stderr)
            continue
        (y_period, y_val), (i_period, i_val) = y, i
        simple = y_val - i_val
        fisher = ((1 + y_val / 100) / (1 + i_val / 100) - 1) * 100
        results.append({
            "currency": ccy, "name": name,
            "nominal_10y": y_val, "yield_period": y_period,
            "cpi_yoy": i_val, "cpi_period": i_period,
            "real_yield": simple, "real_yield_fisher": fisher,
        })

    results.sort(key=lambda r: r["real_yield"], reverse=True)

    print()
    print(f"REAL YIELDS OF MAJOR CURRENCIES        (as of {today.isoformat()})")
    print("10Y government bond yield minus latest CPI inflation (YoY)")
    print()
    header = (f"{'Currency':<10}{'Economy':<22}{'10Y Yield':>10}{'(period)':>10}"
              f"{'CPI YoY':>9}{'(period)':>10}{'Real':>8}{'Fisher':>8}")
    print(header)
    print("-" * len(header))
    for r in results:
        print(f"{r['currency']:<10}{r['name']:<22}"
              f"{r['nominal_10y']:>9.2f}%{r['yield_period']:>10}"
              f"{r['cpi_yoy']:>8.2f}%{r['cpi_period']:>10}"
              f"{r['real_yield']:>7.2f}%{r['real_yield_fisher']:>7.2f}%")
    print("-" * len(header))
    print("Real = nominal - inflation; Fisher = (1+nominal)/(1+inflation) - 1")
    print("Yields: OECD long-term interest rates (10Y govt bonds). EUR uses the")
    print("euro-area aggregate. Latest available month/quarter is used per series.")

    if args.csv:
        with open(args.csv, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=list(results[0].keys()))
            writer.writeheader()
            writer.writerows(results)
        print(f"\nSaved CSV to {args.csv}")


if __name__ == "__main__":
    main()
