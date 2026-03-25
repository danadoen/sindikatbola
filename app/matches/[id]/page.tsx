"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts"
import {
  ArrowLeft, Activity, TrendingUp, TrendingDown, Clock, Shield,
  BarChart2, Zap, Target, ChevronRight, RefreshCw, Star, AlertTriangle,
  CheckCircle, ArrowUpRight, ArrowDownRight, Minus
} from "lucide-react"

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_MATCHES: Record<string, any> = {
  "1": {
    id: "1",
    homeTeam: "Real Madrid",
    awayTeam: "Barcelona",
    league: "La Liga",
    sport: "Football",
    status: "LIVE",
    minute: 64,
    homeScore: 2,
    awayScore: 1,
    startTime: "2026-03-25T20:00:00Z",
    homeForm: ["W", "W", "D", "W", "L"],
    awayForm: ["W", "D", "W", "W", "W"],
    homeOdds: 2.10,
    drawOdds: 3.40,
    awayOdds: 3.20,
    arbitrage: true,
    arbitragePct: 2.3,
    confidence: 87,
    valueRating: "HIGH",
  },
  "2": {
    id: "2",
    homeTeam: "Lakers",
    awayTeam: "Celtics",
    league: "NBA",
    sport: "Basketball",
    status: "LIVE",
    minute: null,
    homeScore: 87,
    awayScore: 91,
    quarter: "Q3",
    startTime: "2026-03-25T22:30:00Z",
    homeForm: ["W", "L", "W", "W", "D"],
    awayForm: ["W", "W", "L", "W", "W"],
    homeOdds: 1.95,
    drawOdds: null,
    awayOdds: 1.87,
    arbitrage: false,
    arbitragePct: 0,
    confidence: 72,
    valueRating: "MEDIUM",
  },
  "3": {
    id: "3",
    homeTeam: "Djokovic",
    awayTeam: "Alcaraz",
    league: "Roland Garros",
    sport: "Tennis",
    status: "UPCOMING",
    minute: null,
    homeScore: null,
    awayScore: null,
    startTime: "2026-03-26T14:00:00Z",
    homeForm: ["W", "W", "W", "L", "W"],
    awayForm: ["W", "W", "W", "W", "L"],
    homeOdds: 2.40,
    drawOdds: null,
    awayOdds: 1.62,
    arbitrage: true,
    arbitragePct: 1.8,
    confidence: 79,
    valueRating: "HIGH",
  },
}

const BOOKMAKERS = [
  { name: "Bet365",     home: 2.10, draw: 3.40, away: 3.20, margin: 5.2, status: "OPEN" },
  { name: "Betfair",    home: 2.15, draw: 3.45, away: 3.15, margin: 4.8, status: "OPEN" },
  { name: "William Hill",home: 2.08, draw: 3.35, away: 3.25, margin: 5.5, status: "OPEN" },
  { name: "Pinnacle",   home: 2.18, draw: 3.50, away: 3.10, margin: 3.1, status: "OPEN" },
  { name: "1xBet",      home: 2.05, draw: 3.30, away: 3.30, margin: 5.8, status: "SUSPENDED" },
  { name: "Unibet",     home: 2.12, draw: 3.42, away: 3.18, margin: 5.0, status: "OPEN" },
  { name: "BetMGM",     home: 2.00, draw: 3.25, away: 3.40, margin: 6.3, status: "OPEN" },
  { name: "DraftKings", home: 2.14, draw: 3.48, away: 3.12, margin: 4.6, status: "OPEN" },
]

const ODDS_HISTORY = [
  { time: "17:00", bet365: 2.25, betfair: 2.28, pinnacle: 2.30 },
  { time: "17:30", bet365: 2.22, betfair: 2.25, pinnacle: 2.28 },
  { time: "18:00", bet365: 2.20, betfair: 2.22, pinnacle: 2.26 },
  { time: "18:30", bet365: 2.18, betfair: 2.20, pinnacle: 2.24 },
  { time: "19:00", bet365: 2.15, betfair: 2.18, pinnacle: 2.22 },
  { time: "19:30", bet365: 2.12, betfair: 2.15, pinnacle: 2.20 },
  { time: "20:00", bet365: 2.10, betfair: 2.15, pinnacle: 2.18 },
  { time: "20:30", bet365: 2.05, betfair: 2.12, pinnacle: 2.16 },
  { time: "21:00", bet365: 2.10, betfair: 2.14, pinnacle: 2.18 },
]

