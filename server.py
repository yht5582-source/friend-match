# -*- coding: utf-8 -*-
"""有緣配對站 — 零依賴 HTTP 伺服器（Python 標準函式庫）。

啟動：python3 server.py [port]

身分機制：免密碼。使用者索取六位數驗證碼 → 驗證通過即完成信箱驗證並取得 Session。
所有涉及個人資料的 API 一律從 Session Cookie 取身分，不接受前端傳來的 id。
"""

import json
import os
import re
import secrets
import sys
import threading
import time
import uuid
from datetime import datetime

try:
    from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
except ImportError:  # Python 3.6
    from http.server import HTTPServer as ThreadingHTTPServer
    from http.server import SimpleHTTPRequestHandler

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import auth
import catalog
import letters
import mailer
import matcher
import seed as seed_mod

DATA_DIR = os.path.join(HERE, "data")
PUBLIC_DIR = os.path.join(HERE, "public")
USERS_PATH = os.path.join(DATA_DIR, "users.json")
OUTBOX_PATH = os.path.join(DATA_DIR, "outbox.json")

DAILY_SEND_LIMIT = 5
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

_lock = threading.Lock()
BASE_URL = "http://127.0.0.1:8765"


# --------------------------------------------------------------------------
# 儲存

def _read(path, default):
    if not os.path.exists(path):
        return default
    try:
        with open(path, "r") as f:
            return json.load(f)
    except (ValueError, IOError):
        return default


def _write(path, obj):
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
    os.replace(tmp, path)


def load_users():
    return _read(USERS_PATH, [])


def save_users(users):
    _write(USERS_PATH, users)


def load_outbox():
    return _read(OUTBOX_PATH, [])


def save_outbox(rows):
    _write(OUTBOX_PATH, rows)


# --------------------------------------------------------------------------
# 工具

def mask_email(addr):
    if not addr or "@" not in addr:
        return ""
    name, domain = addr.split("@", 1)
    shown = name[:1] + "*" if len(name) <= 2 else name[:2] + "*" * (len(name) - 2)
    return "%s@%s" % (shown, domain)


def now_iso():
    return datetime.now().replace(microsecond=0).isoformat()


def clean_list(v, limit=40):
    if not isinstance(v, list):
        return []
    out = []
    for item in v:
        s = str(item).strip()
        if s and s not in out:
            out.append(s[:30])
        if len(out) >= limit:
            break
    return out


def clean_range(v):
    if not isinstance(v, dict) or v.get("any"):
        return {"any": True}
    def num(key):
        try:
            return float(v.get(key))
        except (TypeError, ValueError):
            return None
    return {"any": False, "min": num("min"), "max": num("max")}


def clean_choice(v, allowed):
    if not isinstance(v, dict) or v.get("any"):
        return {"any": True}
    picked = [x for x in clean_list(v.get("list")) if x in allowed]
    return {"any": False, "list": picked} if picked else {"any": True}


def clean_wants(v):
    out, seen = [], set()
    if not isinstance(v, list):
        return out
    for w in v[:60]:
        if not isinstance(w, dict):
            continue
        tag = str(w.get("tag", "")).strip()[:30]
        if not tag or tag in seen:
            continue
        seen.add(tag)
        try:
            weight = int(w.get("w", 60))
        except (TypeError, ValueError):
            weight = 60
        weight = min(100, max(20, weight))
        kind = w.get("kind") if w.get("kind") in ("ability", "interest", "hobby") else "interest"
        out.append({"tag": tag, "w": weight, "kind": kind})
    return out


