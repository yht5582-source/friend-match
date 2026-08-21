# 有緣配對站

一個交友互動網站：**不只是找對象**——找旅伴、找牌搭子、找球友、找飯友都可以。
使用者填完自己的條件與「理想對象」的加權條件後，系統排序出最速配的人選，
交出對方的信箱，並代擬一封**文情並茂**的信——由你用自己的信箱寄出。

前端純 HTML/CSS/JS，後端只用 Python 標準函式庫，**不需要安裝任何套件**。

## 啟動

```bash
python3 /Users/YHTseng/friend-match/server.py 8765
```

開啟 <http://127.0.0.1:8765> 。第一次使用先驗證信箱（見下節），
登入後按「灌入 12 位示範會員」，再填自己的檔案，就能立刻看到配對效果。

## 登入與信箱驗證

**不設密碼**。輸入信箱 → 收六位數驗證碼 → 輸入正確即完成信箱驗證並登入，
Session 以 HttpOnly Cookie 保存 30 天。

沒設定 SMTP 時（預覽模式），驗證碼會直接顯示在畫面上並印在伺服器 console，
可以直接試玩，不必先接好郵件伺服器。

驗證機制的防護：

- 驗證碼雜湊後才落地，不存明碼；10 分鐘失效、最多試 5 次。
- 同一信箱兩次索取至少間隔 60 秒、每小時最多 5 次——避免拿別人的信箱來轟炸。
  驗證成功不會重置這個頻率上限。
- **只有通過驗證的信箱才會進入配對池**，所以配對到的人，信一定寄得到。
- 所有涉及個資的 API 一律從 Session 取身分，**完全不採信前端傳來的 id 或信箱**。

## 配對規則

| 層級 | 項目 | 行為 |
|---|---|---|
| 硬性條件 | 年齡／身高／體重區間、星座、婚姻狀況、交友狀況 | 不符合就淘汰；每項都可勾「不在意」關閉 |
| 必要條件 | 期望能力／興趣／嗜好，權重 **100%** | 對方沒有 → 直接淘汰 |
| 加權條件 | 同上，權重 20 / 40 / 60 / 80% | 依權重計分：`已符合權重總和 ÷ 全部權重總和` |
| 加分 | 交友目的重疊 | 最多再加 12 分 |

分數是**雙向**的：`綜合分 = 我對他 × 0.6 ＋ 他對我 × 0.4`。
對方若也把你篩掉，卡片上會標示「你未達對方設定的條件」，避免一頭熱。

## 寄信方式：系統不代寄

配對到之後，開啟寫信視窗才會交出對方的真實信箱，接著你可以：

- **複製信箱／主旨／內文**，回自己的信箱貼上寄出
- 或按「**用郵件軟體開啟**」，直接帶著主旨與內文開啟你的預設郵件程式

這樣對方收到的是**你本人的來信**，回信也直接回到你手上，中間沒有系統轉寄。
系統只留一份底稿在「寄件備份」，方便你記得寫過什麼。

取用信箱有節制：每人每天最多 5 位、同一位對象只能取用一次。

## SMTP 設定（只用於登入驗證碼）

寄信不需要 SMTP，但**信箱驗證需要**。沒設定時是預覽模式，
驗證碼會直接顯示在畫面上——方便本機試玩，但這代表**任何人都能宣稱擁有任何信箱**。
要讓驗證真正有效（尤其是多人共用時），請建立 `data/config.json`：

```json
{
  "host": "smtp.gmail.com",
  "port": 465,
  "user": "你的帳號@gmail.com",
  "pass": "十六碼應用程式密碼",
  "from": "你的帳號@gmail.com",
  "fromName": "有緣配對站"
}
```

