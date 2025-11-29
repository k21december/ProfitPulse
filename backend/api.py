# backend/api.py

from __future__ import annotations

import csv
import io
from typing import Dict, Any

import pandas as pd
from flask import Flask, jsonify, request, Response
from flask_cors import CORS

from .models import Bankroll, Session
from .main import seed_example_data
from .storage import load_bankroll, save_bankroll

app = Flask(__name__)
CORS(app)

# -----------------------------------------------------------
# Initialise bankroll (load from disk or seed demo data)
# -----------------------------------------------------------

bankroll: Bankroll | None = load_bankroll()
if bankroll is None:
    bankroll = seed_example_data()
    save_bankroll(bankroll)


# -----------------------------------------------------------
# Helpers
# -----------------------------------------------------------

def session_to_json(s: Session) -> Dict[str, Any]:
    """
    Serialize a Session object to a flat dict for JSON responses.
    """
    return {
        "date": s.date.isoformat() if s.date else None,
        "game": s.game,
        "buy_in": s.buy_in,
        "cash_out": s.cash_out,
        "profit": s.profit,
        "hours_played": s.hours_played,
        "hourly_rate": s.hourly_rate,
        "location": s.location,
        "notes": s.notes,
        # extended fields
        "bullets": getattr(s, "bullets", None),
        "tag": getattr(s, "tag", None),
        "format": getattr(s, "format", None),
        "stake": getattr(s, "stake", None),
    }


def sessions_to_dataframe() -> pd.DataFrame:
    """
    Convert in-memory sessions to a pandas DataFrame for analysis.
    """
    rows = []
    for s in bankroll.sessions:
        rows.append(
            {
                "game": s.game,
                "stake": getattr(s, "stake", None),
                "format": getattr(s, "format", None),
                "location": s.location,
                "tag": getattr(s, "tag", None),
                "buy_in": s.buy_in,
                "cash_out": s.cash_out,
                "profit": s.profit,
                "hours_played": s.hours_played,
                "hourly_rate": s.hourly_rate,
                "bullets": getattr(s, "bullets", 1),
                "date": s.date.isoformat() if s.date else None,
            }
        )
    if not rows:
        return pd.DataFrame()
    return pd.DataFrame(rows)


# -----------------------------------------------------------
# Core API endpoints
# -----------------------------------------------------------

@app.route("/api/summary", methods=["GET"])
def api_summary():
    """Return bankroll.summary() as an array of lines for the UI."""
    text = bankroll.summary()
    if isinstance(text, str):
        lines = text.split("\n")
    else:
        lines = list(text)
    return jsonify({"summary": lines})


@app.route("/api/history", methods=["GET"])
def api_history():
    """Return bankroll history for the graph."""
    history = bankroll.bankroll_history()
    labels = [f"Session {i}" for i in range(1, len(history) + 1)]
    return jsonify({"labels": labels, "data": history})


@app.route("/api/sessions", methods=["GET", "POST"])
def api_sessions():
    """
    GET: return all sessions.
    POST: create a new session.
    """
    if request.method == "GET":
        return jsonify({"sessions": [session_to_json(s) for s in bankroll.sessions]})

    # POST – create
    data = request.get_json() or {}

    try:
        buy_in = float(data["buy_in"])
        cash_out = float(data["cash_out"])
    except (KeyError, ValueError) as e:
        return jsonify({"error": f"Invalid buy_in/cash_out: {e}"}), 400

    hours_played = data.get("hours_played")
    if hours_played is not None:
        try:
            hours_played = float(hours_played)
        except (TypeError, ValueError):
            hours_played = None

    # bullets optional
    bullets = data.get("bullets")
    try:
        if bullets is not None and bullets != "":
            bullets = int(bullets)
        else:
            bullets = 1
    except (TypeError, ValueError):
        bullets = 1

    try:
        session = Session(
            game=data.get("game"),
            buy_in=buy_in,
            cash_out=cash_out,
            location=data.get("location") or "Unknown",
            hours_played=hours_played,
            notes=data.get("notes") or "",
            bullets=bullets,
            tag=data.get("tag"),
            format=data.get("format"),
            stake=data.get("stake"),
        )
    except Exception as e:
        return jsonify({"error": f"Could not create session: {e}"}), 400

    bankroll.add_session(session)
    save_bankroll(bankroll)

    return jsonify({"ok": True, "session": session_to_json(session)}), 201


