// Bench-frequency analysis: which players were benched most often per team.
import fs from "fs";
import path from "path";

const file = process.argv[2] || "./data/liga-mx/current/latest.json";
const teamFilter = process.argv[3]; // optional team name substring

const data = JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));

const stats = {}; // team → playerName → {bench, start, missing}

const tally = (team, players, key) => {
  if (!stats[team]) stats[team] = {};
  for (const p of players || []) {
    const name = p.name;
    if (!name) continue;
    if (!stats[team][name]) stats[team][name] = { start: 0, bench: 0, missing: 0 };
    stats[team][name][key] += 1;
  }
};

for (const id of Object.keys(data)) {
  const m = data[id];
  if (!m.lineups?.available) continue;
  const homeName = m.home?.name || m.home;
  const awayName = m.away?.name || m.away;
  tally(homeName, m.lineups.starting?.home, "start");
  tally(homeName, m.lineups.substitutes?.home, "bench");
  tally(homeName, m.lineups.missing?.home, "missing");
  tally(awayName, m.lineups.starting?.away, "start");
  tally(awayName, m.lineups.substitutes?.away, "bench");
  tally(awayName, m.lineups.missing?.away, "missing");
}

const teams = Object.keys(stats).sort();
const filtered = teamFilter ? teams.filter((t) => t.toLowerCase().includes(teamFilter.toLowerCase())) : teams;

for (const team of filtered) {
  const players = stats[team];
  const list = Object.entries(players)
    .map(([name, s]) => ({ name, ...s, total: s.start + s.bench + s.missing, benchPct: s.bench / (s.start + s.bench || 1) }))
    .filter((p) => p.total >= 3)
    .sort((a, b) => b.bench - a.bench);
  console.log(`\n═══ ${team} ═══`);
  console.log("name".padEnd(25), "start".padStart(6), "bench".padStart(6), "miss".padStart(6), "bench%".padStart(7));
  for (const p of list.slice(0, 20)) {
    console.log(
      p.name.padEnd(25),
      String(p.start).padStart(6),
      String(p.bench).padStart(6),
      String(p.missing).padStart(6),
      (Math.round(p.benchPct * 100) + "%").padStart(7)
    );
  }
}
