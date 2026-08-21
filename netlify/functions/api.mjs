// 有緣配對站 — Netlify Function（v2）。對應本機版的 server.py。
//
// 所有涉及個人資料的路由一律從 Session Cookie 取身分，不接受前端傳來的 id 或信箱。
import { randomUUID } from "node:crypto";
import * as auth from "./lib/auth.mjs";
import * as catalog from "./lib/catalog.mjs";
import * as letters from "./lib/letters.mjs";
import * as mailer from "./lib/mailer.mjs";
import * as matcher from "./lib/matcher.mjs";
import * as store from "./lib/store.mjs";
import { demoUsers } from "./lib/seed.mjs";
import {
  DAILY_SEND_LIMIT, EMAIL_RE, contactable, maskEmail,
  normalizeProfile, nowIso, sendsToday,
} from "./lib/profile.mjs";

export const config = { path: ["/api/*", "/unsubscribe"] };

const json = (obj, status = 200, cookie = null) => new Response(
  JSON.stringify(obj),
  {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...(cookie ? { "Set-Cookie": cookie } : {}),
    },
  },
);
const fail = (error, status = 400) => json({ ok: false, error }, status);

const html = (markup, status = 200) => new Response(markup, {
  status,
  headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
});

async function readBody(req) {
  try {
    const text = await req.text();
    if (!text || text.length > 300000) return {};
    return JSON.parse(text) || {};
  } catch {
    return {};
  }
}

const UNSUB_PAGE = (title, msg) => `<!doctype html><html lang="zh-Hant"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>停止接收來信</title><link rel="stylesheet" href="/style.css"></head><body>
<main class="wrap" style="max-width:560px;padding-top:60px">
<div class="card"><h2 class="card-h">${title}</h2><p class="lead">${msg}</p>
<p><a class="btn ghost" href="/">回到有緣配對站</a></p></div></main></body></html>`;

