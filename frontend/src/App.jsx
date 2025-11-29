// src/App.jsx
import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

const API_BASE = "http://127.0.0.1:5000/api";

/* ---------- Helpers ---------- */

function movingAverage(arr, windowSize = 3) {
  if (!arr.length) return [];
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const slice = arr.slice(start, i + 1);
    const avg = slice.reduce((sum, v) => sum + v, 0) / slice.length;
    result.push(avg);
  }
  return result;
}

function formatMoney(v) {
  if (v == null || Number.isNaN(v)) return "n/a";
  const sign = v >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(v).toFixed(2)}`;
}

/* ---------- Root App ---------- */

function App() {
  const [summary, setSummary] = useState([]);
  const [labels, setLabels] = useState([]);
  const [history, setHistory] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [advancedStats, setAdvancedStats] = useState(null);
  const [tagStats, setTagStats] = useState({});
  const [lengthStats, setLengthStats] = useState({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activePage, setActivePage] = useState("bankroll"); // 'bankroll' | 'sessions' | 'stats' | 'advice'

  async function fetchAllData() {
    try {
      setLoading(true);
      setError("");

      const [
        summaryRes,
        historyRes,
        sessionsRes,
        advRes,
        tagsRes,
        lengthRes,
      ] = await Promise.all([
        fetch(`${API_BASE}/summary`),
        fetch(`${API_BASE}/history`),
        fetch(`${API_BASE}/sessions`),
        fetch(`${API_BASE}/stats/advanced`),
        fetch(`${API_BASE}/stats/tags`),
        fetch(`${API_BASE}/stats/session_length`),
      ]);

      if (
        !summaryRes.ok ||
        !historyRes.ok ||
        !sessionsRes.ok ||
        !advRes.ok ||
        !tagsRes.ok ||
        !lengthRes.ok
      ) {
        throw new Error("One of the API requests failed");
      }

      const summaryJson = await summaryRes.json();
      const historyJson = await historyRes.json();
      const sessionsJson = await sessionsRes.json();
      const advJson = await advRes.json();
      const tagsJson = await tagsRes.json();
      const lengthJson = await lengthRes.json();

      setSummary(summaryJson.summary || []);
      setLabels(historyJson.labels || []);
      setHistory(historyJson.data || []);
      setSessions(sessionsJson.sessions || []);
      setAdvancedStats(advJson || null);
      setTagStats(tagsJson.tags || {});
      setLengthStats(lengthJson.buckets || {});

      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Failed to load data from backend.");
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAllData();
  }, []);

  // Create new session via API
  async function handleCreateSession(payload) {
    try {
      const body = {
        game: payload.game,
        stake: payload.stake || null,
        format: payload.format || "cash",
        location: payload.location || "Unknown",
        buy_in: parseFloat(payload.buy_in),
        cash_out: parseFloat(payload.cash_out),
        hours_played:
          payload.hours_played === "" || payload.hours_played == null
            ? null
            : parseFloat(payload.hours_played),
        bullets:
          payload.bullets === "" || payload.bullets == null
            ? 1
            : parseInt(payload.bullets, 10),
        tag: payload.tag || "",
        notes: payload.notes || "",
      };

      if (Number.isNaN(body.buy_in) || Number.isNaN(body.cash_out)) {
        throw new Error("Buy-in and cash-out must be valid numbers.");
      }

      const res = await fetch(`${API_BASE}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        let msg = "Failed to create session.";
        try {
          const data = await res.json();
          if (data.error) msg = data.error;
        } catch (_) {
          // ignore json parse failure
        }
        throw new Error(msg);
      }

      await fetchAllData();
      return { ok: true };
    } catch (err) {
      console.error(err);
      return { ok: false, error: err.message || "Unknown error" };
    }
  }

  // Update an existing session by index
  async function handleUpdateSession(index, payload) {
    try {
      const body = {
        game: payload.game,
        stake: payload.stake || null,
        format: payload.format || "cash",
        location: payload.location || "Unknown",
        buy_in: parseFloat(payload.buy_in),
        cash_out: parseFloat(payload.cash_out),
        hours_played:
          payload.hours_played === "" || payload.hours_played == null
            ? null
            : parseFloat(payload.hours_played),
        bullets:
          payload.bullets === "" || payload.bullets == null
            ? null
            : parseInt(payload.bullets, 10),
        tag: payload.tag || "",
        notes: payload.notes || "",
      };

      if (Number.isNaN(body.buy_in) || Number.isNaN(body.cash_out)) {
        throw new Error("Buy-in and cash-out must be valid numbers.");
      }

      const res = await fetch(`${API_BASE}/sessions/${index}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        let msg = "Failed to update session.";
        try {
          const data = await res.json();
          if (data.error) msg = data.error;
        } catch (_) {
          // ignore json parse failure
        }
        throw new Error(msg);
      }

      await fetchAllData();
      return { ok: true };
    } catch (err) {
      console.error(err);
      return { ok: false, error: err.message || "Unknown error" };
    }
  }

  // Delete a session by its index
  async function handleDeleteSession(index) {
    try {
      const res = await fetch(`${API_BASE}/sessions/${index}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        let msg = "Failed to delete session.";
        try {
          const data = await res.json();
          if (data.error) msg = data.error;
        } catch (_) {
          // ignore json parse error
        }
        throw new Error(msg);
      }

      await fetchAllData();
      return { ok: true };
    } catch (err) {
      console.error(err);
      return { ok: false, error: err.message || "Unknown error" };
    }
  }

  if (loading && !summary.length && !history.length && !sessions.length) {
    return (
      <div className="app-root">
        <div className="app-shell">
          <div>Loading…</div>
        </div>
      </div>
    );
  }

  if (error && !summary.length && !history.length && !sessions.length) {
    return (
      <div className="app-root">
        <div className="app-shell">
          <div className="status-error">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-root">
      <div className="app-shell">
        <header className="app-header">
          <div className="brand">
            ♠ ProfitPulse <span className="brand-accent">♥</span>
            <span className="brand-sub">Poker & Investment Management</span>
          </div>
          <nav className="nav-tabs">
            <button
              className={
                "nav-btn" + (activePage === "bankroll" ? " active" : "")
              }
              onClick={() => setActivePage("bankroll")}
            >
              Bankroll
            </button>
            <button
              className={
                "nav-btn" + (activePage === "sessions" ? " active" : "")
              }
              onClick={() => setActivePage("sessions")}
            >
              Sessions
            </button>
            <button
              className={
                "nav-btn" + (activePage === "stats" ? " active" : "")
              }
              onClick={() => setActivePage("stats")}
            >
              Stats
            </button>
            <button
              className={
                "nav-btn" + (activePage === "advice" ? " active" : "")
              }
              onClick={() => setActivePage("advice")}
            >
              Advice
            </button>
          </nav>
        </header>

        {loading && (
          <div className="section-card">
            <div>Refreshing data…</div>
          </div>
        )}

        {error && !loading && (
          <div className="section-card status-error">{error}</div>
        )}

        {activePage === "bankroll" && (
          <BankrollPage
            summary={summary}
            labels={labels}
            history={history}
            sessions={sessions}
          />
        )}

        {activePage === "sessions" && (
          <SessionsPage
            sessions={sessions}
            onCreateSession={handleCreateSession}
            onDeleteSession={handleDeleteSession}
            onUpdateSession={handleUpdateSession}
          />
        )}

        {activePage === "stats" && (
          <StatsPage
            summary={summary}
            sessions={sessions}
            advancedStats={advancedStats}
            tagStats={tagStats}
            lengthStats={lengthStats}
          />
        )}

        {activePage === "advice" && (
          <AdvicePage sessions={sessions} advancedStats={advancedStats} />
        )}
      </div>
    </div>
  );
}