- **Gmail** 需先開啟兩步驟驗證，再到 Google 帳戶產生「應用程式密碼」，不要用登入密碼。
- 用 587 埠（STARTTLS）就把 `port` 改成 `587`。
- 也可改用環境變數：`SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `SMTP_FROM` `SMTP_FROM_NAME`。

## 隱私與防濫用

- 配對清單一律只顯示遮罩後的 `de*****@example.com`。
  **只有在你按下「寫信給某人」時**，才會交出那一位的完整信箱——這是刻意的取捨：
  要由你親自寄信，就必須讓你看到位址。
- 每人每日最多取用 5 位對象的信箱；同一位只能取用一次，避免騷擾。
- 退出配對後（`optOut`），你不會出現在任何人的結果中，信箱也不會再被交出去。
- 「我的檔案 → 帳號與隱私」可**暫停配對**或**永久刪除檔案**（連同寄件備份）。

## 線上版（Netlify）

本機版是 Python，Netlify 不跑 Python 伺服器，所以另外有一份 JavaScript 的 Serverless 版本，
兩份共用同一個 `public/` 前端：

| | 本機版 | Netlify 版 |
|---|---|---|
| 後端 | `server.py`（Python 標準函式庫） | `netlify/functions/api.mjs` |
| 儲存 | `data/*.json` | Netlify Blobs |
| 寄驗證碼 | SMTP（`smtplib`） | Resend HTTP API |

配對引擎與信件模板由 Python 版產生成 `.mjs`，兩邊行為一致（已用同一組資料交叉驗證）。

### 部署步驟

1. Netlify → **Add new site → Import an existing project → GitHub**，選這個 repo。
2. Build 設定會自動從 `netlify.toml` 讀取，不用改（publish `public`，functions `netlify/functions`）。
3. 部署完成後，到 **Site configuration → Environment variables → Add a variable**，
   加入 `RESEND_API_KEY`（Scopes 記得包含 **Functions**）。
4. 若要用自己的網域寄信，再加一個 `MAIL_FROM`，例如 `有緣配對站 <hello@你的網域>`。
   沒設的話預設用 `onboarding@resend.dev`——注意 Resend 的測試寄件地址**只能寄給你自己**，
   要讓別人也收得到驗證碼，必須在 Resend 驗證一個網域。

**沒有設定 `RESEND_API_KEY` 時，正式站會直接拒絕發驗證碼**（回 503），
而不是像本機那樣把驗證碼顯示在畫面上——否則等於任何人都能宣稱擁有任何信箱、
進來收割其他會員的真實信箱。這是刻意的 fail-closed。

## 檔案

```
server.py     HTTP 伺服器與 API（零依賴）
auth.py       免密碼登入：驗證碼、頻率限制、Session
matcher.py    加權配對引擎
letters.py    系統代寫信件（4 種文風）
mailer.py     SMTP 寄信（smtplib）
catalog.py    星座／狀態／能力／興趣／嗜好選項
seed.py       12 位示範會員
public/       前端 index.html / style.css / app.js
data/         users.json、outbox.json、config.json（自行建立）
```

## API

| 方法 | 路徑 | 說明 |
|---|---|---|
| GET | `/api/meta` | 選項目錄、文風清單、寄信模式 |
| POST | `/api/auth/request` | 寄驗證碼；預覽模式會直接回傳 `devCode` |
| POST | `/api/auth/verify` | 驗證並發 Session Cookie |
| POST | `/api/auth/logout` | 登出 |
| GET | `/api/session` | 目前登入狀態與檔案 |
| POST | `/api/users` | 建立／更新檔案（信箱一律取自 Session） |
| GET | `/api/me` | 讀回自己的完整檔案 |
| GET | `/api/match?all=1` | 配對排序，`all=1` 連被淘汰者也回傳 |
| POST | `/api/compose` | 代擬信件，並交出對方的真實信箱 |
| POST | `/api/contact` | 記錄已聯絡並寫入備份（不寄信） |
| GET | `/api/outbox` | 寄件備份 |
| POST | `/api/optout` | 暫停／重新開啟配對 |
| POST | `/api/account/delete` | 永久刪除檔案與寄件備份 |
| GET | `/unsubscribe?t=` | 信件中的停止接收連結 |
| POST | `/api/seed` | 灌入 12 位示範會員 |

除 `/api/meta`、`/api/auth/*` 與 `/api/seed` 外，其餘都需要有效的 Session。

## 已知範圍

單機示範用途，資料存成 JSON 檔（不是資料庫，沒有並發寫入的效能考量）。
伺服器綁在 `127.0.0.1`，只在本機可用。若要真的對外上線，還需要：

- 換成資料庫，並把 Session 與驗證碼移出檔案系統
- HTTPS，並把 Cookie 加上 `Secure`
- 以 IP 為單位的頻率限制（目前只限制到信箱層級）
- 檢舉、封鎖與人工審核機制
- **必須接上 SMTP**，否則信箱驗證形同虛設（驗證碼直接顯示在畫面上）
