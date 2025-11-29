from datetime import datetime, timedelta
from .models import Bankroll, Session


def ask_for_float(prompt: str) -> float:
    """Keep asking until the user enters a valid float."""
    while True:
        raw = input(prompt)
        try:
            value = float(raw)
            return value
        except ValueError:
            print("Invalid number, try again.")


def ask_for_int(prompt: str) -> int:
    """Keep asking until the user enters a valid integer."""
    while True:
        raw = input(prompt)
        try:
            value = int(raw)
            return value
        except ValueError:
            print("Invalid number, try again.")


# --- everything below here is your existing logic ---
# seed_example_data, build_summary, build_history, etc.
def seed_example_data() -> Bankroll:
    roll = Bankroll()

    base_date = datetime(2025, 1, 1)

    mock_sessions = [
        # game,           buy_in, cash_out, location, hours_played, bullets, format, tag,          notes
        ("0.10/0.20 NLH", 20,     42,       "Online", 2.5,          1,       "cash", "A-game",     "Ran hot vs calling station"),
        ("0.10/0.20 NLH", 20,     8,        "Online", 1.8,          2,       "cash", "spewy",      "Spewed in 3-bet pot"),
        ("0.10/0.20 NLH", 20,     24,       "IRL",    2.0,          1,       "cash", "standard",   "Home game, small win"),
        ("0.10/0.20 NLH", 20,     65,       "Online", 3.1,          1,       "cash", "locked-in",  "Hit a set multiway"),
        ("0.10/0.20 NLH", 20,     0,        "IRL",    1.2,          2,       "cash", "tilt",       "Coolered set over set"),
        ("0.10/0.20 NLH", 20,     30,       "Online", 1.5,          1,       "cash", "solid",      "Solid session, few big pots"),
        ("0.10/0.20 NLH", 20,     18,       "Online", 1.0,          1,       "cash", "card-dead",  "Card dead but stayed even"),
        ("0.10/0.20 NLH", 20,     55,       "IRL",    3.0,          1,       "cash", "good-table", "Good table, lots of limpers"),
        ("0.10/0.20 NLH", 20,     10,       "Online", 1.4,          1,       "cash", "spewy",      "Bluffed off in bad spot"),
        ("0.10/0.20 NLH", 20,     40,       "Online", 2.2,          1,       "cash", "solid",      "Played tight, got paid"),
        ("0.25/0.50 NLH", 50,     120,      "IRL",    3.5,          1,       "cash", "A-game",     "Deep stack, big bluff got through"),
        ("0.25/0.50 NLH", 50,     30,       "IRL",    2.0,          2,       "cash", "swingy",     "Lost a flip, clawed back a bit"),
        ("0.25/0.50 NLH", 50,     95,       "Online", 2.8,          1,       "cash", "good-table", "Table full of recreationals"),
        ("0.25/0.50 NLH", 50,     10,       "Online", 1.9,          1,       "cash", "hero-call",  "Bad hero call river"),
        ("0.25/0.50 NLH", 50,     140,      "IRL",    4.0,          1,       "cash", "crushed",    "Crushed home game"),
        ("0.10/0.20 PLO", 20,     50,       "Online", 1.7,          1,       "cash", "high-var",   "Wild game, lots of variance"),
        ("0.10/0.20 PLO", 20,     5,        "Online", 1.3,          2,       "cash", "punished",   "Tried PLO, got punished"),
        ("0.10/0.20 NLH", 20,     60,       "Online", 2.6,          1,       "cash", "focused",    "Good focus, few mistakes"),
        ("0.10/0.20 NLH", 20,     16,       "IRL",    1.5,          1,       "cash", "short",      "Short session before class"),
        ("0.10/0.20 NLH", 20,     70,       "Online", 3.2,          1,       "cash", "crushed",    "Crushed regs, ran well"),
    ]
    for i, (game, buy_in, cash_out, location, hours, bullets, fmt, tag, notes) in enumerate(
        mock_sessions
    ):
        session_date = base_date + timedelta(days=i)
        s = Session(
            game=game,
            buy_in=buy_in,
            cash_out=cash_out,
            location=location,
            hours_played=hours,
            notes=notes,
            date=session_date,
            stake=None,          # let it infer from game for now
            format=fmt,
            bullets=bullets,
            tag=tag,
        )
        roll.add_session(s)

    return roll