const H2H_RECORDS = [
  { date: "Nov 2025", home: "Real Madrid", away: "Barcelona", score: "3-1", winner: "home", competition: "La Liga" },
  { date: "Apr 2025", home: "Barcelona",   away: "Real Madrid", score: "2-2", winner: "draw", competition: "Copa del Rey" },
  { date: "Oct 2024", home: "Real Madrid", away: "Barcelona", score: "1-2", winner: "away", competition: "La Liga" },
  { date: "May 2024", home: "Barcelona",   away: "Real Madrid", score: "3-2", winner: "home", competition: "La Liga" },
  { date: "Dec 2023", home: "Real Madrid", away: "Barcelona", score: "2-1", winner: "home", competition: "Supercopa" },
]

const ALGORITHM_SIGNALS = [
  {
    algo: "Arbitrage Scanner",
    signal: "BUY HOME",
    confidence: 92,
    stake: "$450",
    expectedReturn: "+$23.40",
    edge: "+2.3%",
    type: "ARBITRAGE",
  },
  {
    algo: "Value Detector",
    signal: "VALUE HOME",
    confidence: 84,
    stake: "$200",
    expectedReturn: "+$31.20",
    edge: "+4.1%",
    type: "VALUE",
  },
  {
    algo: "Momentum AI",
    signal: "FADE DRAW",
    confidence: 77,
    stake: "$150",
    expectedReturn: "+$18.90",
    edge: "+2.8%",
    type: "MOMENTUM",
  },
  {
    algo: "Pattern Engine",
    signal: "BUY HOME",
    confidence: 71,
    stake: "$100",
    expectedReturn: "+$9.50",
    edge: "+1.7%",
    type: "PATTERN",
  },
]

// ─── Sub-Components ───────────────────────────────────────────────────────────