@app.route("/api/sessions/<int:index>", methods=["DELETE", "PUT"])
def api_session_modify(index: int):
    """
    DELETE: remove session at index.
    PUT: update session at index with payload fields.
    Index is based on the in-memory list order (same as frontend).
    """
    if index < 0 or index >= len(bankroll.sessions):
        return jsonify({"error": "Invalid index"}), 400

    if request.method == "DELETE":
        del bankroll.sessions[index]
        save_bankroll(bankroll)
        return jsonify({"ok": True})

    # PUT – update
    data = request.get_json() or {}
    s = bankroll.sessions[index]

    # Update simple string fields
    if "game" in data:
        s.game = data["game"]
    if "location" in data:
        s.location = data["location"] or "Unknown"
    if "notes" in data:
        s.notes = data["notes"] or ""
    if "format" in data:
        setattr(s, "format", data["format"])
    if "stake" in data:
        setattr(s, "stake", data["stake"])
    if "tag" in data:
        setattr(s, "tag", data["tag"])
    if "bullets" in data:
        try:
            bullets_val = int(data["bullets"])
        except (TypeError, ValueError):
            bullets_val = getattr(s, "bullets", 1) or 1
        setattr(s, "bullets", bullets_val)

    # Numeric fields with safe parsing
    def maybe_float(key: str, current):
        if key not in data:
            return current
        raw = data.get(key)
        if raw is None or raw == "":
            return None
        try:
            return float(raw)
        except (TypeError, ValueError):
            return current

    old_buy_in = s.buy_in
    old_cash_out = s.cash_out
    old_hours = s.hours_played

    s.buy_in = maybe_float("buy_in", old_buy_in)
    s.cash_out = maybe_float("cash_out", old_cash_out)
    s.hours_played = maybe_float("hours_played", old_hours)

    # Recompute profit / hourly if your Session model doesn't do it automatically
    # (If your Session has properties for these, this is harmless.)
    if s.buy_in is not None and s.cash_out is not None:
        try:
            s.profit = s.cash_out - s.buy_in  # will be ignored if profit is @property without setter
        except AttributeError:
            # profit is probably a @property; ignore, Bankroll / Session already handle it
            pass

    try:
        save_bankroll(bankroll)
    except Exception as e:
        return jsonify({"error": f"Failed to save updated session: {e}"}), 500

    return jsonify({"ok": True, "session": session_to_json(s)})


# -----------------------------------------------------------
# Advanced stats (no ML yet, but ready for it)
# -----------------------------------------------------------

@app.route("/api/stats/advanced", methods=["GET"])
def api_stats_advanced():
    """
    Backend-computed aggregates for the Stats page.
    """
    sessions = bankroll.sessions
    total_sessions = len(sessions)
    total_profit = sum(s.profit for s in sessions)
    total_hours = sum((s.hours_played or 0.0) for s in sessions)
    hourly = total_profit / total_hours if total_hours > 0 else None

    # By location
    by_location: Dict[str, Dict[str, Any]] = {}
    for s in sessions:
        loc = s.location or "Unknown"
        info = by_location.setdefault(
            loc, {"sessions": 0, "total_profit": 0.0, "total_hours": 0.0}
        )
        info["sessions"] += 1
        info["total_profit"] += s.profit
        info["total_hours"] += s.hours_played or 0.0

    for loc, info in by_location.items():
        hrs = info["total_hours"]
        info["hourly"] = info["total_profit"] / hrs if hrs > 0 else None

    # By game
    by_game: Dict[str, Dict[str, Any]] = {}
    for s in sessions:
        g = s.game or "Unknown"
        info = by_game.setdefault(
            g, {"sessions": 0, "total_profit": 0.0, "total_hours": 0.0}
        )
        info["sessions"] += 1
        info["total_profit"] += s.profit
        info["total_hours"] += s.hours_played or 0.0

    for g, info in by_game.items():
        hrs = info["total_hours"]
        info["hourly"] = info["total_profit"] / hrs if hrs > 0 else None

    # Profit variance / stdev
    profits = [s.profit for s in sessions]
    variance = None
    stdev = None
    if len(profits) > 1 and total_sessions > 1:
        mean = total_profit / total_sessions
        variance = sum((p - mean) ** 2 for p in profits) / (len(profits) - 1)
        stdev = variance ** 0.5

    # Bullets
    total_bullets = 0
    for s in sessions:
        b = getattr(s, "bullets", None)
        if isinstance(b, (int, float)):
            total_bullets += int(b)

    return jsonify(
        {
            "total_sessions": total_sessions,
            "total_profit": total_profit,
            "total_hours": total_hours,
            "hourly": hourly,
            "by_location": by_location,
            "by_game": by_game,
            "variance": variance,
            "stdev": stdev,
            "total_bullets": total_bullets,
        }
    )