def normalize_profile(body, existing=None, email=None, verified=False):
    """驗證＋正規化。email 由呼叫端（Session）決定，不採信前端。"""
    existing = existing or {}
    name = str(body.get("name", "")).strip()[:40]
    nickname = str(body.get("nickname", "")).strip()[:40] or name
    email = (email or str(body.get("email", "")).strip().lower())[:120]
    if not name:
        return None, "請填寫姓名"
    if not EMAIL_RE.match(email):
        return None, "電子信箱格式不正確"

    def num(key, lo, hi):
        try:
            n = float(body.get(key))
        except (TypeError, ValueError):
            return None
        return None if n < lo or n > hi else n

    age = num("age", 18, 99)
    if age is None:
        return None, "年齡需介於 18 至 99"

    prefs_in = body.get("prefs") or {}
    profile = {
        "id": existing.get("id") or uuid.uuid4().hex[:12],
        "name": name,
        "nickname": nickname,
        "email": email,
        "age": age,
        "height": num("height", 100, 230),
        "weight": num("weight", 30, 200),
        "zodiac": body.get("zodiac") if body.get("zodiac") in catalog.ZODIAC else "",
        "marital": body.get("marital") if body.get("marital") in catalog.MARITAL else "",
        "relationship": (body.get("relationship")
                         if body.get("relationship") in catalog.RELATIONSHIP else ""),
        "city": str(body.get("city", "")).strip()[:20],
        "bio": str(body.get("bio", "")).strip()[:400],
        "purposes": clean_list(body.get("purposes")),
        "abilities": clean_list(body.get("abilities")),
        "interests": clean_list(body.get("interests")),
        "hobbies": clean_list(body.get("hobbies")),
        "prefs": {
            "age": clean_range(prefs_in.get("age")),
            "height": clean_range(prefs_in.get("height")),
            "weight": clean_range(prefs_in.get("weight")),
            "zodiac": clean_choice(prefs_in.get("zodiac"), catalog.ZODIAC),
            "marital": clean_choice(prefs_in.get("marital"), catalog.MARITAL),
            "relationship": clean_choice(prefs_in.get("relationship"), catalog.RELATIONSHIP),
            "purposes": clean_list(prefs_in.get("purposes")),
            "wants": clean_wants(prefs_in.get("wants")),
        },
        # 這些欄位由伺服器掌握，前端改不動
        "verified": bool(existing.get("verified") or verified),
        "optOut": bool(existing.get("optOut")),
        "unsubToken": existing.get("unsubToken") or secrets.token_urlsafe(18),
        "createdAt": existing.get("createdAt") or now_iso(),
        "updatedAt": now_iso(),
    }
    return profile, None


def find_by_id(users, uid):
    return next((u for u in users if u.get("id") == uid), None)


def find_by_email(users, email):
    return next((u for u in users if u.get("email") == email), None)


def contactable(users):
    """可被配對到的人：已驗證信箱、且沒有退出。"""
    return [u for u in users if u.get("verified") and not u.get("optOut")]


def sends_today(outbox, from_id):
    today = datetime.now().strftime("%Y-%m-%d")
    return sum(1 for r in outbox
               if r.get("fromId") == from_id and str(r.get("sentAt", "")).startswith(today))


UNSUB_PAGE = """<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>停止接收來信</title>
<link rel="stylesheet" href="/style.css"></head><body>
<main class="wrap" style="max-width:560px;padding-top:60px">
<div class="card"><h2 class="card-h">%s</h2><p class="lead">%s</p>
<p><a class="btn ghost" href="/">回到有緣配對站</a></p></div></main></body></html>"""


# --------------------------------------------------------------------------
# 路由

