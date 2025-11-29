# backend/storage.py

from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from datetime import datetime

from .models import Bankroll, Session


# data/sessions.json relative to project root
PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"
DATA_FILE = DATA_DIR / "sessions.json"


def _session_to_dict(s: Session) -> dict:
    """Convert a Session object into a JSON-serializable dict."""
    return {
        "game": s.game,
        "buy_in": s.buy_in,
        "cash_out": s.cash_out,
        "location": s.location,
        "hours_played": s.hours_played,
        "notes": s.notes,
        "date": s.date.isoformat() if s.date else None,
        # optional fields – only present if your Session actually has them
        "bullets": getattr(s, "bullets", None),
        "tag": getattr(s, "tag", None),
        "format": getattr(s, "format", None),
        "stake": getattr(s, "stake", None),
    }


def _session_from_dict(d: dict) -> Session:
    """Create a Session back from a dict."""
    # handle date string -> datetime
    date_str = d.get("date")
    date = datetime.fromisoformat(date_str) if date_str else None

    return Session(
        game=d.get("game"),
        buy_in=d.get("buy_in", 0.0),
        cash_out=d.get("cash_out", 0.0),
        location=d.get("location") or "Unknown",
        hours_played=d.get("hours_played"),
        notes=d.get("notes") or "",
        date=date,
        bullets=d.get("bullets"),
        tag=d.get("tag"),
        format=d.get("format"),
        stake=d.get("stake"),
    )


def save_bankroll(roll: Bankroll) -> None:
    """Write current bankroll sessions to data/sessions.json."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    payload = {
        "sessions": [_session_to_dict(s) for s in roll.sessions],
    }

    with DATA_FILE.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)


def load_bankroll() -> Optional[Bankroll]:
    """
    Load bankroll from data/sessions.json.

    Returns Bankroll if file exists, otherwise None (caller decides to seed).
    """
    if not DATA_FILE.exists():
        return None

    with DATA_FILE.open("r", encoding="utf-8") as f:
        data = json.load(f)

    roll = Bankroll()
    for s_dict in data.get("sessions", []):
        s = _session_from_dict(s_dict)
        roll.add_session(s)

    return roll