// 檔案資料的驗證與正規化（由 server.py 的 normalize_profile 移植）
import { randomBytes, randomUUID } from "node:crypto";
import * as catalog from "./catalog.mjs";

export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const DAILY_SEND_LIMIT = 5;

export const nowIso = () => new Date().toISOString().replace(/\.\d+Z$/, "");

export function maskEmail(addr) {
  if (!addr || !addr.includes("@")) return "";
  const [name, domain] = addr.split("@");
  const shown = name.length <= 2 ? name.slice(0, 1) + "*"
                                 : name.slice(0, 2) + "*".repeat(name.length - 2);
  return `${shown}@${domain}`;
}

function cleanList(v, limit = 40) {
  if (!Array.isArray(v)) return [];
  const out = [];
  for (const item of v) {
    const s = String(item).trim();
    if (s && !out.includes(s)) out.push(s.slice(0, 30));
    if (out.length >= limit) break;
  }
  return out;
}

function cleanRange(v) {
  if (!v || typeof v !== "object" || v.any) return { any: true };
  const num = (k) => {
    const n = Number(v[k]);
    return v[k] === null || v[k] === undefined || v[k] === "" || !Number.isFinite(n) ? null : n;
  };
  return { any: false, min: num("min"), max: num("max") };
}

function cleanChoice(v, allowed) {
  if (!v || typeof v !== "object" || v.any) return { any: true };
  const picked = cleanList(v.list).filter((x) => allowed.includes(x));
  return picked.length ? { any: false, list: picked } : { any: true };
}

function cleanWants(v) {
  const out = [], seen = new Set();
  if (!Array.isArray(v)) return out;
  for (const w of v.slice(0, 60)) {
    if (!w || typeof w !== "object") continue;
    const tag = String(w.tag || "").trim().slice(0, 30);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    let weight = Number.parseInt(w.w, 10);
    if (!Number.isFinite(weight)) weight = 60;
    weight = Math.min(100, Math.max(20, weight));
    const kind = ["ability", "interest", "hobby"].includes(w.kind) ? w.kind : "interest";
    out.push({ tag, w: weight, kind });
  }
  return out;
}

/** 回傳 { profile } 或 { error }。email 由呼叫端（Session）決定，不採信前端。 */
export function normalizeProfile(body, existing, email, verified = false) {
  existing = existing || {};
  const name = String(body.name || "").trim().slice(0, 40);
  const nickname = String(body.nickname || "").trim().slice(0, 40) || name;
  const mail = String(email || "").trim().toLowerCase().slice(0, 120);
  if (!name) return { error: "請填寫姓名" };
  if (!EMAIL_RE.test(mail)) return { error: "電子信箱格式不正確" };

  const num = (key, lo, hi) => {
    const n = Number(body[key]);
    if (!Number.isFinite(n) || n < lo || n > hi) return null;
    return n;
  };
  const age = num("age", 18, 99);
  if (age === null) return { error: "年齡需介於 18 至 99" };

  const p = body.prefs || {};
  const inCat = (v, list) => (list.includes(v) ? v : "");

  return {
    profile: {
      id: existing.id || randomUUID().replace(/-/g, "").slice(0, 12),
      name, nickname, email: mail, age,
      height: num("height", 100, 230),
      weight: num("weight", 30, 200),
      zodiac: inCat(body.zodiac, catalog.ZODIAC),
      marital: inCat(body.marital, catalog.MARITAL),
      relationship: inCat(body.relationship, catalog.RELATIONSHIP),
      city: String(body.city || "").trim().slice(0, 20),
      bio: String(body.bio || "").trim().slice(0, 400),
      purposes: cleanList(body.purposes),
      abilities: cleanList(body.abilities),
      interests: cleanList(body.interests),
      hobbies: cleanList(body.hobbies),
      prefs: {
        age: cleanRange(p.age),
        height: cleanRange(p.height),
        weight: cleanRange(p.weight),
        zodiac: cleanChoice(p.zodiac, catalog.ZODIAC),
        marital: cleanChoice(p.marital, catalog.MARITAL),
        relationship: cleanChoice(p.relationship, catalog.RELATIONSHIP),
        purposes: cleanList(p.purposes),
        wants: cleanWants(p.wants),
      },
      // 這些欄位由伺服器掌握，前端改不動
      verified: Boolean(existing.verified || verified),
      isDemo: Boolean(existing.isDemo || body._demo),
      optOut: Boolean(existing.optOut),
      unsubToken: existing.unsubToken || randomBytes(18).toString("base64url"),
      createdAt: existing.createdAt || nowIso(),
      updatedAt: nowIso(),
    },
  };
}

// 示範帳號。既看旗標也看信箱網域，避免線上已存在的資料需要搬移。
export const isDemo = (u) =>
  Boolean(u.isDemo) || String(u.email || "").endsWith("@example.com");

export const contactable = (users) => users.filter((u) => u.verified && !u.optOut);

export function sendsToday(outbox, fromId) {
  const today = nowIso().slice(0, 10);
  return outbox.filter((r) => r.fromId === fromId && String(r.sentAt || "").startsWith(today)).length;
}
