#!/usr/bin/env python3
"""Build data/market.json — all slow third-party data pre-fetched server-side.

Run by the scheduled GitHub Action so the site can load one small same-origin
file instead of querying slow APIs from every visitor's browser. Each section
is independent: if one source fails, the section is omitted and the page
falls back to querying that API directly.
"""

import csv
import io
import json
import math
import re
import sys
import urllib.request
from datetime import datetime, timedelta, timezone

OECD = "https://sdmx.oecd.org/public/rest/data"
AREAS = ["USA", "EA20", "JPN", "GBR", "CHE", "CAN", "AUS", "NZL", "SWE",
         "NOR", "KOR", "CHN", "IND", "BRA", "MEX", "ZAF", "POL"]
BIS_AREAS = ["US", "XM", "JP", "GB", "CH", "CA", "AU", "NZ", "SE",
             "NO", "KR", "CN", "IN", "BR", "MX", "ZA", "PL"]


def fetch(url, accept=None, timeout=90):
    req = urllib.request.Request(url, headers={
        "User-Agent": "real-yields-dashboard/1.0 (github.com/jeykay16/real-yields)",
        **({"Accept": accept} if accept else {}),
    })
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8-sig")


def csv_rows(text):
    return list(csv.DictReader(io.StringIO(text)))


def period_key(p):
    m = re.match(r"(\d{4})-Q(\d)", p)
    if m:
        return (int(m.group(1)), int(m.group(2)) * 3)
    m = re.match(r"(\d{4})-(\d{2})", p)
    if m:
        return (int(m.group(1)), int(m.group(2)))
    return (0, 0)


def num(s):
    """Parse a float, rejecting NaN/inf (invalid in strict JSON)."""
    v = float(s)
    if not math.isfinite(v):
        raise ValueError("non-finite")
    return v


def latest_by_area(rows):
    out = {}
    for r in rows:
        try:
            v = num(r["OBS_VALUE"])
        except (ValueError, KeyError):
            continue
        key = (*period_key(r["TIME_PERIOD"]), 1 if r.get("FREQ") == "M" else 0)
        a = r["REF_AREA"]
        if a not in out or key > out[a][0]:
            out[a] = (key, r["TIME_PERIOD"], v)
    return {a: {"p": p, "v": v} for a, (_, p, v) in out.items()}