export default async function handler(req) {
  const url = new URL(req.url);
  const route = url.pathname;
  const token = auth.cookieFrom(req);

  try {
    // ---------------- 退訂頁（信件中的連結） ----------------
    if (route === "/unsubscribe") {
      const user = await store.getUserByUnsubToken(url.searchParams.get("t") || "");
      if (!user) {
        return html(UNSUB_PAGE("連結無效",
          "這個退出連結已失效或不正確。若你仍想停止接收，請登入後於「我的檔案」關閉配對。"), 404);
      }
      user.optOut = true;
      user.updatedAt = nowIso();
      await store.putUser(user);
      return html(UNSUB_PAGE("已停止接收來信",
        `${user.nickname || ""}，你的檔案已退出配對池，不會再有人配對到你。隨時可以登入重新開啟。`));
    }

    // ---------------- 不需登入 ----------------
    if (route === "/api/meta" && req.method === "GET") {
      return json({
        ok: true,
        catalog: catalog.meta(),
        styles: letters.STYLES,
        mail: {
          configured: mailer.mailConfig().configured,
          from: "", dailyLimit: DAILY_SEND_LIMIT, selfSend: true,
        },
      });
    }

    if (route === "/api/session" && req.method === "GET") {
      const email = await auth.readSession(token);
      if (!email) return json({ ok: true, loggedIn: false });
      const me = await store.getUserByEmail(email);
      return json({ ok: true, loggedIn: true, email, hasProfile: Boolean(me), user: me });
    }

    if (req.method === "POST") {
      const body = await readBody(req);

      if (route === "/api/auth/request") {
        const email = String(body.email || "").trim().toLowerCase().slice(0, 120);
        if (!EMAIL_RE.test(email)) return fail("電子信箱格式不正確");
        // 正式環境若沒接郵件服務，就不能發碼——否則等於任何人都能宣稱擁有任何信箱
        if (!mailer.mailConfig().configured && process.env.CONTEXT === "production") {
          return fail("這個站台還沒設定郵件服務（RESEND_API_KEY），暫時無法登入。"
                      + "請站台管理者到 Netlify 的 Environment variables 補上。", 503);
        }
        const { code, error } = await auth.issueCode(email);
        if (error) return fail(error, 429);
        const { status, note } = await mailer.send(
          email, auth.CODE_MAIL_SUBJECT(code), auth.CODE_MAIL_BODY(code));
        if (status === "error") return fail(note, 502);
        const out = {
          ok: true, sent: status === "sent",
          note: status === "sent" ? `驗證碼已寄到 ${maskEmail(email)}，10 分鐘內有效` : note,
        };
        // 只有在完全沒設定郵件服務時才回傳驗證碼，方便試玩
        if (!mailer.mailConfig().configured) out.devCode = code;
        return json(out);
      }

      if (route === "/api/auth/verify") {
        const email = String(body.email || "").trim().toLowerCase().slice(0, 120);
        const { ok, error } = await auth.checkCode(email, String(body.code || ""));
        if (!ok) return fail(error, 401);
        const fresh = await auth.createSession(email);
        const me = await store.getUserByEmail(email);
        if (me && !me.verified) {
          me.verified = true;
          me.updatedAt = nowIso();
          await store.putUser(me);
        }
        return json({ ok: true, email, hasProfile: Boolean(me), user: me },
                    200, auth.setCookie(fresh));
      }

      if (route === "/api/auth/logout") {
        await auth.destroySession(token);
        return json({ ok: true }, 200, auth.clearCookie());
      }

      if (route === "/api/seed") {
        const existing = new Set((await store.listUsers()).map((u) => u.email));
        let added = 0;
        for (const demo of demoUsers()) {
          if (existing.has(demo.email)) continue;
          const { profile } = normalizeProfile(demo, null, demo.email, true);
          if (!profile) continue;
          await store.putUser(profile);
          added += 1;
        }
        const total = (await store.listUsers()).length;
        return json({ ok: true, added, total });
      }
    }

    // ---------------- 以下都需要登入 ----------------
    const email = await auth.readSession(token);
    if (!email) return fail("請先登入", 401);

    if (route === "/api/users" && req.method === "POST") {
      const body = await readBody(req);
      const existing = await store.getUserByEmail(email);
      // 信箱一律以 Session 為準
      const { profile, error } = normalizeProfile(body, existing, email, true);
      if (error) return fail(error);
      await store.putUser(profile);
      return json({ ok: true, action: existing ? "updated" : "created", user: profile });
    }

    const me = await store.getUserByEmail(email);
    if (!me) return fail("請先登入並建立檔案", 401);

    if (route === "/api/me" && req.method === "GET") return json({ ok: true, user: me });

    if (route === "/api/match" && req.method === "GET") {
      if (me.optOut) return fail("你目前已退出配對，請先於「我的檔案」重新開啟", 403);
      const users = await store.listUsers();
      const pool = contactable(users);
      const rows = matcher.rank(me, pool, 30, url.searchParams.get("all") === "1");
      const outbox = await store.outboxFrom(me.id);
      const contacted = new Set(outbox.map((r) => r.toId));
      const byId = new Map(users.map((u) => [u.id, u]));
      for (const r of rows) {
        r.emailMasked = maskEmail((byId.get(r.id) || {}).email);
        r.contacted = contacted.has(r.id);
      }
      return json({
        ok: true, matches: rows, pool: Math.max(0, pool.length - 1),
        quotaLeft: Math.max(0, DAILY_SEND_LIMIT - sendsToday(outbox, me.id)),
      });
    }

    if (route === "/api/outbox" && req.method === "GET") {
      const rows = await store.outboxFrom(me.id);
      return json({ ok: true, outbox: rows.reverse().slice(0, 100) });
    }

    if (req.method === "POST") {
      const body = await readBody(req);

      if (route === "/api/optout") {
        me.optOut = Boolean(body.optOut);
        me.updatedAt = nowIso();
        await store.putUser(me);
        return json({ ok: true, optOut: me.optOut });
      }

      if (route === "/api/compose" || route === "/api/contact") {
        const target = await store.getUserById(String(body.toId || ""));
        if (!target) return fail("找不到對象", 404);
        if (!target.verified || target.optOut) return fail("對方目前不接受來信");

        if (route === "/api/compose") {
          const shared = matcher.sharedTags(me, target);
          const letter = letters.compose(me, target, shared, body.style || "literary",
                                         body.seed ?? null);
          return json({
            ok: true, letter, shared,
            // 由發動者自己寄信，所以這裡才交出對方的真實信箱
            to: { email: target.email, nickname: target.nickname },
            from: { email: me.email, nickname: me.nickname },
          });
        }

        // /api/contact：信由發動者自己寄出，系統只留底稿
        const subject = String(body.subject || "").trim().slice(0, 150);
        const text = String(body.body || "").trim().slice(0, 8000);
        if (!subject || !text) return fail("主旨與內文都不能空白");
        const outbox = await store.outboxFrom(me.id);
        if (sendsToday(outbox, me.id) >= DAILY_SEND_LIMIT) {
          return fail(`今天已取用 ${DAILY_SEND_LIMIT} 位對象的信箱，明天再來吧`, 429);
        }
        if (outbox.some((r) => r.toId === target.id)) {
          return fail(`你已經聯絡過 ${target.nickname || ""} 了，等等對方的回音吧`);
        }
        const record = {
          id: randomUUID().replace(/-/g, "").slice(0, 12),
          fromId: me.id, fromNickname: me.nickname,
          toId: target.id, toNickname: target.nickname, toEmail: target.email,
          subject, body: text,
          writtenBy: body.writtenBy || "self", score: body.score ?? null,
          sentAt: nowIso(),
        };
        await store.addOutbox(record);
        return json({ ok: true, record });
      }

      if (route === "/api/account/delete") {
        await store.deleteOutboxFrom(me.id);
        await store.deleteUser(email);
        await auth.destroySession(token);
        return json({ ok: true }, 200, auth.clearCookie());
      }
    }

    return fail("查無此 API", 404);
  } catch (err) {
    console.error("api error", route, err);
    return fail("伺服器錯誤，請稍後再試", 500);
  }
}