/* ---------- Bankroll Page ---------- */

function BankrollPage({ summary, labels, history, sessions }) {
  const [graphMode, setGraphMode] = useState("bankroll"); // 'bankroll' | 'profit'
  const [rangeMode, setRangeMode] = useState("all"); // 'all' | '10' | '20'

  const perSessionProfit = sessions.map((s) => s.profit ?? 0);
  const baseSeries = graphMode === "bankroll" ? history : perSessionProfit;

  let displayLabels = labels;
  let displaySeries = baseSeries;

  const n = baseSeries.length;
  if (rangeMode === "10" && n > 10) {
    const start = n - 10;
    displayLabels = labels.slice(start);
    displaySeries = baseSeries.slice(start);
  } else if (rangeMode === "20" && n > 20) {
    const start = n - 20;
    displayLabels = labels.slice(start);
    displaySeries = baseSeries.slice(start);
  }

  const maSeries = movingAverage(displaySeries, 3);

  const chartData = {
    labels: displayLabels,
    datasets: [
      {
        label:
          graphMode === "bankroll"
            ? "Bankroll ($)"
            : "Profit this session ($)",
        data: displaySeries,
        borderWidth: 2,
        tension: 0.25,
        borderColor: "#ff4b5c",
        backgroundColor: "rgba(255, 75, 92, 0.2)",
        pointRadius: 3,
      },
      {
        label: "Moving average",
        data: maSeries,
        borderWidth: 1.5,
        tension: 0.25,
        borderColor: "#8888ff",
        borderDash: [6, 4],
        pointRadius: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
        labels: { color: "#ffffff" },
      },
      title: {
        display: true,
        text:
          graphMode === "bankroll"
            ? "Bankroll Over Time"
            : "Profit Per Session",
        color: "#ffffff",
      },
      tooltip: {
        callbacks: {
          label: (ctx) =>
            `${ctx.dataset.label}: $${ctx.parsed.y.toFixed(2)}`,
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: "Session", color: "#ffffff" },
        ticks: { color: "#cccccc" },
        grid: { color: "rgba(255,255,255,0.08)" },
      },
      y: {
        title: { display: true, text: "Dollars ($)", color: "#ffffff" },
        ticks: { color: "#cccccc" },
        grid: { color: "rgba(255,255,255,0.08)" },
      },
    },
  };

  return (
    <>
      <section className="section-card">
        <div className="section-header-row">
          <h2 className="section-title">Bankroll Summary</h2>
          <a
            className="btn-primary"
            href={`${API_BASE}/export/csv`}
            target="_blank"
            rel="noreferrer"
          >
            Export CSV
          </a>
        </div>
        <ul className="summary-list">
          {summary.map((line, idx) => (
            <li key={idx}>{line}</li>
          ))}
        </ul>
      </section>

      <section className="section-card">
        <div className="section-header-row">
          <h2 className="section-title">Graph</h2>
          <div className="pill-row">
            <span className="pill-label">Mode:</span>
            <button
              className={
                "pill-btn" + (graphMode === "bankroll" ? " active" : "")
              }
              onClick={() => setGraphMode("bankroll")}
            >
              Bankroll
            </button>
            <button
              className={
                "pill-btn" + (graphMode === "profit" ? " active" : "")
              }
              onClick={() => setGraphMode("profit")}
            >
              Profit / Session
            </button>
          </div>
          <div className="pill-row">
            <span className="pill-label">Range:</span>
            <button
              className={
                "pill-btn" + (rangeMode === "all" ? " active" : "")
              }
              onClick={() => setRangeMode("all")}
            >
              All
            </button>
            <button
              className={
                "pill-btn" + (rangeMode === "20" ? " active" : "")
              }
              onClick={() => setRangeMode("20")}
            >
              Last 20
            </button>
            <button
              className={
                "pill-btn" + (rangeMode === "10" ? " active" : "")
              }
              onClick={() => setRangeMode("10")}
            >
              Last 10
            </button>
          </div>
        </div>

        {displaySeries.length > 0 ? (
          <div className="chart-wrapper">
            <Line data={chartData} options={chartOptions} />
          </div>
        ) : (
          <p>No sessions yet.</p>
        )}
      </section>
    </>
  );
}