def build():
    out = {"updated": datetime.now(timezone.utc).isoformat()}
    start = datetime.now(timezone.utc) - timedelta(days=460)
    start_p = f"{start.year}-{start.month:02d}"

    # --- OECD: latest 10Y yields + CPI YoY per area -------------------------
    try:
        areas = "+".join(AREAS)
        yrows = csv_rows(fetch(
            f"{OECD}/OECD.SDD.STES,DSD_STES@DF_FINMARK,4.0/{areas}.M.IRLT.PA....."
            f"?startPeriod={start_p}&format=csvfile"))
        key = f"{areas}.M+Q.N.CPI.PA._T.N.GY?startPeriod={start_p}&format=csvfile"
        crows = []
        for flow in ("OECD.SDD.TPS,DSD_PRICES@DF_PRICES_ALL,1.0",
                     "OECD.SDD.TPS,DSD_G20_PRICES@DF_G20_PRICES,1.0"):
            try:
                crows += csv_rows(fetch(f"{OECD}/{flow}/{key}"))
            except Exception:
                pass
        out["yields"] = latest_by_area(yrows)
        out["inflation"] = latest_by_area(crows)
    except Exception as e:
        print("yields/inflation failed:", e, file=sys.stderr)

    # --- OECD: US real-yield monthly series since 1989 ----------------------
    try:
        y = {r["TIME_PERIOD"]: num(r["OBS_VALUE"]) for r in csv_rows(fetch(
            f"{OECD}/OECD.SDD.STES,DSD_STES@DF_FINMARK,4.0/USA.M.IRLT.PA....."
            f"?startPeriod=1989-01&format=csvfile")) if r.get("FREQ") == "M"}
        c = {r["TIME_PERIOD"]: num(r["OBS_VALUE"]) for r in csv_rows(fetch(
            f"{OECD}/OECD.SDD.TPS,DSD_PRICES@DF_PRICES_ALL,1.0/USA.M.N.CPI.PA._T.N.GY"
            f"?startPeriod=1989-01&format=csvfile")) if r.get("FREQ") == "M"}
        out["usRealYield"] = [{"p": p, "v": round(y[p] - c[p], 4)}
                              for p in sorted(y) if p in c]
        out["usCpi"] = [{"p": p, "v": round(c[p], 4)} for p in sorted(c)][-30:]
    except Exception as e:
        print("usRealYield failed:", e, file=sys.stderr)

    # --- IMF: monthly oil price index (petroleum average spot) ---------------
    try:
        rows = fetch("https://api.imf.org/external/sdmx/2.1/data/IMF.RES,PCPS,9.0.0/"
                     "G001.POILAPSP.INDEX.M?startPeriod=2023",
                     accept="application/vnd.sdmx.data+csv")
        oil = []
        for line in rows.split("\n"):
            cells = line.split(",")
            if len(cells) > 6 and cells[4] == "M" and re.match(r"^\d{4}-M\d{2}$", cells[5]):
                try:
                    yy, mm = cells[5].split("-M")
                    oil.append({"p": f"{yy}-{mm}", "v": round(num(cells[6]), 4)})
                except ValueError:
                    pass
        oil.sort(key=lambda g: g["p"])
        if oil:
            out["oil"] = oil[-30:]
    except Exception as e:
        print("oil failed:", e, file=sys.stderr)

    # --- BIS: policy rates reduced per bank ---------------------------------
    try:
        start_d = (datetime.now(timezone.utc) - timedelta(days=430)).strftime("%Y-%m-%d")
        text = fetch("https://stats.bis.org/api/v2/data/dataflow/BIS/WS_CBPOL/1.0/" +
                     ",".join("D." + a for a in BIS_AREAS) +
                     f"?format=csv&startPeriod={start_d}", timeout=180)
        series = {}
        for r in csv_rows(text):
            try:
                v = num(r["OBS_VALUE"])
            except (ValueError, KeyError):
                continue
            series.setdefault(r["REF_AREA"], []).append((r["TIME_PERIOD"], v))
        cb = {}
        year_ago = (datetime.now(timezone.utc) - timedelta(days=365)).strftime("%Y-%m-%d")
        for a, s in series.items():
            s.sort()
            change = None
            for i in range(1, len(s)):
                if s[i][1] != s[i - 1][1]:
                    change = {"date": s[i][0], "from": s[i - 1][1], "to": s[i][1]}
            ya = s[0]
            for obs in s:
                if obs[0] <= year_ago:
                    ya = obs
                else:
                    break
            cb[a] = {"rate": s[-1][1], "date": s[-1][0], "change": change,
                     "yearAgo": ya[1]}
        out["cbRates"] = cb
    except Exception as e:
        print("cbRates failed:", e, file=sys.stderr)

    # --- IMF: monthly gold index since 1990 ----------------------------------
    try:
        rows = fetch("https://api.imf.org/external/sdmx/2.1/data/IMF.RES,PCPS,9.0.0/"
                     "G001.PGOLD.INDEX.M?startPeriod=1990",
                     accept="application/vnd.sdmx.data+csv")
        gold = []
        for line in rows.split("\n"):
            cells = line.split(",")
            if len(cells) > 6 and cells[4] == "M" and re.match(r"^\d{4}-M\d{2}$", cells[5]):
                try:
                    yy, mm = cells[5].split("-M")
                    gold.append({"p": f"{yy}-{mm}", "v": round(num(cells[6]), 4)})
                except ValueError:
                    pass
        gold.sort(key=lambda g: g["p"])
        if gold:
            out["imfGold"] = gold
    except Exception as e:
        print("imfGold failed:", e, file=sys.stderr)

    # --- ECB rates via Frankfurter: DXY-weighted dollar index ---------------
    try:
        w = {"EUR": 0.576, "JPY": 0.136, "GBP": 0.119, "CAD": 0.091,
             "SEK": 0.042, "CHF": 0.036}
        start_d = (datetime.now(timezone.utc) - timedelta(days=400)).strftime("%Y-%m-%d")
        data = json.loads(fetch(
            f"https://api.frankfurter.dev/v1/{start_d}..?base=USD&symbols=" +
            ",".join(w)))
        dates = sorted(data["rates"])
        first = data["rates"][dates[0]]
        out["dollarIndex"] = [
            {"d": d, "v": round(100 * math.prod(
                (data["rates"][d][c] / first[c]) ** wt for c, wt in w.items()), 4)}
            for d in dates]
    except Exception as e:
        print("dollarIndex failed:", e, file=sys.stderr)

    # --- CFTC: managed-money net gold positioning ----------------------------
    try:
        rows = json.loads(fetch(
            "https://publicreporting.cftc.gov/resource/72hh-3qpy.json"
            "?cftc_contract_market_code=088691"
            "&$select=report_date_as_yyyy_mm_dd,m_money_positions_long_all,"
            "m_money_positions_short_all"
            "&$order=report_date_as_yyyy_mm_dd%20DESC&$limit=160"))
        out["cot"] = sorted(
            ({"d": r["report_date_as_yyyy_mm_dd"][:10],
              "net": int(r["m_money_positions_long_all"]) -
                     int(r["m_money_positions_short_all"])} for r in rows),
            key=lambda x: x["d"])
    except Exception as e:
        print("cot failed:", e, file=sys.stderr)

    return out


if __name__ == "__main__":
    data = build()
    sections = [k for k in data if k != "updated"]
    print("built sections:", ", ".join(sections))
    if len(sections) < 3:
        print("too few sections succeeded — keeping previous file", file=sys.stderr)
        sys.exit(1)
    with open("data/market.json", "w") as f:
        json.dump(data, f, separators=(",", ":"), allow_nan=False)
    print("wrote data/market.json")
