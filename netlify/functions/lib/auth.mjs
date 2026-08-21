// 免密碼驗證：寄六位數驗證碼到信箱，換取 Session。（由 auth.py 移植）
import { randomInt, randomBytes, createHash, timingSafeEqual } from "node:crypto";
import * as store from "./store.mjs";

export const CODE_TTL = 10 * 60 * 1000;
export const CODE_COOLDOWN = 60 * 1000;
export const CODE_HOURLY_MAX = 5;
export const CODE_MAX_ATTEMPTS = 5;
export const SESSION_TTL = 30 * 24 * 3600 * 1000;
export const COOKIE = "fm_session";

const hash = (code, salt) =>
  createHash("sha256").update(`${salt}:${code}`, "utf8").digest("hex");

function sameHash(a, b) {
  const x = Buffer.from(String(a), "utf8"), y = Buffer.from(String(b), "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
}

/** 回傳 { code } 或 { error }。 */
export async function issueCode(email) {
  const now = Date.now();
  const rec = (await store.getCode(email)) || {};
  const history = (rec.history || []).filter((t) => now - t < 3600 * 1000);

  if (rec.sentAt && now - rec.sentAt < CODE_COOLDOWN) {
    const wait = Math.ceil((CODE_COOLDOWN - (now - rec.sentAt)) / 1000);
    return { error: `請等 ${wait} 秒後再索取驗證碼` };
  }
  if (history.length >= CODE_HOURLY_MAX) {
    return { error: "索取次數過於頻繁，請一小時後再試" };
  }

  const code = String(randomInt(0, 1000000)).padStart(6, "0");
  const salt = randomBytes(8).toString("hex");
  history.push(now);
  await store.putCode(email, {
    salt, hash: hash(code, salt), expires: now + CODE_TTL,
    attempts: 0, sentAt: now, history,
  });
  return { code };
}

/** 作廢驗證碼但保留索取紀錄，否則驗證成功就能重置頻率上限。 */
async function clearCode(email, rec) {
  await store.putCode(email, { history: rec.history || [] });
}

/** 回傳 { ok: true } 或 { error }。 */
export async function checkCode(email, code) {
  const now = Date.now();
  const rec = await store.getCode(email);
  if (!rec || !rec.hash) return { error: "尚未索取驗證碼，或驗證碼已失效" };
  if (now > (rec.expires || 0)) {
    await clearCode(email, rec);
    return { error: "驗證碼已過期，請重新索取" };
  }
  if ((rec.attempts || 0) >= CODE_MAX_ATTEMPTS) {
    await clearCode(email, rec);
    return { error: "錯誤次數過多，請重新索取驗證碼" };
  }
  if (!sameHash(hash(String(code || "").trim(), rec.salt), rec.hash)) {
    rec.attempts = (rec.attempts || 0) + 1;
    await store.putCode(email, rec);
    const left = Math.max(0, CODE_MAX_ATTEMPTS - rec.attempts);
    return { error: `驗證碼不正確，還可以試 ${left} 次` };
  }
  await clearCode(email, rec);
  return { ok: true };
}

// ---- Session ----
export async function createSession(email) {
  const token = randomBytes(32).toString("base64url");
  await store.putSession(token, { email, createdAt: Date.now(), expires: Date.now() + SESSION_TTL });
  return token;
}

export async function readSession(token) {
  if (!token) return null;
  const rec = await store.getSession(token);
  if (!rec || (rec.expires || 0) < Date.now()) return null;
  return rec.email;
}

export const destroySession = (token) => (token ? store.deleteSession(token) : Promise.resolve());

export function cookieFrom(req) {
  const raw = req.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE) return rest.join("=");
  }
  return null;
}

const SECURE = "; Secure";  // Netlify 一律是 HTTPS
export const setCookie = (token) =>
  `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax${SECURE}; Max-Age=${SESSION_TTL / 1000}`;
export const clearCookie = () =>
  `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax${SECURE}; Max-Age=0`;

export const CODE_MAIL_SUBJECT = (code) => `你的登入驗證碼：${code}`;
export const CODE_MAIL_BODY = (code) => `你好：

這是你在「有緣配對站」的登入驗證碼：

    ${code}

請在 10 分鐘內於網站上輸入。驗證通過後，你的信箱就完成驗證，
別人配對到你時才找得到你。

如果這不是你本人的操作，請直接忽略這封信，你的信箱不會被建立任何檔案。
`;
