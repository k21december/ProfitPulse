from pathlib import Path
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"
csv_path = DATA_DIR / "profitpulse_sessions.csv"

df = pd.read_csv(csv_path)

print(df.head())
print(df.describe(include="all"))

# Example: hourly by game
by_game = df.groupby("game")["hourly_rate"].agg(["count", "mean", "sum"])
print("\nHourly by game:")
print(by_game)

print("\n=== Biggest winning sessions ===")
print(
    df.sort_values("profit", ascending=False)[
        ["date", "game", "location", "profit", "hours_played", "tag"]
    ].head(5)
)

print("\n=== Biggest losing sessions ===")
print(
    df.sort_values("profit", ascending=True)[
        ["date", "game", "location", "profit", "hours_played", "tag"]
    ].head(5)
)

print("\n=== Profit by location ===")
by_location = df.groupby("location")["profit"].agg(["count", "sum", "mean"])
print(by_location)

print("\n=== Cumulative bankroll over time ===")
df_sorted = df.sort_values("date")
df_sorted["cumulative_bankroll"] = df_sorted["profit"].cumsum()
print(df_sorted[["date", "profit", "cumulative_bankroll"]].head(10))

print("\n=== Hourly by mental state tag ===")
if "tag" in df.columns and "hourly_rate" in df.columns:
    tag_stats = (
        df.groupby("tag")["hourly_rate"]
        .agg(["count", "mean"])
        .sort_values("mean", ascending=False)
    )
    print(tag_stats)
else:
    print("Missing 'tag' or 'hourly_rate' columns in CSV.")

print("\n=== Performance by session length bucket ===")
if "hours_played" in df.columns:
    bins = [0, 2, 3, 4, 999]
    labels = ["0–2h", "2–3h", "3–4h", "4h+"]
    df["length_bucket"] = pd.cut(df["hours_played"], bins=bins, labels=labels, right=False)

    length_stats = (
        df.groupby("length_bucket")["profit"]
        .agg(["count", "mean", "sum"])
        .sort_index()
    )
    print(length_stats)
else:
    print("Missing 'hours_played' column in CSV.")