@app.route("/api/stats/tags", methods=["GET"])
def stats_tags():
    """
    Hourly winrate by 'tag' (style: TAG / LAG / NIT / Manic).
    Returns: { "tags": { tag: { count, mean_hourly } } }
    """
    df = sessions_to_dataframe()
    if df.empty or "tag" not in df or "hourly_rate" not in df:
        return jsonify({"tags": {}})

    sub = df.dropna(subset=["tag", "hourly_rate"])
    if sub.empty:
        return jsonify({"tags": {}})

    grouped = (
        sub.groupby("tag")["hourly_rate"]
        .agg(count="count", mean_hourly="mean")
        .sort_values("mean_hourly", ascending=False)
    )

    tags = {
        str(tag): {
            "count": int(row["count"]),
            "mean_hourly": float(row["mean_hourly"]),
        }
        for tag, row in grouped.iterrows()
    }

    return jsonify({"tags": tags})


@app.route("/api/stats/session_length", methods=["GET"])
def stats_session_length():
    """
    Profit by session length bucket (0–2h, 2–3h, 3–4h, 4h+).
    Returns: { "buckets": { label: { count, mean_profit, total_profit } } }
    """
    df = sessions_to_dataframe()
    if df.empty or "hours_played" not in df or "profit" not in df:
        return jsonify({"buckets": {}})

    sub = df.dropna(subset=["hours_played", "profit"]).copy()
    if sub.empty:
        return jsonify({"buckets": {}})

    bins = [0, 2, 3, 4, 999]
    labels = ["0–2h", "2–3h", "3–4h", "4h+"]
    sub["length_bucket"] = pd.cut(
        sub["hours_played"], bins=bins, labels=labels, right=False
    )

    grouped = (
        sub.groupby("length_bucket")["profit"]
        .agg(count="count", mean_profit="mean", total_profit="sum")
        .sort_index()
    )

    buckets = {}
    for bucket, row in grouped.iterrows():
        label = str(bucket)
        buckets[label] = {
            "count": int(row["count"]),
            "mean_profit": float(row["mean_profit"]),
            "total_profit": float(row["total_profit"]),
        }

    return jsonify({"buckets": buckets})


# -----------------------------------------------------------
# Export / health
# -----------------------------------------------------------

@app.route("/api/export/csv", methods=["GET"])
def api_export_csv():
    """
    Export all sessions as CSV (for pandas/Excel).
    """
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(
        [
            "date",
            "game",
            "stake",
            "format",
            "location",
            "buy_in",
            "cash_out",
            "profit",
            "hours_played",
            "hourly_rate",
            "bullets",
            "tag",
            "notes",
        ]
    )

    for s in bankroll.sessions:
        writer.writerow(
            [
                s.date.isoformat() if s.date else "",
                s.game or "",
                getattr(s, "stake", "") or "",
                getattr(s, "format", "") or "",
                s.location or "",
                s.buy_in,
                s.cash_out,
                s.profit,
                s.hours_played if s.hours_played is not None else "",
                s.hourly_rate if s.hourly_rate is not None else "",
                getattr(s, "bullets", ""),
                getattr(s, "tag", "") or "",
                s.notes or "",
            ]
        )

    csv_data = output.getvalue()
    output.close()

    return Response(
        csv_data,
        mimetype="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=profitpulse_sessions.csv"
        },
    )


@app.route("/api/health", methods=["GET"])
def api_health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(debug=True)