function FormBadge({ result }: { result: string }) {
  const colors: Record<string, string> = {
    W: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    D: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    L: "bg-red-500/20 text-red-400 border border-red-500/30",
  }
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-bold ${colors[result] || "bg-white/10 text-white/50"}`}>
      {result}
    </span>
  )
}

function StatusPill({ status }: { status: string }) {
  if (status === "LIVE") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-semibold uppercase tracking-wide">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
        Live
      </span>
    )
  }
  if (status === "UPCOMING") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 text-xs font-semibold uppercase tracking-wide">
        <Clock className="w-3 h-3" />
        Upcoming
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white/50 text-xs font-semibold uppercase tracking-wide">
      Finished
    </span>
  )
}

function OddsMovement({ current, prev }: { current: number; prev: number }) {
  const diff = current - prev
  if (Math.abs(diff) < 0.01) return <Minus className="w-3 h-3 text-white/30" />
  if (diff > 0)
    return (
      <span className="flex items-center gap-0.5 text-emerald-400 text-xs">
        <ArrowUpRight className="w-3 h-3" />{diff.toFixed(2)}
      </span>
    )
  return (
    <span className="flex items-center gap-0.5 text-red-400 text-xs">
      <ArrowDownRight className="w-3 h-3" />{Math.abs(diff).toFixed(2)}
    </span>
  )
}

function ArbitrageCalculator({ match }: { match: any }) {
  const [stake, setStake] = useState("1000")
  const totalStake = parseFloat(stake) || 1000
  const arb = match.arbitragePct / 100

  // Optimal stakes distribution across outcomes
  const homeImplied = 1 / Math.max(match.homeOdds, 1)
  const drawImplied = match.drawOdds ? 1 / match.drawOdds : 0
  const awayImplied = 1 / Math.max(match.awayOdds, 1)
  const totalImplied = homeImplied + drawImplied + awayImplied

  const homeStake = (homeImplied / totalImplied) * totalStake
  const drawStake = drawImplied ? (drawImplied / totalImplied) * totalStake : 0
  const awayStake = (awayImplied / totalImplied) * totalStake
  const profit = totalStake * (arb / (1 - arb))

  return (
    <div className="rounded-xl border border-white/10 bg-white/3 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-semibold text-white">Arbitrage Calculator</span>
        {match.arbitrage ? (
          <span className="ml-auto px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            +{match.arbitragePct}% edge
          </span>
        ) : (
          <span className="ml-auto px-2 py-0.5 rounded-full bg-white/10 text-white/40 text-xs">No arb found</span>
        )}
      </div>
      <div>
        <label className="text-xs text-white/50 mb-1.5 block">Total Bankroll Allocation</label>
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-sm">$</span>
          <input
            type="number"
            value={stake}
            onChange={(e) => setStake(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500/50"
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: match.homeTeam, odds: match.homeOdds, stake: homeStake, color: "text-blue-400" },
          ...(match.drawOdds ? [{ label: "Draw", odds: match.drawOdds, stake: drawStake, color: "text-white/60" }] : []),
          { label: match.awayTeam, odds: match.awayOdds, stake: awayStake, color: "text-purple-400" },
        ].map((item) => (
          <div key={item.label} className="rounded-lg bg-white/5 border border-white/8 p-3 text-center">
            <div className={`text-xs font-medium truncate mb-1 ${item.color}`}>{item.label}</div>
            <div className="text-white font-bold text-lg">{item.odds.toFixed(2)}</div>
            <div className="text-white/50 text-xs">${item.stake.toFixed(2)}</div>
          </div>
        ))}
      </div>
      <div className={`rounded-lg p-3 flex items-center justify-between ${match.arbitrage ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-white/5 border border-white/10"}`}>
        <span className="text-sm text-white/70">Guaranteed Profit</span>
        <span className={`text-lg font-bold ${match.arbitrage ? "text-emerald-400" : "text-white/30"}`}>
          {match.arbitrage ? `+$${profit.toFixed(2)}` : "—"}
        </span>
      </div>
    </div>
  )
}

const CUSTOM_TOOLTIP = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0f111a] border border-white/15 rounded-lg p-3 shadow-xl">
        <p className="text-white/50 text-xs mb-2">{label}</p>
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
            <span className="text-white/70">{entry.name}:</span>
            <span className="text-white font-bold">{entry.value.toFixed(2)}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

// ─── Tab Components ───────────────────────────────────────────────────────────

