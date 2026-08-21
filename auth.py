# -*- coding: utf-8 -*-
"""免密碼驗證：寄六位數驗證碼到信箱，換取 Session。

不儲存任何密碼——使用者證明「這個信箱是我的」即可登入，
同時解決了「信箱驗證」與「登入」兩件事。
"""

import hashlib
import json
import os
import secrets
import threading
import time

HERE = os.path.dirname(os.path.abspath(__file__))
CODES_PATH = os.path.join(HERE, "data", "codes.json")
SESSIONS_PATH = os.path.join(HERE, "data", "sessions.json")

CODE_TTL = 10 * 60           # 驗證碼有效 10 分鐘
CODE_COOLDOWN = 60           # 同一信箱兩次索取至少間隔 60 秒
CODE_HOURLY_MAX = 5          # 每小時最多索取 5 次
CODE_MAX_ATTEMPTS = 5        # 單一驗證碼最多試 5 次
SESSION_TTL = 30 * 24 * 3600  # Session 有效 30 天
COOKIE = "fm_session"

_lock = threading.Lock()


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


def _hash(code, salt):
    """驗證碼不落地存明碼。"""
    return hashlib.sha256((salt + ":" + code).encode("utf-8")).hexdigest()


# --------------------------------------------------------------------------
# 驗證碼

def _clear_code(store, email):
    """作廢驗證碼，但保留索取紀錄，否則驗證成功就能重置頻率上限。"""
    rec = store.get(email) or {}
    store[email] = {"history": rec.get("history") or []}


def issue_code(email):
    """回傳 (驗證碼, 錯誤訊息)。成功時錯誤訊息為 None。"""
    now = time.time()
    with _lock:
        store = _read(CODES_PATH, {})
        rec = store.get(email) or {}
        history = [t for t in (rec.get("history") or []) if now - t < 3600]
        if rec.get("sentAt") and now - rec["sentAt"] < CODE_COOLDOWN:
            wait = int(CODE_COOLDOWN - (now - rec["sentAt"]))
            return None, "請等 %d 秒後再索取驗證碼" % wait
        if len(history) >= CODE_HOURLY_MAX:
            return None, "索取次數過於頻繁，請一小時後再試"
        code = "%06d" % secrets.randbelow(1000000)
        salt = secrets.token_hex(8)
        history.append(now)
        store[email] = {
            "salt": salt,
            "hash": _hash(code, salt),
            "expires": now + CODE_TTL,
            "attempts": 0,
            "sentAt": now,
            "history": history,
        }
        # 順手清掉「驗證碼已過期，且一小時內沒有索取紀錄」的項目
        for key in list(store.keys()):
            item = store[key]
            recent = [t for t in (item.get("history") or []) if now - t < 3600]
            if not recent and item.get("expires", 0) < now:
                del store[key]
        _write(CODES_PATH, store)
    return code, None


def check_code(email, code):
    """回傳 (通過?, 錯誤訊息)。"""
    now = time.time()
    code = (code or "").strip()
    with _lock:
        store = _read(CODES_PATH, {})
        rec = store.get(email)
        if not rec or not rec.get("hash"):
            return False, "尚未索取驗證碼，或驗證碼已失效"
        if now > rec.get("expires", 0):
            _clear_code(store, email)
            _write(CODES_PATH, store)
            return False, "驗證碼已過期，請重新索取"
        if rec.get("attempts", 0) >= CODE_MAX_ATTEMPTS:
            _clear_code(store, email)
            _write(CODES_PATH, store)
            return False, "錯誤次數過多，請重新索取驗證碼"
        if not secrets.compare_digest(_hash(code, rec["salt"]), rec["hash"]):
            rec["attempts"] = rec.get("attempts", 0) + 1
            store[email] = rec
            _write(CODES_PATH, store)
            left = CODE_MAX_ATTEMPTS - rec["attempts"]
            return False, "驗證碼不正確，還可以試 %d 次" % max(0, left)
        _clear_code(store, email)
        _write(CODES_PATH, store)
    return True, None


# --------------------------------------------------------------------------
# Session

def create_session(email):
    now = time.time()
    token = secrets.token_urlsafe(32)
    with _lock:
        store = _read(SESSIONS_PATH, {})
        for key in list(store.keys()):
            if store[key].get("expires", 0) < now:
                del store[key]
        store[token] = {"email": email, "createdAt": now, "expires": now + SESSION_TTL}
        _write(SESSIONS_PATH, store)
    return token


def read_session(token):
    """回傳已驗證的 email，或 None。"""
    if not token:
        return None
    now = time.time()
    store = _read(SESSIONS_PATH, {})
    rec = store.get(token)
    if not rec or rec.get("expires", 0) < now:
        return None
    return rec.get("email")


def destroy_session(token):
    if not token:
        return
    with _lock:
        store = _read(SESSIONS_PATH, {})
        if token in store:
            del store[token]
            _write(SESSIONS_PATH, store)


def cookie_from_headers(headers):
    raw = headers.get("Cookie") or ""
    for part in raw.split(";"):
        name, _, value = part.strip().partition("=")
        if name == COOKIE:
            return value
    return None


def set_cookie_header(token, max_age=SESSION_TTL):
    return ("%s=%s; Path=/; HttpOnly; SameSite=Lax; Max-Age=%d"
            % (COOKIE, token, max_age))


def clear_cookie_header():
    return "%s=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0" % COOKIE


CODE_MAIL_SUBJECT = "你的登入驗證碼：%s"

CODE_MAIL_BODY = """你好：

這是你在「有緣配對站」的登入驗證碼：

    %s

請在 10 分鐘內於網站上輸入。驗證通過後，你的信箱就完成驗證，
之後別人配對到你時，信才寄得到你手上。

如果這不是你本人的操作，請直接忽略這封信，你的信箱不會被建立任何檔案。
"""