def create_session_from_input() -> Session:
    """Ask the user for session details and return a Session object."""
    print("\n=== Add a new poker session ===")
    game = input("Game (e.g. 0.10/0.20 NLH): ")
    location = input("Location (e.g. Online, Berkeley): ")

    buy_in = ask_for_float("Buy-in amount: ")
    cash_out = ask_for_float("Cash-out amount: ")

    hours_raw = input("Hours played (leave blank if unknown): ").strip()
    hours_played = None
    if hours_raw:
        try:
            hours_played = float(hours_raw)
        except ValueError:
            print("Invalid hours value, leaving as unknown.")
            hours_played = None

    notes = input("Notes (optional): ")

    session = Session(
        game=game,
        buy_in=buy_in,
        cash_out=cash_out,
        location=location,
        hours_played=hours_played,
        notes=notes,
    )
    return session


def print_detailed_report(roll: Bankroll) -> None:
    """Prints a detailed text report of the bankroll and all sessions."""
    print("\n=== Poker Bankroll Report ===")
    print(roll.summary())
    print()

    print("Sessions:")
    for idx, s in enumerate(roll.sessions, start=1):
        hours_str = f"{s.hours_played:.2f}h" if s.hours_played else "n/a"
        hr = s.hourly_rate
        hr_str = f"{hr:+.2f}/h" if hr is not None else "n/a"

        print(
            f"{idx:2d}) {s.date.strftime('%Y-%m-%d')} | {s.game:18} | "
            f"Buy-in: {s.buy_in:6.2f} | Cash-out: {s.cash_out:6.2f} | "
            f"Profit: {s.profit:+6.2f} | Hours: {hours_str:7} | "
            f"Hourly: {hr_str:9} | {s.location} | {s.notes}"
        )

    print()
    bw = roll.biggest_win()
    bl = roll.biggest_loss()

    if bw:
        print(
            f"Biggest win: {bw.profit:+.2f} in {bw.game} at {bw.location} "
            f"on {bw.date.strftime('%Y-%m-%d')}"
        )
    if bl:
        print(
            f"Biggest loss: {bl.profit:+.2f} in {bl.game} at {bl.location} "
            f"on {bl.date.strftime('%Y-%m-%d')}"
        )


def print_bankroll_graph(roll: Bankroll) -> None:
    """
    Print a simple ASCII graph of bankroll over time.
    No external libraries, just text.
    """
    history = roll.bankroll_history()
    if not history:
        print("No sessions yet, nothing to graph.")
        return

    print("\n=== Bankroll Over Time (ASCII graph) ===")
    max_value = max(history)
    min_value = min(history)
    span = max_value - min_value if max_value != min_value else 1.0

    for idx, value in enumerate(history, start=1):
        # Scale bar length to 40 characters max
        normalized = (value - min_value) / span
        bar_len = int(normalized * 40)
        bar = "#" * bar_len
        print(f"Session {idx:2d}: {value:8.2f} | {bar}")


if __name__ == "__main__":
    bankroll = seed_example_data()

    while True:
        print("\n=== Poker Bankroll Menu ===")
        print("1) View detailed report")
        print("2) Add a new session")
        print("3) Show bankroll graph")
        print("4) Quit")

        choice = input("Choose an option (1/2/3/4): ").strip()

        if choice == "1":
            print_detailed_report(bankroll)

        elif choice == "2":
            try:
                new_session = create_session_from_input()
                bankroll.add_session(new_session)
                print("Session added.")
            except ValueError as e:
                # Handles validation errors from Session (e.g., negative amounts)
                print(f"Could not create session: {e}")

        elif choice == "3":
            print_bankroll_graph(bankroll)

        elif choice == "4":
            print("Goodbye.")
            break

        else:
            print("Invalid choice, try again.")