function OverviewTab({ match }: { match: any }) {
  const bestHome = Math.max(...BOOKMAKERS.map((b) => b.home))
  const bestDraw = match.drawOdds ? Math.max(...BOOKMAKERS.filter((b) => b.draw).map((b) => b.draw)) : null
  const bestAway = Math.max(...BOOKMAKERS.map((b) => b.away))

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Best Home Odds", value: bestHome.toFixed(2), sub: "Pinnacle", icon: <TrendingUp className="w-4 h-4 text-emerald-400" />, color: "text-emerald-400" },
          { label: "Best Away Odds", value: bestAway.toFixed(2), sub: "1xBet", icon: <TrendingUp className="w-4 h-4 text-blue-400" />, color: "text-blue-400" },
          { label: "Arb Margin",      value: match.arbitrage ? `+${match.arbitragePct}%` : "None", sub: match.arbitrage ? "Opportunity active" : "No arbitrage", icon: <Target className="w-4 h-4 text-amber-400" />, color: match.arbitrage ? "text-amber-400" : "text-white/40" },
          { label: "AI Confidence",  value: `${match.confidence}%`, sub: match.valueRating + " value", icon: <Zap className="w-4 h-4 text-purple-400" />, color: "text-purple-400" },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-white/10 bg-white/3 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/50 text-xs">{m.label}</span>
              {m.icon}
            </div>
            <div className={`text-2xl font-bold ${m.color}`}>{m.value}</div>
            <div className="text-white/30 text-xs mt-0.5">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Bookmaker Odds Table */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="px-5 py-3 border-b border-white/8 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-white/50" />
          <span className="text-sm font-semibold text-white">Bookmaker Odds Comparison</span>
          <span className="ml-auto text-xs text-white/30">{BOOKMAKERS.length} books tracked</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/2">
                <th className="text-left px-5 py-3 text-white/50 font-medium text-xs uppercase tracking-wide">Bookmaker</th>
                <th className="text-center px-4 py-3 text-white/50 font-medium text-xs uppercase tracking-wide">{match.homeTeam.split(" ").pop()}</th>
                {match.drawOdds && <th className="text-center px-4 py-3 text-white/50 font-medium text-xs uppercase tracking-wide">Draw</th>}
                <th className="text-center px-4 py-3 text-white/50 font-medium text-xs uppercase tracking-wide">{match.awayTeam.split(" ").pop()}</th>
                <th className="text-center px-4 py-3 text-white/50 font-medium text-xs uppercase tracking-wide">Margin</th>
                <th className="text-center px-4 py-3 text-white/50 font-medium text-xs uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {BOOKMAKERS.map((bk, i) => {
                const isBestHome = bk.home === bestHome
                const isBestAway = bk.away === bestAway
                const isBestDraw = bestDraw && bk.draw === bestDraw
                return (
                  <tr key={bk.name} className={`border-b border-white/5 transition-colors hover:bg-white/3 ${bk.status === "SUSPENDED" ? "opacity-40" : ""}`}>
                    <td className="px-5 py-3">
                      <span className="text-white font-medium">{bk.name}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-mono font-bold ${isBestHome ? "text-emerald-400" : "text-white/80"}`}>
                        {bk.home.toFixed(2)}
                      </span>
                      {isBestHome && <span className="ml-1 text-xs text-emerald-400/60">★</span>}
                    </td>
                    {match.drawOdds && (
                      <td className="px-4 py-3 text-center">
                        <span className={`font-mono font-bold ${isBestDraw ? "text-emerald-400" : "text-white/80"}`}>
                          {bk.draw.toFixed(2)}
                        </span>
                        {isBestDraw && <span className="ml-1 text-xs text-emerald-400/60">★</span>}
                      </td>
                    )}
                    <td className="px-4 py-3 text-center">
                      <span className={`font-mono font-bold ${isBestAway ? "text-emerald-400" : "text-white/80"}`}>
                        {bk.away.toFixed(2)}
                      </span>
                      {isBestAway && <span className="ml-1 text-xs text-emerald-400/60">★</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-mono ${bk.margin < 4 ? "text-emerald-400" : bk.margin < 5.5 ? "text-amber-400" : "text-red-400/70"}`}>
                        {bk.margin}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {bk.status === "OPEN" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                          <CheckCircle className="w-3 h-3" /> Open
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-red-400/70">
                          <AlertTriangle className="w-3 h-3" /> Suspended
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Arbitrage Calculator */}
      <ArbitrageCalculator match={match} />
    </div>
  )
}