class Handler(SimpleHTTPRequestHandler):
    server_version = "FriendMatch/2.0"

    def __init__(self, *args, **kwargs):
        SimpleHTTPRequestHandler.__init__(self, *args, directory=PUBLIC_DIR, **kwargs)

    def log_message(self, fmt, *args):
        sys.stderr.write("%s  %s\n" % (time.strftime("%H:%M:%S"), fmt % args))

    # -- 輸出 --------------------------------------------------------------
    def _json(self, obj, status=200, cookie=None):
        raw = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        if cookie:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()
        self.wfile.write(raw)

    def _html(self, markup, status=200):
        raw = markup.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def _err(self, msg, status=400):
        self._json({"ok": False, "error": msg}, status)

    def _body(self):
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            length = 0
        if length <= 0 or length > 300000:
            return {}
        try:
            return json.loads(self.rfile.read(length).decode("utf-8")) or {}
        except (ValueError, UnicodeDecodeError):
            return {}

    def _query(self):
        if "?" not in self.path:
            return {}
        from urllib.parse import parse_qs
        return {k: v[0] for k, v in parse_qs(self.path.split("?", 1)[1]).items()}

    # -- 身分 --------------------------------------------------------------
    def _email(self):
        return auth.read_session(auth.cookie_from_headers(self.headers))

    def _me(self, users):
        """回傳已登入者的檔案；未登入或尚未建檔則為 None。"""
        email = self._email()
        return find_by_email(users, email) if email else None

    # -- GET ---------------------------------------------------------------
    def do_GET(self):
        route = self.path.split("?", 1)[0]

        if route == "/unsubscribe":
            token = self._query().get("t", "")
            with _lock:
                users = load_users()
                user = next((u for u in users if u.get("unsubToken") and
                             secrets.compare_digest(u["unsubToken"], token)), None)
                if not user:
                    return self._html(UNSUB_PAGE % ("連結無效",
                        "這個退出連結已失效或不正確。若你仍想停止接收，請登入後於「我的檔案」關閉配對。"), 404)
                user["optOut"] = True
                user["updatedAt"] = now_iso()
                save_users(users)
            return self._html(UNSUB_PAGE % ("已停止接收來信",
                "%s，你的檔案已退出配對池，不會再有人配對到你、也不會再收到來信。"
                "隨時可以登入重新開啟。" % (user.get("nickname") or "")))

        if not route.startswith("/api/"):
            return SimpleHTTPRequestHandler.do_GET(self)

        try:
            if route == "/api/meta":
                cfg = mailer.load_config()
                return self._json({
                    "ok": True,
                    "catalog": catalog.meta(),
                    "styles": letters.STYLES,
                    "mail": {"configured": cfg["configured"],
                             "from": cfg["from"] if cfg["configured"] else "",
                             "dailyLimit": DAILY_SEND_LIMIT,
                             "selfSend": True},
                })

            if route == "/api/session":
                email = self._email()
                if not email:
                    return self._json({"ok": True, "loggedIn": False})
                with _lock:
                    users = load_users()
                me = find_by_email(users, email)
                return self._json({"ok": True, "loggedIn": True, "email": email,
                                   "hasProfile": bool(me), "user": me})

            # 以下都需要登入
            with _lock:
                users = load_users()
            me = self._me(users)
            if not me:
                return self._err("請先登入並建立檔案", 401)

            if route == "/api/me":
                return self._json({"ok": True, "user": me})

            if route == "/api/match":
                if me.get("optOut"):
                    return self._err("你目前已退出配對，請先於「我的檔案」重新開啟", 403)
                pool = contactable(users)
                rows = matcher.rank(me, pool, limit=30,
                                    include_blocked=self._query().get("all") == "1")
                with _lock:
                    outbox = load_outbox()
                contacted = set(r.get("toId") for r in outbox if r.get("fromId") == me["id"])
                for r in rows:
                    r["emailMasked"] = mask_email((find_by_id(users, r["id"]) or {}).get("email"))
                    r["contacted"] = r["id"] in contacted
                return self._json({"ok": True, "matches": rows, "pool": len(pool) - 1,
                                   "quotaLeft": max(0, DAILY_SEND_LIMIT
                                                    - sends_today(outbox, me["id"]))})

            if route == "/api/outbox":
                with _lock:
                    rows = [r for r in load_outbox() if r.get("fromId") == me["id"]]
                return self._json({"ok": True, "outbox": list(reversed(rows))[:100]})

            return self._err("查無此 API", 404)
        except Exception as exc:
            return self._err("伺服器錯誤：%s" % exc, 500)

    # -- POST --------------------------------------------------------------
    def do_POST(self):
        route = self.path.split("?", 1)[0]
        body = self._body()
        try:
            # ---- 驗證與登入（不需既有身分） ----
            if route == "/api/auth/request":
                email = str(body.get("email", "")).strip().lower()[:120]
                if not EMAIL_RE.match(email):
                    return self._err("電子信箱格式不正確")
                code, err = auth.issue_code(email)
                if err:
                    return self._err(err, 429)
                cfg = mailer.load_config()
                status, note = mailer.send(
                    email, "", auth.CODE_MAIL_SUBJECT % code,
                    auth.CODE_MAIL_BODY % code, system=True)
                if status == "error":
                    return self._err(note, 502)
                out = {"ok": True, "sent": status == "sent",
                       "note": ("驗證碼已寄到 %s，10 分鐘內有效" % mask_email(email))
                               if status == "sent"
                               else "預覽模式：沒有設定 SMTP，驗證碼直接顯示在下方"}
                if not cfg["configured"]:
                    out["devCode"] = code          # 僅預覽模式回傳，方便試玩
                    print("  [預覽模式] %s 的驗證碼：%s" % (email, code))
                return self._json(out)

            if route == "/api/auth/verify":
                email = str(body.get("email", "")).strip().lower()[:120]
                ok, err = auth.check_code(email, str(body.get("code", "")))
                if not ok:
                    return self._err(err, 401)
                token = auth.create_session(email)
                with _lock:
                    users = load_users()
                    me = find_by_email(users, email)
                    if me and not me.get("verified"):
                        me["verified"] = True      # 舊檔案補上已驗證
                        me["updatedAt"] = now_iso()
                        save_users(users)
                return self._json({"ok": True, "email": email, "hasProfile": bool(me),
                                   "user": me}, cookie=auth.set_cookie_header(token))

            if route == "/api/auth/logout":
                auth.destroy_session(auth.cookie_from_headers(self.headers))
                return self._json({"ok": True}, cookie=auth.clear_cookie_header())

            if route == "/api/seed":
                with _lock:
                    users = load_users()
                    existing = set(u.get("email") for u in users)
                    added = 0
                    for demo in seed_mod.demo_users():
                        if demo["email"] in existing:
                            continue
                        profile, err = normalize_profile(demo, None,
                                                         email=demo["email"], verified=True)
                        if err:
                            continue
                        users.append(profile)
                        added += 1
                    save_users(users)
                return self._json({"ok": True, "added": added, "total": len(users)})

            # ---- 以下都需要登入 ----
            email = self._email()
            if not email:
                return self._err("請先登入", 401)

            if route == "/api/users":
                with _lock:
                    users = load_users()
                    existing = find_by_email(users, email)
                    # 信箱一律以 Session 為準，前端傳什麼都不採信
                    profile, err = normalize_profile(body, existing, email=email, verified=True)
                    if err:
                        return self._err(err)
                    if existing:
                        users = [profile if u["id"] == existing["id"] else u for u in users]
                        action = "updated"
                    else:
                        users.append(profile)
                        action = "created"
                    save_users(users)
                return self._json({"ok": True, "action": action, "user": profile})

            with _lock:
                users = load_users()
            me = find_by_email(users, email)
            if not me:
                return self._err("請先建立你的檔案", 401)

            if route == "/api/optout":
                want_out = bool(body.get("optOut"))
                with _lock:
                    users = load_users()
                    target = find_by_email(users, email)
                    target["optOut"] = want_out
                    target["updatedAt"] = now_iso()
                    save_users(users)
                return self._json({"ok": True, "optOut": want_out})

            if route == "/api/compose":
                target = find_by_id(users, body.get("toId", ""))
                if not target:
                    return self._err("找不到對象", 404)
                if not target.get("verified") or target.get("optOut"):
                    return self._err("對方目前不接受來信")
                shared = matcher.shared_tags(me, target)
                out = letters.compose(me, target, shared,
                                      style=body.get("style", "literary"),
                                      seed=body.get("seed"))
                return self._json({
                    "ok": True, "letter": out, "shared": shared,
                    # 由發動者自己寄信，所以這裡才交出對方的真實信箱
                    "to": {"email": target["email"],
                           "nickname": target.get("nickname"),
                           "unsubHint": bool(target.get("optOut"))},
                    "from": {"email": me["email"], "nickname": me.get("nickname")},
                })

            if route == "/api/contact":
                # 信由發動者用自己的信箱寄出，系統只留一份底稿備份
                target = find_by_id(users, body.get("toId", ""))
                if not target:
                    return self._err("找不到對象", 404)
                if not target.get("verified") or target.get("optOut"):
                    return self._err("對方目前不接受來信")
                subject = str(body.get("subject", "")).strip()[:150]
                text = str(body.get("body", "")).strip()[:8000]
                if not subject or not text:
                    return self._err("主旨與內文都不能空白")
                with _lock:
                    outbox = load_outbox()
                if sends_today(outbox, me["id"]) >= DAILY_SEND_LIMIT:
                    return self._err("今天已取用 %d 位對象的信箱，明天再來吧"
                                     % DAILY_SEND_LIMIT, 429)
                if any(r.get("fromId") == me["id"] and r.get("toId") == target["id"]
                       for r in outbox):
                    return self._err("你已經聯絡過 %s 了，等等對方的回音吧"
                                     % (target.get("nickname") or ""))
                record = {
                    "id": uuid.uuid4().hex[:12],
                    "fromId": me["id"], "fromNickname": me.get("nickname"),
                    "toId": target["id"], "toNickname": target.get("nickname"),
                    "toEmail": target["email"],
                    "subject": subject, "body": text,
                    "writtenBy": body.get("writtenBy", "self"),
                    "score": body.get("score"),
                    "sentAt": now_iso(),
                }
                with _lock:
                    outbox = load_outbox()
                    outbox.append(record)
                    save_outbox(outbox)
                return self._json({"ok": True, "record": record})

            if route == "/api/account/delete":
                with _lock:
                    users = [u for u in load_users() if u.get("email") != email]
                    save_users(users)
                    save_outbox([r for r in load_outbox() if r.get("fromId") != me["id"]])
                auth.destroy_session(auth.cookie_from_headers(self.headers))
                return self._json({"ok": True}, cookie=auth.clear_cookie_header())

            return self._err("查無此 API", 404)
        except Exception as exc:
            return self._err("伺服器錯誤：%s" % exc, 500)


def main():
    global BASE_URL
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    for path, empty in ((USERS_PATH, []), (OUTBOX_PATH, [])):
        if not os.path.exists(path):
            _write(path, empty)
    cfg = mailer.load_config()
    BASE_URL = cfg["baseUrl"] or ("http://127.0.0.1:%d" % port)
    srv = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print("有緣配對站 → http://127.0.0.1:%d" % port)
    print("寄信模式：%s" % ("真實寄送（%s）" % cfg["from"] if cfg["configured"]
                          else "預覽模式（未設定 SMTP：驗證碼直接顯示在畫面上，信件只存備份）"))
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止")


if __name__ == "__main__":
    main()