/* ---------- Sessions Page (with edit support) ---------- */

function SessionsPage({ sessions, onCreateSession, onDeleteSession, onUpdateSession }) {
  const emptyForm = {
    game: "",
    stake: "",
    format: "cash",
    location: "",
    buy_in: "",
    cash_out: "",
    hours_played: "",
    bullets: "1",
    tag: "",
    notes: "",
  };

  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ error: "", success: "" });

  // edit-specific state
  const [editingIndex, setEditingIndex] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editStatus, setEditStatus] = useState({ error: "", success: "" });
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [filterLocation, setFilterLocation] = useState("all");
  const [filterGame, setFilterGame] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [sortMode, setSortMode] = useState("date-desc");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setStatus({ error: "", success: "" });

    const result = await onCreateSession(form);

    if (result.ok) {
      setStatus({ error: "", success: "Session created successfully." });
      setForm(emptyForm);
    } else {
      setStatus({
        error: result.error || "Failed to create session.",
        success: "",
      });
    }

    setSubmitting(false);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (editingIndex == null) return;

    setEditSubmitting(true);
    setEditStatus({ error: "", success: "" });

    const result = await onUpdateSession(editingIndex, editForm);

    if (result.ok) {
      setEditStatus({ error: "", success: "Session updated." });
      setEditingIndex(null);
    } else {
      setEditStatus({
        error: result.error || "Failed to update session.",
        success: "",
      });
    }

    setEditSubmitting(false);
  };

  const locationOptions = Array.from(
    new Set(
      sessions
        .map((s) => s.location)
        .filter((x) => x && x.trim().length > 0),
    ),
  );
  const gameOptions = Array.from(
    new Set(
      sessions.map((s) => s.game).filter((x) => x && x.trim().length > 0),
    ),
  );

  let rows = sessions.map((s, idx) => ({ ...s, originalIndex: idx }));

  if (filterLocation !== "all") {
    rows = rows.filter((r) => r.location === filterLocation);
  }
  if (filterGame !== "all") {
    rows = rows.filter((r) => r.game === filterGame);
  }
  if (searchText.trim() !== "") {
    const q = searchText.toLowerCase();
    rows = rows.filter((r) => {
      return (
        (r.game && r.game.toLowerCase().includes(q)) ||
        (r.notes && r.notes.toLowerCase().includes(q)) ||
        (r.location && r.location.toLowerCase().includes(q))
      );
    });
  }

  rows.sort((a, b) => {
    if (sortMode === "profit-desc") {
      return (b.profit ?? 0) - (a.profit ?? 0);
    }
    if (sortMode === "profit-asc") {
      return (a.profit ?? 0) - (b.profit ?? 0);
    }
    return b.originalIndex - a.originalIndex; // newest first
  });

  const startEditing = (row) => {
    setEditingIndex(row.originalIndex);
    setEditForm({
      game: row.game || "",
      stake: row.stake || "",
      format: row.format || "cash",
      location: row.location || "",
      buy_in: row.buy_in != null ? String(row.buy_in) : "",
      cash_out: row.cash_out != null ? String(row.cash_out) : "",
      hours_played:
        row.hours_played != null ? String(row.hours_played) : "",
      bullets: row.bullets != null ? String(row.bullets) : "",
      tag: row.tag || "",
      notes: row.notes || "",
    });
    setEditStatus({ error: "", success: "" });
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditStatus({ error: "", success: "" });
  };

  return (
    <>
      {/* Sessions list */}
      <section className="section-card">
        <div className="section-header-row">
          <h2 className="section-title">Sessions</h2>
          <div className="filters-row">
            <select
              className="select-dark"
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
            >
              <option value="all">All locations</option>
              {locationOptions.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>

            <select
              className="select-dark"
              value={filterGame}
              onChange={(e) => setFilterGame(e.target.value)}
            >
              <option value="all">All games</option>
              {gameOptions.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>

            <input
              className="input-dark small"
              placeholder="Search game / notes / location"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />

            <div className="pill-row">
              <span className="pill-label">Sort:</span>
              <button
                className={
                  "pill-btn" + (sortMode === "date-desc" ? " active" : "")
                }
                onClick={() => setSortMode("date-desc")}
              >
                Newest
              </button>
              <button
                className={
                  "pill-btn" + (sortMode === "profit-desc" ? " active" : "")
                }
                onClick={() => setSortMode("profit-desc")}
              >
                Biggest win
              </button>
              <button
                className={
                  "pill-btn" + (sortMode === "profit-asc" ? " active" : "")
                }
                onClick={() => setSortMode("profit-asc")}
              >
                Biggest loss
              </button>
            </div>
          </div>
        </div>

        {rows.length === 0 ? (
          <p>No sessions match your filters.</p>
        ) : (
          <div className="table-wrapper">
            <table className="table-dark">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Game</th>
                  <th style={{ textAlign: "right" }}>Buy-in</th>
                  <th style={{ textAlign: "right" }}>Cash-out</th>
                  <th style={{ textAlign: "right" }}>Profit</th>
                  <th style={{ textAlign: "right" }}>Hours</th>
                  <th style={{ textAlign: "right" }}>Hourly</th>
                  <th>Style</th>
                  <th>Location</th>
                  <th style={{ textAlign: "center" }}>Edit</th>
                  <th style={{ textAlign: "center" }}>Remove</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.originalIndex}>
                    <td>{s.date ? s.date.slice(0, 10) : "n/a"}</td>
                    <td>{s.game}</td>
                    <td style={{ textAlign: "right" }}>
                      {s.buy_in != null ? s.buy_in.toFixed(2) : "n/a"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {s.cash_out != null ? s.cash_out.toFixed(2) : "n/a"}
                    </td>
                    <td
                      style={{ textAlign: "right" }}
                      className={
                        s.profit >= 0 ? "badge-profit-pos" : "badge-profit-neg"
                      }
                    >
                      {s.profit != null ? s.profit.toFixed(2) : "n/a"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {s.hours_played ? s.hours_played.toFixed(2) : "n/a"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {s.hourly_rate != null
                        ? s.hourly_rate.toFixed(2)
                        : "n/a"}
                    </td>
                    <td>{s.tag || "—"}</td>
                    <td>{s.location}</td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => startEditing(s)}
                      >
                        ✎
                      </button>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => {
                          if (
                            window.confirm("Delete this session permanently?")
                          ) {
                            onDeleteSession(s.originalIndex);
                          }
                        }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Create session */}
      <section className="section-card">
        <h2 className="section-title">Create New Session</h2>
        <p className="section-subtitle">
          Log a full session with stake, format, bullets, style and description.
        </p>

        <form onSubmit={handleSubmit} className="form-grid">
          {/* Row 1: game / stake / format */}
          <div>
            <label className="field-label">
              Game
              <input
                className="input-dark"
                name="game"
                value={form.game}
                onChange={handleChange}
                placeholder="0.10/0.20 NLH"
                required
              />
            </label>
          </div>

          <div>
            <label className="field-label">
              Stake
              <input
                className="input-dark"
                name="stake"
                value={form.stake}
                onChange={handleChange}
                placeholder="0.10/0.20"
              />
            </label>
          </div>

          <div>
            <label className="field-label">
              Format
              <select
                className="select-dark"
                name="format"
                value={form.format}
                onChange={handleChange}
              >
                <option value="cash">Cash</option>
                <option value="tournament">Tournament</option>
                <option value="sng">SNG</option>
              </select>
            </label>
          </div>

          {/* Row 2: location / bullets / hours */}
          <div>
            <label className="field-label">
              Location
              <input
                className="input-dark"
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="Online / IRL"
              />
            </label>
          </div>

          <div>
            <label className="field-label">
              Bullets
              <input
                className="input-dark"
                name="bullets"
                value={form.bullets}
                onChange={handleChange}
                placeholder="1"
              />
            </label>
          </div>

          <div>
            <label className="field-label">
              Hours played
              <input
                className="input-dark"
                name="hours_played"
                value={form.hours_played}
                onChange={handleChange}
                placeholder="2.5"
              />
            </label>
          </div>

          {/* Row 3: money + style tag */}
          <div>
            <label className="field-label">
              Buy-in
              <input
                className="input-dark"
                name="buy_in"
                value={form.buy_in}
                onChange={handleChange}
                placeholder="20"
                required
              />
            </label>
          </div>

          <div>
            <label className="field-label">
              Cash-out
              <input
                className="input-dark"
                name="cash_out"
                value={form.cash_out}
                onChange={handleChange}
                placeholder="45"
                required
              />
            </label>
          </div>

          <div>
            <label className="field-label">
              Style (TAG / LAG / NIT / Manic)
              <select
                className="select-dark"
                name="tag"
                value={form.tag}
                onChange={handleChange}
              >
                <option value="">Unclassified</option>
                <option value="TAG">TAG (tight-aggressive)</option>
                <option value="LAG">LAG (loose-aggressive)</option>
                <option value="NIT">NIT (very tight)</option>
                <option value="Manic">Manic (hyper-aggro)</option>
              </select>
            </label>
          </div>

          {/* Row 4: description */}
          <div className="field-full">
            <label className="field-label">
              Session description
              <textarea
                className="textarea-dark"
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Key hands, big pots, mental state, what went well or badly…"
                rows={2}
              />
            </label>
          </div>

          <div className="form-actions field-full">
            <button className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save Session"}
            </button>
          </div>
        </form>

        {status.error && <div className="status-error">{status.error}</div>}
        {status.success && (
          <div className="status-success">{status.success}</div>
        )}
      </section>

      {/* Edit session */}
      {editingIndex !== null && (
        <section className="section-card">
          <div className="section-header-row">
            <h2 className="section-title">Edit Session</h2>
            <button className="pill-btn" type="button" onClick={cancelEditing}>
              Cancel
            </button>
          </div>
          <form onSubmit={handleEditSubmit} className="form-grid">
            <div>
              <label className="field-label">
                Game
                <input
                  className="input-dark"
                  name="game"
                  value={editForm.game}
                  onChange={handleEditChange}
                  required
                />
              </label>
            </div>

            <div>
              <label className="field-label">
                Stake
                <input
                  className="input-dark"
                  name="stake"
                  value={editForm.stake}
                  onChange={handleEditChange}
                />
              </label>
            </div>

            <div>
              <label className="field-label">
                Format
                <select
                  className="select-dark"
                  name="format"
                  value={editForm.format}
                  onChange={handleEditChange}
                >
                  <option value="cash">Cash</option>
                  <option value="tournament">Tournament</option>
                  <option value="sng">SNG</option>
                </select>
              </label>
            </div>

            <div>
              <label className="field-label">
                Location
                <input
                  className="input-dark"
                  name="location"
                  value={editForm.location}
                  onChange={handleEditChange}
                />
              </label>
            </div>

            <div>
              <label className="field-label">
                Bullets
                <input
                  className="input-dark"
                  name="bullets"
                  value={editForm.bullets}
                  onChange={handleEditChange}
                />
              </label>
            </div>

            <div>
              <label className="field-label">
                Hours played
                <input
                  className="input-dark"
                  name="hours_played"
                  value={editForm.hours_played}
                  onChange={handleEditChange}
                />
              </label>
            </div>

            <div>
              <label className="field-label">
                Buy-in
                <input
                  className="input-dark"
                  name="buy_in"
                  value={editForm.buy_in}
                  onChange={handleEditChange}
                  required
                />
              </label>
            </div>

            <div>
              <label className="field-label">
                Cash-out
                <input
                  className="input-dark"
                  name="cash_out"
                  value={editForm.cash_out}
                  onChange={handleEditChange}
                  required
                />
              </label>
            </div>

            <div>
              <label className="field-label">
                Style (TAG / LAG / NIT / Manic)
                <select
                  className="select-dark"
                  name="tag"
                  value={editForm.tag}
                  onChange={handleEditChange}
                >
                  <option value="">Unclassified</option>
                  <option value="TAG">TAG (tight-aggressive)</option>
                  <option value="LAG">LAG (loose-aggressive)</option>
                  <option value="NIT">NIT (very tight)</option>
                  <option value="Manic">Manic (hyper-aggro)</option>
                </select>
              </label>
            </div>

            <div className="field-full">
              <label className="field-label">
                Session description
                <textarea
                  className="textarea-dark"
                  name="notes"
                  value={editForm.notes}
                  onChange={handleEditChange}
                  rows={2}
                />
              </label>
            </div>

            <div className="form-actions field-full">
              <button
                className="btn-primary"
                type="submit"
                disabled={editSubmitting}
              >
                {editSubmitting ? "Updating…" : "Update Session"}
              </button>
            </div>
          </form>

          {editStatus.error && (
            <div className="status-error">{editStatus.error}</div>
          )}
          {editStatus.success && (
            <div className="status-success">{editStatus.success}</div>
          )}
        </section>
      )}
    </>
  );
}

/* ---------- Stats Page ---------- */

function StatsPage({
  summary,
  sessions,
  advancedStats,
  tagStats,
  lengthStats,
}) {
  const totalSessions =
    advancedStats?.total_sessions ?? sessions.length ?? 0;
  const totalProfit =
    advancedStats?.total_profit ??
    sessions.reduce((sum, s) => sum + (s.profit ?? 0), 0);
  const totalHours =
    advancedStats?.total_hours ??
    sessions.reduce((sum, s) => sum + (s.hours_played ?? 0), 0);
  const overallHourly =
    advancedStats?.hourly ??
    (totalHours > 0 ? totalProfit / totalHours : null);

  const byLocation = advancedStats?.by_location || {};
  const byGame = advancedStats?.by_game || {};
  const variance = advancedStats?.variance ?? null;
  const stdev = advancedStats?.stdev ?? null;
  const totalBullets = advancedStats?.total_bullets ?? null;

  const wins = sessions.filter((s) => (s.profit ?? 0) > 0).length;
  const winrate =
    totalSessions > 0 ? (wins / totalSessions) * 100 : null;

  const avgSessionProfit =
    totalSessions > 0 ? totalProfit / totalSessions : 0;

  let bestWinStreak = 0;
  let bestLoseStreak = 0;
  let curWin = 0;
  let curLose = 0;

  sessions.forEach((s) => {
    const p = s.profit ?? 0;
    if (p > 0) {
      curWin += 1;
      bestWinStreak = Math.max(bestWinStreak, curWin);
      curLose = 0;
    } else if (p < 0) {
      curLose += 1;
      bestLoseStreak = Math.max(bestLoseStreak, curLose);
      curWin = 0;
    } else {
      curWin = 0;
      curLose = 0;
    }
  });

  const biggestWin =
    sessions.length > 0
      ? sessions.reduce(
          (best, s) =>
            best == null || (s.profit ?? 0) > (best.profit ?? -Infinity)
              ? s
              : best,
          null,
        )
      : null;

  const biggestLoss =
    sessions.length > 0
      ? sessions.reduce(
          (worst, s) =>
            worst == null || (s.profit ?? 0) < (worst.profit ?? Infinity)
              ? s
              : worst,
          null,
        )
      : null;

  return (
    <>
      {/* High-level stats row */}
      <section className="section-card">
        <h2 className="section-title">High-level Stats</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total sessions</div>
            <div className="stat-value">{totalSessions}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total profit</div>
            <div className="stat-value">
              {totalProfit >= 0 ? "+" : "-"}$
              {Math.abs(totalProfit).toFixed(2)}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg profit / session</div>
            <div className="stat-value">
              ${avgSessionProfit.toFixed(2)}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Recorded hours</div>
            <div className="stat-value">{totalHours.toFixed(2)}h</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Overall hourly</div>
            <div className="stat-value">
              {overallHourly != null
                ? `$${overallHourly.toFixed(2)}/h`
                : "n/a"}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Winrate (sessions)</div>
            <div className="stat-value">
              {winrate != null ? `${winrate.toFixed(1)}%` : "n/a"}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Best win streak</div>
            <div className="stat-value">
              {bestWinStreak} session
              {bestWinStreak === 1 ? "" : "s"}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Worst losing streak</div>
            <div className="stat-value">
              {bestLoseStreak} session
              {bestLoseStreak === 1 ? "" : "s"}
            </div>
          </div>
        </div>
      </section>

      {/* By Game */}
      <section className="section-card">
        <h2 className="section-title">By Game</h2>
        {Object.keys(byGame).length === 0 ? (
          <p>No data yet.</p>
        ) : (
          <div className="stats-grid">
            {Object.entries(byGame).map(([game, info]) => {
              const sessionsCount = info.sessions ?? info.sessions_count;
              const profit = info.total_profit ?? 0;
              const hours = info.total_hours ?? 0;
              const hourly =
                info.hourly ??
                (hours > 0 ? profit / hours : null);

              return (
                <div className="stat-card" key={game}>
                  <div className="stat-label">{game}</div>
                  <div className="stat-sub">
                    Sessions: {sessionsCount}
                    <br />
                    Profit: {profit >= 0 ? "+" : "-"}$
                    {Math.abs(profit).toFixed(2)}
                    <br />
                    Hours: {hours.toFixed(2)}h
                    <br />
                    Hourly:{" "}
                    {hourly != null
                      ? `$${hourly.toFixed(2)}/h`
                      : "n/a"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* By Location */}
      <section className="section-card">
        <h2 className="section-title">By Location</h2>
        {Object.keys(byLocation).length === 0 ? (
          <p>No data yet.</p>
        ) : (
          <div className="stats-grid">
            {Object.entries(byLocation).map(([loc, info]) => {
              const sessionsCount = info.sessions ?? info.sessions_count;
              const profit = info.total_profit ?? 0;
              const hours = info.total_hours ?? 0;
              const hourly =
                info.hourly ??
                (hours > 0 ? profit / hours : null);

              return (
                <div className="stat-card" key={loc}>
                  <div className="stat-label">{loc}</div>
                  <div className="stat-sub">
                    Sessions: {sessionsCount}
                    <br />
                    Profit: {profit >= 0 ? "+" : "-"}$
                    {Math.abs(profit).toFixed(2)}
                    <br />
                    Hours: {hours.toFixed(2)}h
                    <br />
                    Hourly:{" "}
                    {hourly != null
                      ? `$${hourly.toFixed(2)}/h`
                      : "n/a"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Variance / bullets / risk */}
      <section className="section-card">
        <h2 className="section-title">Variance & Risk</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Std dev / session</div>
            <div className="stat-value">
              {stdev != null ? `$${stdev.toFixed(2)}` : "n/a"}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Variance</div>
            <div className="stat-value">
              {variance != null ? variance.toFixed(2) : "n/a"}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total bullets fired</div>
            <div className="stat-value">
              {totalBullets != null ? totalBullets : "n/a"}
            </div>
          </div>
          {stdev != null && (
            <div className="stat-card">
              <div className="stat-label">Rough 95% range</div>
              <div className="stat-sub">
                If profits are roughly normal, about 95% of sessions
                should land in:
                <br />
                <strong>
                  [avg ± 2·σ] ≈ $
                  {(avgSessionProfit - 2 * stdev).toFixed(2)} to $
                  {(avgSessionProfit + 2 * stdev).toFixed(2)}
                </strong>
                <br />
                It’s a crude model, but gives you a feel for
                volatility.
              </div>
            </div>
          )}
        </div>
      </section>

      {/* By Style Tag */}
      <section className="section-card">
        <h2 className="section-title">By Style (TAG / LAG / NIT / Manic)</h2>
        {tagStats && Object.keys(tagStats).length > 0 ? (() => {
          const STYLE_TAGS = ["TAG", "LAG", "NIT", "Manic"];
          const LABELS = {
            TAG: "TAG (tight-aggressive)",
            LAG: "LAG (loose-aggressive)",
            NIT: "NIT (very tight)",
            Manic: "Manic (hyper-aggro)",
          };

          const entries = Object.entries(tagStats).filter(([tag]) =>
            STYLE_TAGS.includes(tag)
          );

          if (!entries.length) {
            return (
              <p>
                No style tags yet. When you log sessions, pick TAG / LAG / NIT /
                Manic in the form so you can see which style prints and which
                one spews.
              </p>
            );
          }

          return (
            <div className="stats-grid">
              {entries.map(([tag, info]) => {
                const hourly = info.mean_hourly;
                const label = LABELS[tag] || tag;
                return (
                  <div className="stat-card" key={tag}>
                    <div className="stat-label">{label}</div>
                    <div className="stat-sub">
                      Sessions: {info.count}
                      <br />
                      Hourly:{" "}
                      {hourly != null
                        ? `$${hourly.toFixed(2)}/h`
                        : "n/a"}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })() : (
          <p>
            No style tags yet. Use the style dropdown (TAG / LAG / NIT / Manic)
            when you log sessions to see how each style performs.
          </p>
        )}
      </section>

      {/* Performance by session length */}
      <section className="section-card">
        <h2 className="section-title">Performance by Session Length</h2>
        {lengthStats && Object.keys(lengthStats).length > 0 ? (
          <div className="stats-grid">
            {Object.entries(lengthStats).map(([bucket, info]) => {
              const mean = info.mean_profit;
              const total = info.total_profit;
              return (
                <div className="stat-card" key={bucket}>
                  <div className="stat-label">{bucket}</div>
                  <div className="stat-sub">
                    Sessions: {info.count}
                    <br />
                    Avg profit:{" "}
                    {mean != null ? formatMoney(mean) : "n/a"}
                    <br />
                    Total profit:{" "}
                    {total != null ? formatMoney(total) : "n/a"}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p>
            Not enough data with recorded hours. Once you log more sessions with
            hours, you&apos;ll see whether you bleed money when you sit too
            long.
          </p>
        )}
      </section>

      {/* Raw summary from bankroll.summary() */}
      <section className="section-card">
        <h2 className="section-title">Raw Summary</h2>
        <ul className="summary-list">
          {summary.map((line, idx) => (
            <li key={idx}>{line}</li>
          ))}
        </ul>
      </section>
    </>
  );
}

/* ---------- Advice Page ---------- */

function AdvicePage({ sessions, advancedStats }) {
  const totalSessions = sessions.length;
  const totalProfit = sessions.reduce(
    (sum, s) => sum + (s.profit ?? 0),
    0,
  );
  const totalHours = sessions.reduce(
    (sum, s) => sum + (s.hours_played ?? 0),
    0,
  );
  const hourly = totalHours > 0 ? totalProfit / totalHours : null;
  const wins = sessions.filter((s) => s.profit > 0).length;
  const winrate = totalSessions ? (wins / totalSessions) * 100 : null;

  const bulletsUsed = sessions.reduce(
    (sum, s) => sum + (s.bullets ?? 1),
    0,
  );

  const notes = [];

  if (totalSessions < 10) {
    notes.push(
      "You have fewer than 10 recorded sessions. Treat any conclusions as noisy and focus on consistent tracking.",
    );
  }

  if (hourly != null && hourly < 0) {
    notes.push(
      "Overall you are a losing player in this sample. Consider dropping stakes and tightening game selection while you study.",
    );
  } else if (hourly != null && hourly > 8 && totalHours >= 30) {
    notes.push(
      "Your hourly looks strong over a decent sample. Main leak to watch is discipline: don't force volume when tired or tilted.",
    );
  }

  if (bulletsUsed > totalSessions * 1.5) {
    notes.push(
      "You are reloading fairly often. Think about adding strict stop-loss rules and avoiding chasing losses when stuck.",
    );
  }

  return (
    <>
      <section className="section-card">
        <h2 className="section-title">Snapshot</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Sample size</div>
            <div className="stat-value">{totalSessions} sessions</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total profit</div>
            <div className="stat-value">{formatMoney(totalProfit)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Overall hourly</div>
            <div className="stat-value">
              {hourly != null ? `$${hourly.toFixed(2)}/h` : "n/a"}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Winrate</div>
            <div className="stat-value">
              {winrate != null ? `${winrate.toFixed(1)}%` : "n/a"}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Bullets fired</div>
            <div className="stat-value">{bulletsUsed}</div>
          </div>
        </div>
      </section>

      <section className="section-card">
        <h2 className="section-title">Bankroll Recommendations</h2>
        <p className="section-subtitle">
          These are simple rules-based suggestions based on your current
          results. Later we can plug in a proper ML model here.
        </p>

        {notes.length === 0 ? (
          <p>
            No obvious red flags from the sample. Biggest edge now is
            volume + consistency — keep logging every session.
          </p>
        ) : (
          <ul className="summary-list">
            {notes.map((line, idx) => (
              <li key={idx}>{line}</li>
            ))}
          </ul>
        )}
      </section>

      {advancedStats && (
        <section className="section-card">
          <h2 className="section-title">Future AI Hooks</h2>
          <p className="section-subtitle">
            This is where a leak-finding AI can plug in later using
            the same data your backend already exposes.
          </p>
          <p>
            For now, keep focusing on clean data: accurate stakes,
            bullets, hours, and style tags (TAG / LAG / NIT / Manic).
            That&apos;s the fuel the future AI will need.
          </p>
        </section>
      )}
    </>
  );
}

export default App;