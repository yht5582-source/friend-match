// 寄信：只用於登入驗證碼。配對信件由使用者自己的信箱寄出，系統不代寄。
//
// 走 Resend 的 HTTP API 而不是 SMTP——Serverless 環境的對外 SMTP 埠通常被擋。
// 環境變數：RESEND_API_KEY（必要）、MAIL_FROM（選用）。
const ENDPOINT = "https://api.resend.com/emails";

export function mailConfig() {
  const key = process.env.RESEND_API_KEY || "";
  return {
    key,
    from: process.env.MAIL_FROM || "有緣配對站 <onboarding@resend.dev>",
    configured: Boolean(key),
  };
}

function toHtml(text) {
  const esc = String(text)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const body = esc.split("\n\n").filter((p) => p.trim())
    .map((p) => `<p style="margin:0 0 16px;line-height:1.9">${p.replaceAll("\n", "<br>")}</p>`)
    .join("");
  return `<div style="font-family:-apple-system,'PingFang TC','Noto Sans TC',sans-serif;`
    + `font-size:16px;color:#2b2b32;max-width:620px;margin:0 auto;padding:28px 24px">`
    + `<div style="border-left:3px solid #c98b6b;padding-left:18px">${body}</div>`
    + `<hr style="border:none;border-top:1px solid #e8e2dc;margin:28px 0 12px">`
    + `<p style="font-size:12px;color:#9a9188;line-height:1.7">`
    + `這封信由「有緣配對站」自動發送，用於驗證信箱所有權。`
    + `若不是你本人操作，請忽略本信。</p></div>`;
}

/** 回傳 { status: "sent" | "preview" | "error", note }。 */
export async function send(to, subject, text) {
  const cfg = mailConfig();
  if (!cfg.configured) {
    return { status: "preview", note: "尚未設定 RESEND_API_KEY，驗證碼直接顯示在畫面上" };
  }
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: cfg.from, to: [to], subject, text, html: toHtml(text) }),
    });
    if (!res.ok) {
      const detail = await res.text();
      // 不要把回應原文丟給使用者，可能含有帳號設定細節
      console.error("resend failed", res.status, detail);
      return { status: "error", note: `寄送失敗（${res.status}），請稍後再試` };
    }
    return { status: "sent", note: "驗證碼已寄出，10 分鐘內有效" };
  } catch (err) {
    console.error("resend error", err);
    return { status: "error", note: "寄送失敗，請稍後再試" };
  }
}
