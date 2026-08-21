# -*- coding: utf-8 -*-
"""寄信模組：標準函式庫 smtplib，支援 SSL(465) 與 STARTTLS(587)。

設定來源（優先序）：data/config.json > 環境變數。
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_FROM_NAME, SMTP_SSL
未設定時進入「預覽模式」：不真的寄出，只寫入寄件備份，方便先試玩。
"""

import json
import os
import smtplib
import ssl
from email.header import Header
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr, formatdate, make_msgid

HERE = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(HERE, "data", "config.json")


def load_config():
    cfg = {}
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r") as f:
                cfg = json.load(f) or {}
        except (ValueError, IOError):
            cfg = {}
    def pick(key, env, default=""):
        v = cfg.get(key)
        if v in (None, ""):
            v = os.environ.get(env, default)
        return v
    port_raw = pick("port", "SMTP_PORT", "465")
    try:
        port = int(port_raw)
    except (TypeError, ValueError):
        port = 465
    host = pick("host", "SMTP_HOST")
    user = pick("user", "SMTP_USER")
    password = pick("pass", "SMTP_PASS")
    use_ssl = cfg.get("ssl")
    if use_ssl is None:
        use_ssl = os.environ.get("SMTP_SSL", "").lower() not in ("0", "false", "no")
    return {
        "host": host,
        "port": port,
        "user": user,
        "pass": password,
        "from": pick("from", "SMTP_FROM", user),
        "fromName": pick("fromName", "SMTP_FROM_NAME", "有緣配對站"),
        "baseUrl": (pick("baseUrl", "SMTP_BASE_URL", "http://127.0.0.1:8765") or "").rstrip("/"),
        "ssl": bool(use_ssl) if port != 587 else False,
        "configured": bool(host and user and password),
    }


def _plain_to_html(text, unsub_url=None, system=False):
    esc = (text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))
    paras = [p.strip() for p in esc.split("\n\n") if p.strip()]
    body = "".join(
        '<p style="margin:0 0 16px;line-height:1.9">%s</p>' % p.replace("\n", "<br>")
        for p in paras
    )
    if system:
        note = ("這封信由「有緣配對站」自動發送，用於驗證信箱所有權。"
                "若不是你本人操作，請忽略本信。")
    else:
        note = ("這封信由「有緣配對站」代為轉寄，寄件者是系統為你挑出的高契合度對象。"
                "直接回覆本信即可與對方聯絡（對方看不到你的完整信箱，除非你回信）。")
        if unsub_url:
            note += ('<br><a href="%s" style="color:#b4643f">不想再收到這類來信，'
                     '點此停止接收</a>' % unsub_url)
    return (
        '<div style="font-family:-apple-system,\'PingFang TC\',\'Noto Sans TC\',sans-serif;'
        'font-size:16px;color:#2b2b32;max-width:620px;margin:0 auto;padding:28px 24px">'
        '<div style="border-left:3px solid #c98b6b;padding-left:18px">%s</div>'
        '<hr style="border:none;border-top:1px solid #e8e2dc;margin:28px 0 12px">'
        '<p style="font-size:12px;color:#9a9188;line-height:1.7">%s</p></div>'
    ) % (body, note)


def build_message(cfg, to_addr, to_name, subject, body, reply_to=None,
                  unsub_url=None, system=False):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = Header(subject, "utf-8")
    msg["From"] = formataddr((str(Header(cfg["fromName"], "utf-8")), cfg["from"]))
    msg["To"] = formataddr((str(Header(to_name or "", "utf-8")), to_addr))
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid()
    if reply_to:
        msg["Reply-To"] = reply_to
    if unsub_url:
        # 讓 Gmail / Outlook 顯示原生的「取消訂閱」按鈕
        msg["List-Unsubscribe"] = "<%s>" % unsub_url
    plain = body
    if unsub_url:
        plain += "\n\n---\n不想再收到這類來信：%s" % unsub_url
    msg.attach(MIMEText(plain, "plain", "utf-8"))
    msg.attach(MIMEText(_plain_to_html(body, unsub_url, system), "html", "utf-8"))
    return msg


def send(to_addr, to_name, subject, body, reply_to=None,
         unsub_url=None, system=False):
    """回傳 (狀態字串, 說明)。狀態：sent / preview / error"""
    cfg = load_config()
    if not cfg["configured"]:
        return "preview", "尚未設定 SMTP，信件僅存入寄件備份（預覽模式）"
    msg = build_message(cfg, to_addr, to_name, subject, body, reply_to,
                        unsub_url, system)
    try:
        if cfg["ssl"]:
            ctx = ssl.create_default_context()
            server = smtplib.SMTP_SSL(cfg["host"], cfg["port"], timeout=20, context=ctx)
        else:
            server = smtplib.SMTP(cfg["host"], cfg["port"], timeout=20)
            server.ehlo()
            server.starttls(context=ssl.create_default_context())
            server.ehlo()
        try:
            server.login(cfg["user"], cfg["pass"])
            server.sendmail(cfg["from"], [to_addr], msg.as_string())
        finally:
            try:
                server.quit()
            except Exception:
                pass
        return "sent", "已寄出至 %s" % to_addr
    except smtplib.SMTPAuthenticationError:
        return "error", "SMTP 認證失敗，請確認帳號／應用程式密碼"
    except Exception as exc:  # 網路、DNS、TLS 等
        return "error", "寄送失敗：%s" % exc
