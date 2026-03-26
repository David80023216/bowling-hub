/**
 * storage.js — localStorage wrapper for Bowling Hub
 * Handles all data persistence with error handling and defaults.
 */

const KEYS = {
  profile: 'bowling_profile',
  scores: 'bowling_scores',
  honors: 'bowling_honors',
  leagues: 'bowling_leagues',
  standings: 'bowling_standings',
  schedule: 'bowling_schedule',
  challenges: 'bowling_challenges',
  contacts: 'bowling_contacts',
  settings: 'bowling_settings',
};

/**
 * Safely read from localStorage, returning fallback on error.
 */
function read(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Storage read error for key "${key}":`, e);
    return fallback;
  }
}

/**
 * Safely write to localStorage.
 */
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error(`Storage write error for key "${key}":`, e);
    return false;
  }
}

/**
 * Generate a unique ID.
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ── Profile ──────────────────────────────────────────────
export function getProfile() {
  return read(KEYS.profile, null);
}

export function saveProfile(profile) {
  return write(KEYS.profile, { ...profile, updatedAt: new Date().toISOString() });
}

export function isSetupComplete() {
  const p = getProfile();
  return p && p.name && p.name.trim().length > 0;
}

// ── Scores ───────────────────────────────────────────────
export function getScores() {
  return read(KEYS.scores, []);
}

export function saveScore(score) {
  const scores = getScores();
  score.id = score.id || generateId();
  score.createdAt = score.createdAt || new Date().toISOString();
  const games = (score.games || []).filter(g => g !== null && g !== undefined && g !== '');
  score.games = games.map(Number);
  score.series = score.games.reduce((a, b) => a + b, 0);
  score.avg = score.games.length > 0 ? Math.round((score.series / score.games.length) * 100) / 100 : 0;
  scores.unshift(score);
  write(KEYS.scores, scores);
  return score;
}

export function deleteScore(id) {
  const scores = getScores().filter(s => s.id !== id);
  write(KEYS.scores, scores);
}

export function getScoreStats() {
  const scores = getScores();
  const allGames = scores.flatMap(s => s.games || []);
  const totalGames = allGames.length;
  const highGame = totalGames > 0 ? Math.max(...allGames) : 0;
  const allSeries = scores.filter(s => (s.games || []).length >= 3).map(s => s.series);
  const highSeries = allSeries.length > 0 ? Math.max(...allSeries) : 0;
  const currentAvg = totalGames > 0 ? Math.round(allGames.reduce((a, b) => a + b, 0) / totalGames * 100) / 100 : 0;
  return { totalGames, highGame, highSeries, currentAvg };
}

// ── Honors ───────────────────────────────────────────────
export function getHonors() {
  return read(KEYS.honors, []);
}

export function saveHonor(honor) {
  const honors = getHonors();
  honor.id = honor.id || generateId();
  honor.createdAt = honor.createdAt || new Date().toISOString();
  honors.unshift(honor);
  write(KEYS.honors, honors);
  return honor;
}

export function deleteHonor(id) {
  const honors = getHonors().filter(h => h.id !== id);
  write(KEYS.honors, honors);
}

// ── Leagues ──────────────────────────────────────────────
export function getLeagues() {
  return read(KEYS.leagues, []);
}

export function saveLeague(league) {
  const leagues = getLeagues();
  league.id = league.id || generateId();
  const idx = leagues.findIndex(l => l.id === league.id);
  if (idx >= 0) {
    leagues[idx] = league;
  } else {
    leagues.push(league);
  }
  write(KEYS.leagues, leagues);
  return league;
}

export function deleteLeague(id) {
  const leagues = getLeagues().filter(l => l.id !== id);
  write(KEYS.leagues, leagues);
}

// ── Standings ────────────────────────────────────────────
export function getStandings() {
  return read(KEYS.standings, {});
}

export function saveStandings(leagueId, rows) {
  const standings = getStandings();
  standings[leagueId] = rows;
  write(KEYS.standings, standings);
}

// ── Schedule ─────────────────────────────────────────────
export function getSchedule() {
  return read(KEYS.schedule, []);
}

export function saveMatch(match) {
  const schedule = getSchedule();
  match.id = match.id || generateId();
  const idx = schedule.findIndex(m => m.id === match.id);
  if (idx >= 0) {
    schedule[idx] = match;
  } else {
    schedule.push(match);
  }
  // Sort by date
  schedule.sort((a, b) => new Date(a.date) - new Date(b.date));
  write(KEYS.schedule, schedule);
  return match;
}

export function deleteMatch(id) {
  const schedule = getSchedule().filter(m => m.id !== id);
  write(KEYS.schedule, schedule);
}

// ── Challenges ───────────────────────────────────────────
export function getChallenges() {
  return read(KEYS.challenges, []);
}

export function saveChallenge(challenge) {
  const challenges = getChallenges();
  challenge.id = challenge.id || generateId();
  challenge.createdAt = challenge.createdAt || new Date().toISOString();
  const idx = challenges.findIndex(c => c.id === challenge.id);
  if (idx >= 0) {
    challenges[idx] = challenge;
  } else {
    challenges.unshift(challenge);
  }
  write(KEYS.challenges, challenges);
  return challenge;
}

export function deleteChallenge(id) {
  const challenges = getChallenges().filter(c => c.id !== id);
  write(KEYS.challenges, challenges);
}

// ── Contacts ─────────────────────────────────────────────
export function getContacts() {
  return read(KEYS.contacts, []);
}

export function saveContact(contact) {
  const contacts = getContacts();
  contact.id = contact.id || generateId();
  const idx = contacts.findIndex(c => c.id === contact.id);
  if (idx >= 0) {
    contacts[idx] = contact;
  } else {
    contacts.push(contact);
  }
  write(KEYS.contacts, contacts);
  return contact;
}

export function deleteContact(id) {
  const contacts = getContacts().filter(c => c.id !== id);
  write(KEYS.contacts, contacts);
}

// ── Settings ─────────────────────────────────────────────
export function getSettings() {
  return read(KEYS.settings, { theme: 'dark' });
}

export function saveSettings(settings) {
  write(KEYS.settings, settings);
}

// ── Export / Import ──────────────────────────────────────
export function exportAllData() {
  const data = {};
  for (const [label, key] of Object.entries(KEYS)) {
    data[label] = read(key, null);
  }
  return data;
}

export function importAllData(data) {
  for (const [label, key] of Object.entries(KEYS)) {
    if (data[label] !== undefined) {
      write(key, data[label]);
    }
  }
}

export function clearAllData() {
  for (const key of Object.values(KEYS)) {
    localStorage.removeItem(key);
  }
}
