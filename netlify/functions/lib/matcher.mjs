// 加權配對引擎（由 matcher.py 移植，行為必須完全一致）
//
// 1. 硬性條件（可勾「不在意」關閉）：年齡／身高／體重區間、星座、婚姻狀況、交友狀況。
// 2. 期望的能力／興趣／嗜好可加權 20~100%，其中 100% = 必要條件，缺一即淘汰。
// 3. 分數同時計算「我對他」與「他對我」，取加權平均，避免單向熱臉。

const BASELINE_NO_PREF = 60.0;   // 完全沒填期望條件時的中性分
const PURPOSE_SHARE = 12.0;      // 交友目的最多可貢獻的分數
const MY_SIDE = 0.6;             // 綜合分中「我對他」的比重

function num(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function fmtNum(n) {
  // 對齊 Python 的 %g：整數不帶小數點
  return Number.isInteger(n) ? String(n) : String(n);
}

function inRange(value, rule, label) {
  if (!rule || rule.any) return [true, null];
  const v = num(value);
  if (v === null) return [false, `${label}未填寫`];
  const lo = num(rule.min), hi = num(rule.max);
  if (lo !== null && v < lo) return [false, `${label} ${fmtNum(v)} 低於期望的 ${fmtNum(lo)}`];
  if (hi !== null && v > hi) return [false, `${label} ${fmtNum(v)} 高於期望的 ${fmtNum(hi)}`];
  return [true, null];
}

function inList(value, rule, label) {
  if (!rule || rule.any) return [true, null];
  const allowed = rule.list || [];
  if (!allowed.length) return [true, null];
  if (allowed.includes(value)) return [true, null];
  return [false, `${label}「${value || "未填"}」不在期望範圍`];
}

function tagsOf(profile) {
  const flat = new Set();
  for (const kind of ["abilities", "interests", "hobbies"]) {
    for (const t of profile[kind] || []) flat.add(t);
  }
  return flat;
}

function hardGate(viewer, cand) {
  const prefs = viewer.prefs || {};
  const reasons = [];
  const checks = [
    inRange(cand.age, prefs.age, "年齡"),
    inRange(cand.height, prefs.height, "身高"),
    inRange(cand.weight, prefs.weight, "體重"),
    inList(cand.zodiac, prefs.zodiac, "星座"),
    inList(cand.marital, prefs.marital, "婚姻狀況"),
    inList(cand.relationship, prefs.relationship, "交友狀況"),
  ];
  for (const [ok, why] of checks) if (!ok) reasons.push(why);
  return [reasons.length === 0, reasons];
}

function wantScore(viewer, cand) {
  const wants = (viewer.prefs || {}).wants || [];
  const have = tagsOf(cand);
  let total = 0, got = 0;
  const matched = [], missing = [], missingMust = [];
  for (const w of wants) {
    const tag = (w.tag || "").trim();
    if (!tag) continue;
    let weight = num(w.w);
    if (weight === null) weight = 60;
    weight = Math.max(0, Math.min(100, weight));
    total += weight;
    const entry = { tag, w: Math.trunc(weight), kind: w.kind || "" };
    if (have.has(tag)) {
      got += weight;
      matched.push(entry);
    } else {
      missing.push(entry);
      if (weight >= 100) missingMust.push(entry);
    }
  }
  if (total <= 0) return [BASELINE_NO_PREF, matched, missing, missingMust];
  return [(got / total) * 100, matched, missing, missingMust];
}

function purposeScore(viewer, cand) {
  const prefs = viewer.prefs || {};
  let wanted = (prefs.purposes || []).filter(Boolean);
  if (!wanted.length) wanted = (viewer.purposes || []).filter(Boolean);
  if (!wanted.length) return [0.5, []];
  const theirs = new Set(cand.purposes || []);
  const shared = wanted.filter((p) => theirs.has(p));
  return [shared.length / wanted.length, shared];
}

function round1(n) {
  // 對齊 Python round(x, 1) 的半進位差異可忽略，但要避免浮點尾巴
  return Math.round(n * 10) / 10;
}

export function oneWay(viewer, cand) {
  let [passed, reasons] = hardGate(viewer, cand);
  const [tagPct, matched, missing, missingMust] = wantScore(viewer, cand);
  if (missingMust.length) {
    passed = false;
    reasons = reasons.concat(["缺少必要條件：" + missingMust.map((m) => m.tag).join("、")]);
  }
  const [pRatio, sharedPurposes] = purposeScore(viewer, cand);
  const raw = tagPct * ((100 - PURPOSE_SHARE) / 100) + pRatio * PURPOSE_SHARE;
  return {
    pass: passed, reasons, score: round1(raw), tagScore: round1(tagPct),
    matched, missing, missingMust, sharedPurposes,
  };
}

export function sharedTags(a, b) {
  const out = {};
  for (const kind of ["abilities", "interests", "hobbies"]) {
    const mine = new Set(a[kind] || []);
    out[kind] = (b[kind] || []).filter((t) => mine.has(t)).sort();
  }
  const mineP = new Set(a.purposes || []);
  out.purposes = (b.purposes || []).filter((t) => mineP.has(t)).sort();
  return out;
}

export function rank(viewer, others, limit = 20, includeBlocked = false) {
  const rows = [];
  for (const cand of others) {
    if (cand.id === viewer.id) continue;
    const mine = oneWay(viewer, cand);
    if (!mine.pass && !includeBlocked) continue;
    const theirs = oneWay(cand, viewer);
    const theirScore = theirs.pass ? theirs.score : 0;
    let final = mine.score * MY_SIDE + theirScore * (1 - MY_SIDE);
    if (!mine.pass) final = final * 0.4;
    rows.push({
      id: cand.id,
      nickname: cand.nickname || cand.name,
      age: cand.age, height: cand.height, weight: cand.weight,
      zodiac: cand.zodiac, marital: cand.marital, relationship: cand.relationship,
      city: cand.city, bio: cand.bio,
      purposes: cand.purposes || [],
      abilities: cand.abilities || [],
      interests: cand.interests || [],
      hobbies: cand.hobbies || [],
      score: round1(final),
      myView: mine,
      theirView: { pass: theirs.pass, score: round1(theirScore), reasons: theirs.reasons },
      mutual: Boolean(mine.pass && theirs.pass),
      shared: sharedTags(viewer, cand),
    });
  }
  rows.sort((a, b) => (b.score - a.score) || ((a.mutual === b.mutual) ? 0 : (a.mutual ? -1 : 1)));
  return rows.slice(0, limit);
}
