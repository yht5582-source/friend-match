// Netlify Blobs 儲存層。
//
// 刻意用「一筆資料一個 key」而不是把整個陣列存成一個 blob——Serverless 會並行執行，
// 讀出整包再寫回去會互相覆蓋。拆開之後，只有同一位使用者的同時更新才會競爭。
import { getStore } from "@netlify/blobs";

const STORE = "friendmatch";

function db() {
  return getStore({ name: STORE, consistency: "strong" });
}

// 信箱可能含有 blob key 不接受的字元，統一轉成 base64url
export function emailKey(email) {
  return Buffer.from(String(email).toLowerCase(), "utf8")
    .toString("base64url");
}

async function readJSON(key) {
  try {
    return await db().get(key, { type: "json" });
  } catch {
    return null;
  }
}

async function listAll(prefix) {
  const out = [];
  const { blobs } = await db().list({ prefix });
  await Promise.all(blobs.map(async (b) => {
    const v = await readJSON(b.key);
    if (v) out.push(v);
  }));
  return out;
}

// ---- 使用者 ----
export const getUserByEmail = (email) => readJSON(`users/${emailKey(email)}`);
export const putUser = (user) => db().setJSON(`users/${emailKey(user.email)}`, user);
export const deleteUser = (email) => db().delete(`users/${emailKey(email)}`);
export const listUsers = () => listAll("users/");

export async function getUserById(id) {
  const all = await listUsers();
  return all.find((u) => u.id === id) || null;
}

export async function getUserByUnsubToken(token) {
  if (!token) return null;
  const all = await listUsers();
  return all.find((u) => u.unsubToken && u.unsubToken === token) || null;
}

// ---- 寄件備份 ----
export const addOutbox = (rec) => db().setJSON(`outbox/${rec.id}`, rec);
export const listOutbox = () => listAll("outbox/");

export async function outboxFrom(userId) {
  const all = await listOutbox();
  return all.filter((r) => r.fromId === userId)
            .sort((a, b) => String(a.sentAt).localeCompare(String(b.sentAt)));
}

export async function deleteOutboxFrom(userId) {
  const all = await listOutbox();
  await Promise.all(all.filter((r) => r.fromId === userId)
                       .map((r) => db().delete(`outbox/${r.id}`)));
}

// ---- Session ----
export const getSession = (token) => readJSON(`sessions/${token}`);
export const putSession = (token, rec) => db().setJSON(`sessions/${token}`, rec);
export const deleteSession = (token) => db().delete(`sessions/${token}`);

// ---- 驗證碼 ----
export const getCode = (email) => readJSON(`codes/${emailKey(email)}`);
export const putCode = (email, rec) => db().setJSON(`codes/${emailKey(email)}`, rec);