function MarketMovementTab({ match }: { match: any }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-white/3 p-5">
        <div className="flex items-center gap-2 mb-6">
          <TrendingDown className="w-4 h-4 text-white/50" />
          <span className="text-sm font-semibold text-white">Home Win Odds Movement</span>
          <span className="ml-auto text-xs text-white/30">Last 8 hours</span>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={ODDS_HISTORY}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="time" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v.toFixed(2)}
            />
            <Tooltip content={<CUSTOM_TOOLTIP />} />
            <Legend
              wrapperStyle={{ paddingTop: "16px", fontSize: "12px" }}
              formatter={(v) => <span style={{ color: "rgba(255,255,255,0.6)" }}>{v}</span>}
            />
            <Line type="monotone" dataKey="bet365"  name="Bet365"  stroke="#f59e0b" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="betfair"  name="Betfair"  stroke="#6366f1" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="pinnacle" name="Pinnacle" stroke="#10b981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Odds Movement Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { book: "Bet365",  from: 2.25, to: 2.10, color: "#f59e0b", label: "text-amber-400" },
          { book: "Betfair", from: 2.28, to: 2.14, color: "#6366f1", label: "text-indigo-400" },
          { book: "Pinnacle", from: 2.30, to: 2.18, color: "#10b981", label: "text-emerald-400" },
        ].map((item) => {
          const change = ((item.to - item.from) / item.from) * 100
          return (
            <div key={item.book} className="rounded-xl border border-white/10 bg-white/3 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className={`text-sm font-semibold ${item.label}`}>{item.book}</span>
                <span className={`text-xs font-mono ${change < 0 ? "text-red-400" : "text-emerald-400"}`}>
                  {change.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <div className="text-white/40 text-xs">Open</div>
                  <div className="text-white font-mono font-bold text-lg">{item.from.toFixed(2)}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0" />
                <div className="text-center">
                  <div className="text-white/40 text-xs">Current</div>
                  <div className={`font-mono font-bold text-lg ${item.label}`}>{item.to.toFixed(2)}</div>
                </div>
              </div>
              {/* Mini sparkline bar */}
              <div className="mt-3 h-1 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${((item.from - item.to) / item.from) * 100 * 5 + 40}%`,
                    background: item.color,
                    opacity: 0.7,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Market Signals */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-400 mb-1">Sharp Money Alert</p>
            <p className="text-xs text-white/50">
              Significant odds movement detected on home side across 3 major bookmakers in the last 90 minutes.
              Pinnacle dropped from 2.30 to 2.18 — suggesting professional bettor activity on {match.homeTeam}.
              Consider this a positive signal for home outcome.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function HeadToHeadTab({ match }: { match: any }) {
  const wins   = H2H_RECORDS.filter((r) => (r.home === match.homeTeam && r.winner === "home") || (r.away === match.homeTeam && r.winner === "away")).length
  const draws  = H2H_RECORDS.filter((r) => r.winner === "draw").length
  const losses = H2H_RECORDS.length - wins - draws

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="rounded-xl border border-white/10 bg-white/3 p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Last 5 Head-to-Head Results</h3>
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: `${match.homeTeam} Wins`, value: wins,   color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
            { label: "Draws",                   value: draws,  color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20" },
            { label: `${match.awayTeam} Wins`,  value: losses, color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20" },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border ${s.bg} p-4 text-center`}>
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-white/50 text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Win bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-white/40 mb-1">
            <span>{match.homeTeam}</span>
            <span>{match.awayTeam}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden flex gap-0.5">
            <div className="bg-emerald-500 rounded-full transition-all" style={{ width: `${(wins / H2H_RECORDS.length) * 100}%` }} />
            <div className="bg-white/20 rounded-full transition-all" style={{ width: `${(draws / H2H_RECORDS.length) * 100}%` }} />
            <div className="bg-red-500/60 rounded-full transition-all flex-1" />
          </div>
        </div>
      </div>

      {/* Match history */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="px-5 py-3 border-b border-white/8">
          <span className="text-sm font-semibold text-white">Recent Meetings</span>
        </div>
        <div className="divide-y divide-white/5">
          {H2H_RECORDS.map((record, i) => (
            <div key={i} className="px-5 py-4 flex items-center gap-4 hover:bg-white/2 transition-colors">
              <div className="text-white/30 text-xs w-20 flex-shrink-0">{record.date}</div>
              <div className="flex-1 flex items-center justify-between gap-4 min-w-0">
                <span className={`text-sm font-medium truncate flex-1 text-right ${record.winner === "home" ? "text-white" : "text-white/40"}`}>
                  {record.home}
                </span>
                <div className={`flex-shrink-0 px-3 py-1 rounded-lg font-mono font-bold text-sm min-w-[60px] text-center border ${
                  record.winner === "draw"
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                    : "bg-white/5 border-white/10 text-white"
                }`}>
                  {record.score}
                </div>
                <span className={`text-sm font-medium truncate flex-1 ${record.winner === "away" ? "text-white" : "text-white/40"}`}>
                  {record.away}
                </span>
              </div>
              <div className="text-white/30 text-xs w-24 text-right flex-shrink-0">{record.competition}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Form Comparison */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { team: match.homeTeam, form: ["W","W","D","W","L"], label: "Home" },
          { team: match.awayTeam, form: ["W","D","W","W","W"], label: "Away" },
        ].map((t) => (
          <div key={t.team} className="rounded-xl border border-white/10 bg-white/3 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-white truncate">{t.team}</span>
              <span className="text-xs text-white/30">{t.label}</span>
            </div>
            <div className="flex gap-1.5">
              {t.form.map((r, i) => <FormBadge key={i} result={r} />)}
            </div>
            <div className="mt-2 text-xs text-white/30">
              {t.form.filter((r) => r === "W").length}W {t.form.filter((r) => r === "D").length}D {t.form.filter((r) => r === "L").length}L (Last 5)
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AlgorithmSignalsTab() {
  const typeColors: Record<string, string> = {
    ARBITRAGE: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    VALUE:     "text-purple-400 bg-purple-500/10 border-purple-500/20",
    MOMENTUM:  "text-blue-400 bg-blue-500/10 border-blue-500/20",
    PATTERN:   "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 rounded-lg bg-white/3 border border-white/8">
        <Activity className="w-4 h-4 text-emerald-400" />
        <span className="text-xs text-white/60">{ALGORITHM_SIGNALS.length} active signals detected for this match</span>
        <span className="ml-auto text-xs text-white/30">Updated 30s ago</span>
      </div>

      {ALGORITHM_SIGNALS.map((sig, i) => (
        <div key={i} className="rounded-xl border border-white/10 bg-white/3 p-5 hover:border-white/20 transition-colors">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${typeColors[sig.type]}`}>
                  {sig.type}
                </span>
                <span className="text-white font-semibold">{sig.algo}</span>
              </div>
              <div className="text-2xl font-bold text-white tracking-wide">{sig.signal}</div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-emerald-400 text-xl font-bold">{sig.expectedReturn}</div>
              <div className="text-white/40 text-xs">{sig.stake} stake</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-white/4 p-3 text-center">
              <div className="text-white/40 text-xs mb-1">Confidence</div>
              <div className="text-white font-bold">{sig.confidence}%</div>
              <div className="mt-1.5 h-1 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500"
                  style={{ width: `${sig.confidence}%` }}
                />
              </div>
            </div>
            <div className="rounded-lg bg-white/4 p-3 text-center">
              <div className="text-white/40 text-xs mb-1">Edge</div>
              <div className="text-emerald-400 font-bold">{sig.edge}</div>
            </div>
            <div className="rounded-lg bg-white/4 p-3 text-center">
              <div className="text-white/40 text-xs mb-1">Rec. Stake</div>
              <div className="text-white font-bold">{sig.stake}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = ["Overview", "Market Movement", "Head to Head", "Algorithm Signals"]

export default function MatchDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("Overview")
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [refreshing, setRefreshing] = useState(false)

  const matchId = params?.id as string
  const match = MOCK_MATCHES[matchId] || MOCK_MATCHES["1"]

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date())
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    setTimeout(() => {
      setLastUpdated(new Date())
      setRefreshing(false)
    }, 800)
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] font-sans">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6">

        {/* Back nav */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back
          </button>
          <span className="text-white/20">/</span>
          <span className="text-white/40 text-sm">{match.league}</span>
          <span className="text-white/20">/</span>
          <span className="text-white/70 text-sm truncate">{match.homeTeam} vs {match.awayTeam}</span>
        </div>

        {/* Match Header Card */}
        <div className="rounded-2xl border border-white/10 bg-white/3 overflow-hidden">
          {/* Top bar */}
          <div className="px-6 pt-5 pb-4 border-b border-white/8">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <StatusPill status={match.status} />
                <span className="text-white/40 text-sm">{match.league}</span>
                <span className="px-2 py-0.5 rounded text-xs bg-white/8 text-white/50">{match.sport}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white/30 text-xs">
                  {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                <button
                  onClick={handleRefresh}
                  className="p-1.5 rounded-lg hover:bg-white/8 text-white/40 hover:text-white/70 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Score / Teams */}
          <div className="px-6 py-8">
            <div className="flex items-center justify-between gap-4">
              {/* Home team */}
              <div className="flex-1 text-center md:text-right space-y-2">
                <div className="flex items-center justify-center md:justify-end gap-2 flex-wrap">
                  {match.homeForm?.map((r: string, i: number) => <FormBadge key={i} result={r} />)}
                </div>
                <div className="text-white text-xl md:text-3xl font-bold">{match.homeTeam}</div>
                <div className="text-white/30 text-sm">Home</div>
              </div>

              {/* Score / vs */}
              <div className="flex-shrink-0 text-center px-4 md:px-8">
                {match.status !== "UPCOMING" ? (
                  <div>
                    <div className="text-white text-4xl md:text-5xl font-bold font-mono tracking-tight">
                      {match.homeScore}
                      <span className="text-white/30 mx-2">:</span>
                      {match.awayScore}
                    </div>
                    <div className="mt-2 text-sm text-red-400 font-semibold">
                      {match.minute ? `${match.minute}'` : match.quarter || "FT"}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-white/30 text-2xl font-bold">VS</div>
                    <div className="mt-2 text-xs text-white/40">
                      {new Date(match.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                )}
              </div>

              {/* Away team */}
              <div className="flex-1 text-center md:text-left space-y-2">
                <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                  {match.awayForm?.map((r: string, i: number) => <FormBadge key={i} result={r} />)}
                </div>
                <div className="text-white text-xl md:text-3xl font-bold">{match.awayTeam}</div>
                <div className="text-white/30 text-sm">Away</div>
              </div>
            </div>
          </div>

          {/* Quick odds strip */}
          <div className="border-t border-white/8 px-6 py-4">
            <div className={`grid gap-3 ${match.drawOdds ? "grid-cols-3" : "grid-cols-2"}`}>
              {[
                { label: match.homeTeam, sublabel: "Home Win", odds: match.homeOdds, color: "text-blue-400" },
                ...(match.drawOdds ? [{ label: "Draw", sublabel: "Match Draw", odds: match.drawOdds, color: "text-white/60" }] : []),
                { label: match.awayTeam, sublabel: "Away Win", odds: match.awayOdds, color: "text-purple-400" },
              ].map((o) => (
                <div key={o.label} className="text-center p-3 rounded-xl bg-white/4 border border-white/8">
                  <div className={`text-xs font-medium mb-0.5 truncate ${o.color}`}>{o.label}</div>
                  <div className="text-white text-xs mb-1.5 text-white/40">{o.sublabel}</div>
                  <div className="text-white font-bold text-xl font-mono">{o.odds.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Arbitrage banner */}
          {match.arbitrage && (
            <div className="border-t border-amber-500/20 bg-amber-500/5 px-6 py-3 flex items-center gap-3">
              <Star className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className="text-sm text-amber-400 font-semibold">
                Arbitrage opportunity detected — {match.arbitragePct}% guaranteed edge
              </span>
              <button
                onClick={() => setActiveTab("Overview")}
                className="ml-auto text-xs text-amber-400/70 hover:text-amber-400 flex items-center gap-1 transition-colors"
              >
                Calculate <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/4 border border-white/8 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? "bg-amber-500 text-black shadow-lg"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === "Overview"           && <OverviewTab match={match} />}
          {activeTab === "Market Movement"    && <MarketMovementTab match={match} />}
          {activeTab === "Head to Head"       && <HeadToHeadTab match={match} />}
          {activeTab === "Algorithm Signals"  && <AlgorithmSignalsTab />}
        </div>

      </div>
    </div>
  )
}
