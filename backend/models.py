from datetime import datetime
from typing import List, Optional


from datetime import datetime


class Session:
    def __init__(
        self,
        game: str,
        buy_in: float,
        cash_out: float,
        location: str = "Unknown",
        hours_played: float | None = None,
        notes: str = "",
        date: datetime | None = None,
        *,
        stake: str | None = None,
        format: str = "cash",
        bullets: int = 1,
        tag: str | None = None,
    ):
        """
        Represents a single poker session.

        stake: e.g. "0.10/0.20", "0.25/0.50"
        format: "cash", "tournament", etc.
        bullets: how many buy-ins fired in this session
        tag: short label like "A-game", "tired", "tilt", etc.
        """
        self.game = game
        self.buy_in = float(buy_in)
        self.cash_out = float(cash_out)
        self.location = location
        self.hours_played = hours_played
        self.notes = notes
        self.date = date or datetime.now()

        # NEW fields
        self.stake = stake or self._infer_stake_from_game(game)
        self.format = format
        self.bullets = int(bullets) if bullets is not None else 1
        self.tag = tag or ""

        # DO NOT assign self.profit or self.hourly_rate here;
        # they are computed via @property methods below.

    def _infer_stake_from_game(self, game: str) -> str:
        """
        Try to guess the stake from the game string.
        e.g. "0.10/0.20 NLH" -> "0.10/0.20"
        """
        parts = game.split()
        if parts and "/" in parts[0]:
            return parts[0]
        return "unknown"

    @property
    def profit(self) -> float:
        """Net profit for the session."""
        return self.cash_out - self.buy_in

    @property
    def hourly_rate(self) -> float | None:
        """Profit per hour, if hours_played is known."""
        if self.hours_played and self.hours_played > 0:
            return self.profit / self.hours_played
        return None

    def __repr__(self) -> str:
        return (
            f"Session(game={self.game!r}, stake={self.stake!r}, "
            f"buy_in={self.buy_in}, cash_out={self.cash_out}, "
            f"location={self.location!r}, hours_played={self.hours_played}, "
            f"bullets={self.bullets}, tag={self.tag!r}, "
            f"profit={self.profit:+.2f})"
        )
        """
        Represents a single poker session.

        stake: e.g. "0.10/0.20", "0.25/0.50"
        format: "cash", "tournament", etc.
        bullets: how many buy-ins fired in this session
        tag: short label like "A-game", "tired", "tilt", etc.
        """
        self.game = game
        self.buy_in = float(buy_in)
        self.cash_out = float(cash_out)
        self.location = location
        self.hours_played = hours_played
        self.notes = notes
        self.date = date or datetime.now()

        # NEW fields (with sensible defaults)
        self.stake = stake or self._infer_stake_from_game(game)
        self.format = format
        self.bullets = int(bullets) if bullets is not None else 1
        self.tag = tag or ""

        # Derived fields
        self.profit = self.cash_out - self.buy_in
        self.hourly_rate = (
            self.profit / hours_played if hours_played and hours_played > 0 else None
        )

    def _infer_stake_from_game(self, game: str) -> str:
        """
        Try to guess the stake from the game string.
        e.g. "0.10/0.20 NLH" -> "0.10/0.20"
        """
        parts = game.split()
        if parts:
            # if first token looks like "0.10/0.20"
            if "/" in parts[0]:
                return parts[0]
        return "unknown"

    @property
    def profit(self) -> float:
        """Cash-out minus buy-in for this session."""
        return self.cash_out - self.buy_in

    @property
    def hourly_rate(self) -> Optional[float]:
        """
        Profit per hour for this session, if hours_played is known.
        Returns None if we don't have hours.
        """
        if self.hours_played is None or self.hours_played <= 0:
            return None
        return self.profit / self.hours_played

    def __repr__(self) -> str:
        return (
            f"Session(game={self.game!r}, buy_in={self.buy_in}, "
            f"cash_out={self.cash_out}, location={self.location!r}, "
            f"date={self.date!r}, hours_played={self.hours_played})"
        )


class Bankroll:
    """
    Tracks your overall bankroll and all sessions.
    """

    def __init__(self, starting_amount: float = 0.0) -> None:
        if starting_amount < 0:
            raise ValueError("starting_amount must be non-negative")
        self.starting_amount = float(starting_amount)
        self.sessions: List[Session] = []

    def add_session(self, session: Session) -> None:
        """Add a session to the bankroll history."""
        self.sessions.append(session)

    def total_profit(self) -> float:
        """Sum of profits across all sessions."""
        return sum(s.profit for s in self.sessions)

    def current_bankroll(self) -> float:
        """Starting amount + total profit."""
        return self.starting_amount + self.total_profit()

    def total_hours(self) -> float:
        """Sum of hours_played for sessions that have it."""
        return sum(
            s.hours_played
            for s in self.sessions
            if s.hours_played is not None and s.hours_played > 0
        )

    def hourly_rate(self) -> Optional[float]:
        """
        Overall hourly winrate:
        total profit / total hours across all sessions with recorded hours.
        """
        hours = self.total_hours()
        if hours <= 0:
            return None
        return self.total_profit() / hours

    def winrate(self) -> Optional[float]:
        """
        General winrate as a percentage of winning sessions.
        Returns None if there are no sessions.
        """
        if not self.sessions:
            return None
        wins = sum(1 for s in self.sessions if s.profit > 0)
        return (wins / len(self.sessions)) * 100.0

    def biggest_win(self) -> Optional[Session]:
        """Session with the highest profit (or None if no sessions)."""
        if not self.sessions:
            return None
        return max(self.sessions, key=lambda s: s.profit)

    def biggest_loss(self) -> Optional[Session]:
        """Session with the lowest profit (or None if no sessions)."""
        if not self.sessions:
            return None
        return min(self.sessions, key=lambda s: s.profit)

    def bankroll_history(self) -> List[float]:
        """
        Returns a list of bankroll values after each session,
        in chronological order.
        """
        history: List[float] = []
        current = self.starting_amount
        for s in self.sessions:
            current += s.profit
            history.append(current)
        return history

    def summary(self) -> str:
        """Multi-line text summary of key stats."""
        num = len(self.sessions)
        total = self.total_profit()
        current = self.current_bankroll()
        hours = self.total_hours()
        hr = self.hourly_rate()
        wr = self.winrate()

        lines = [
            f"Sessions: {num}",
            f"Total profit: {total:+.2f}",
            f"Current bankroll: {current:.2f}",
        ]

        if hours > 0:
            lines.append(f"Total hours (recorded): {hours:.2f}")
        if hr is not None:
            lines.append(f"Overall hourly rate: {hr:+.2f} per hour")
        if wr is not None:
            lines.append(f"Winrate: {wr:.1f}% of sessions winning")

        return "\n".join(lines)

    def __repr__(self) -> str:
        return (
            f"Bankroll(starting_amount={self.starting_amount}, "
            f"sessions={len(self.sessions)})"
        )