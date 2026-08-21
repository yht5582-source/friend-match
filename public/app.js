/* 有緣配對站 — 前端 */
(function () {
"use strict";

var S = {
  meta: null,
  email: "",          // 已驗證的信箱（由 Session 決定）
  hasProfile: false,
  me: null,
  sel: {},          // groupId -> Set(tag)
  extra: {},        // groupId -> 自訂選項
  weights: [],      // [{tag, kind, w}] 保持順序
  matches: [],
  target: null,
  mode: "self"
};

var TAG_GROUPS = ["p-purposes", "p-abilities", "p-interests", "p-hobbies",
                  "w-zodiac", "w-marital", "w-relationship", "w-purposes",
                  "w-abilities", "w-interests", "w-hobbies"];

var KIND_OF = { "w-abilities": "ability", "w-interests": "interest", "w-hobbies": "hobby" };
var KIND_LABEL = { ability: "能力", interest: "興趣", hobby: "嗜好" };

// ---------- 小工具 ----------
function $(id) { return document.getElementById(id); }
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
function api(path, opts) {
  opts = opts || {};
  opts.credentials = "same-origin";
  if (opts.body) {
    opts.headers = { "Content-Type": "application/json" };
    opts.body = JSON.stringify(opts.body);
  }
  return fetch(path, opts).then(function (r) {
    return r.json().then(function (j) {
      if (!r.ok || j.ok === false) throw new Error(j.error || ("HTTP " + r.status));
      return j;
    });
  });
}
function uniq(list) {
  var seen = {}, out = [];
  list.forEach(function (x) { if (x && !seen[x]) { seen[x] = 1; out.push(x); } });
  return out;
}
function flash(el, msg, kind) {
  el.textContent = msg;
  el.className = "savemsg" + (kind ? " " + kind : "");
  if (kind === "ok") setTimeout(function () { if (el.textContent === msg) el.textContent = ""; }, 4000);
}

// ---------- 標籤群組 ----------
function options(groupId) {
  var c = S.meta.catalog;
  var base = {
    "p-purposes": c.purposes, "w-purposes": c.purposes,
    "p-abilities": c.abilities, "w-abilities": c.abilities,
    "p-interests": c.interests, "w-interests": c.interests,
    "p-hobbies": c.hobbies, "w-hobbies": c.hobbies,
    "w-zodiac": c.zodiac, "w-marital": c.marital, "w-relationship": c.relationship
  }[groupId] || [];
  return base.concat(S.extra[groupId] || []);
}

function renderChips(groupId) {
  var box = $(groupId);
  if (!box) return;
  var sel = S.sel[groupId];
  box.innerHTML = options(groupId).map(function (tag) {
    return '<button type="button" class="chip' + (sel.has(tag) ? " on" : "") +
           '" data-tag="' + esc(tag) + '">' + esc(tag) + "</button>";
  }).join("");
}

function toggleTag(groupId, tag) {
  var sel = S.sel[groupId];
  if (sel.has(tag)) {
    sel.delete(tag);
    if (KIND_OF[groupId]) removeWeight(tag);
  } else {
    sel.add(tag);
    if (KIND_OF[groupId]) addWeight(tag, KIND_OF[groupId]);
  }
  renderChips(groupId);
  if (KIND_OF[groupId]) renderWeights();
}

// ---------- 權重 ----------
function addWeight(tag, kind) {
  if (S.weights.some(function (w) { return w.tag === tag; })) return;
  S.weights.push({ tag: tag, kind: kind, w: 60 });
}
function removeWeight(tag) {
  S.weights = S.weights.filter(function (w) { return w.tag !== tag; });
  ["w-abilities", "w-interests", "w-hobbies"].forEach(function (g) {
    if (S.sel[g].has(tag)) { S.sel[g].delete(tag); renderChips(g); }
  });
}
function renderWeights() {
  var box = $("weight-list");
  if (!S.weights.length) {
    box.innerHTML = '<p class="empty">還沒有選擇任何期望條件。</p>';
    return;
  }
  box.innerHTML = S.weights.map(function (w) {
    var btns = S.meta.catalog.weights.map(function (v) {
      var on = w.w === v ? " on" + (v === 100 ? " must" : "") : "";
      return '<button type="button" class="wbtn' + on + '" data-wtag="' + esc(w.tag) +
             '" data-w="' + v + '">' + (v === 100 ? "必要" : v + "%") + "</button>";
    }).join("");
    return '<div class="wrow"><span class="wtag">' + esc(w.tag) + "</span>" +
           '<span class="wkind">' + (KIND_LABEL[w.kind] || "") + "</span>" +
           '<span class="wbtns">' + btns + "</span>" +
           '<button type="button" class="wdel" data-del="' + esc(w.tag) + '" title="移除">×</button></div>';
  }).join("");
}

// ---------- 表單 <-> 資料 ----------
function rangeOf(key) {
  if ($("w-" + key + "-any").checked) return { any: true };
  var lo = $("w-" + key + "-min").value, hi = $("w-" + key + "-max").value;
  return { any: false, min: lo === "" ? null : Number(lo), max: hi === "" ? null : Number(hi) };
}
function choiceOf(key) {
  if ($("w-" + key + "-any").checked) return { any: true };
  var list = Array.from(S.sel["w-" + key]);
  return list.length ? { any: false, list: list } : { any: true };
}
function collect() {
  return {
    name: $("f-name").value.trim(),
    nickname: $("f-nickname").value.trim(),
    email: $("f-email").value.trim(),
    city: $("f-city").value.trim(),
    age: $("f-age").value,
    height: $("f-height").value,
    weight: $("f-weight").value,
    zodiac: $("f-zodiac").value,
    marital: $("f-marital").value,
    relationship: $("f-relationship").value,
    bio: $("f-bio").value.trim(),
    purposes: Array.from(S.sel["p-purposes"]),
    abilities: Array.from(S.sel["p-abilities"]),
    interests: Array.from(S.sel["p-interests"]),
    hobbies: Array.from(S.sel["p-hobbies"]),
    prefs: {
      age: rangeOf("age"), height: rangeOf("height"), weight: rangeOf("weight"),
      zodiac: choiceOf("zodiac"), marital: choiceOf("marital"),
      relationship: choiceOf("relationship"),
      purposes: Array.from(S.sel["w-purposes"]),
      wants: S.weights
    }
  };
}
function fill(u) {
  S.me = u;
  $("f-name").value = u.name || ""; $("f-nickname").value = u.nickname || "";
  $("f-email").value = u.email || ""; $("f-city").value = u.city || "";
  $("f-age").value = u.age || ""; $("f-height").value = u.height || "";
  $("f-weight").value = u.weight || ""; $("f-bio").value = u.bio || "";
  $("f-zodiac").value = u.zodiac || ""; $("f-marital").value = u.marital || "";
  $("f-relationship").value = u.relationship || "";

  var map = { "p-purposes": u.purposes, "p-abilities": u.abilities,
              "p-interests": u.interests, "p-hobbies": u.hobbies };
  var p = u.prefs || {};
  map["w-purposes"] = p.purposes;
  ["zodiac", "marital", "relationship"].forEach(function (k) {
    var rule = p[k] || { any: true };
    $("w-" + k + "-any").checked = !!rule.any;
    map["w-" + k] = rule.any ? [] : (rule.list || []);
  });
  ["age", "height", "weight"].forEach(function (k) {
    var rule = p[k] || { any: true };
    $("w-" + k + "-any").checked = !!rule.any;
    $("w-" + k + "-min").value = rule.any || rule.min == null ? "" : rule.min;
    $("w-" + k + "-max").value = rule.any || rule.max == null ? "" : rule.max;
  });

  S.weights = (p.wants || []).map(function (w) { return { tag: w.tag, kind: w.kind, w: w.w }; });
  var byKind = { ability: "w-abilities", interest: "w-interests", hobby: "w-hobbies" };
  S.weights.forEach(function (w) {
    var g = byKind[w.kind] || "w-interests";
    (map[g] = map[g] || []).push(w.tag);
  });

  TAG_GROUPS.forEach(function (g) {
    S.sel[g] = new Set(map[g] || []);
    (map[g] || []).forEach(function (t) {
      if (options(g).indexOf(t) < 0) (S.extra[g] = S.extra[g] || []).push(t);
    });
    renderChips(g);
  });
  renderWeights();
  syncDisabled();
  $("f-optout").checked = !!u.optOut;
  showWhoami(u);
}

function showWhoami(u) {
  $("whoami").hidden = false;
  $("whoami").className = "notice" + (u.optOut ? " pausedbanner" : "");
  $("whoami").innerHTML = u.optOut
    ? "<b>配對已暫停。</b>你目前不會出現在別人的配對結果，也不會收到來信。" +
      "到下方「帳號與隱私」取消勾選即可重新開啟。"
    : "目前編輯中的檔案：<b>" + esc(u.nickname) + "</b>（" + esc(u.email) +
      "）。修改後記得再按一次儲存。";
}

// ---------- 登入閘門 ----------
function showGate() {
  $("tabs").hidden = true;
  $("whochip").hidden = true;
  $("btn-logout").hidden = true;
  Array.prototype.forEach.call(document.querySelectorAll(".view"), function (v) {
    v.classList.toggle("is-on", v.id === "view-login");
  });
}

function showApp(view) {
  $("tabs").hidden = false;
  $("whochip").hidden = false;
  $("whochip").textContent = S.email;
  $("btn-logout").hidden = false;
  Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (b) {
    b.classList.toggle("is-on", b.dataset.view === view);
  });
  Array.prototype.forEach.call(document.querySelectorAll(".view"), function (v) {
    v.classList.toggle("is-on", v.id === "view-" + view);
  });
  window.scrollTo(0, 0);
}

function afterLogin(j) {
  S.email = j.email;
  S.hasProfile = !!j.hasProfile;
  $("f-email").value = j.email;
  if (j.user) fill(j.user);
  showApp("profile");
  if (S.hasProfile) { loadMatches(); loadOutbox(); }
}

function syncDisabled() {
  ["age", "height", "weight"].forEach(function (k) {
    $("w-" + k + "-min").parentNode.classList.toggle("disabled", $("w-" + k + "-any").checked);
  });
  ["zodiac", "marital", "relationship"].forEach(function (k) {
    $("w-" + k).classList.toggle("disabled", $("w-" + k + "-any").checked);
  });
}

// ---------- 配對 ----------
function tagChips(list, cls) {
  return list.map(function (t) {
    var extra = cls === "miss" && t.w >= 100 ? " must" : "";
    return '<span class="t ' + cls + extra + '">' + esc(t.tag) +
           (t.w ? " · " + (t.w >= 100 ? "必要" : t.w + "%") : "") + "</span>";
  }).join("");
}

function matchCard(m) {
  var v = m.myView, blocked = !v.pass;
  var meta = [m.age ? m.age + " 歲" : "", m.height ? m.height + " cm" : "",
              m.weight ? m.weight + " kg" : "", m.zodiac, m.marital, m.relationship, m.city]
             .filter(Boolean).join("・");
  var shared = uniq([].concat(m.shared.hobbies, m.shared.interests, m.shared.abilities));
  var badges = "";
  if (m.mutual) badges += '<span class="badge mutual">雙向適配</span>';
  if (m.contacted) badges += '<span class="badge sent">已聯絡</span>';
  if (blocked) badges += '<span class="badge block">未達你的條件</span>';

  var why = "";
  if (blocked) {
    why = '<div class="mwhy"><b>被淘汰的原因：</b>' + esc(v.reasons.join("；")) + "</div>";
  } else if (!m.theirView.pass) {
    why = '<div class="mwhy"><b>提醒：</b>你未達對方設定的條件（' +
          esc(m.theirView.reasons.join("；")) + "），信仍可寄出，但回覆機率較低。</div>";
  }

  return '<article class="mcard' + (blocked ? " blocked" : "") + '">' +
    '<div class="mtop">' +
      '<div class="ring" style="--p:' + Math.max(0, Math.min(100, m.score)) + '"><span>' +
        Math.round(m.score) + '<small>契合</small></span></div>' +
      '<div class="mid">' +
        '<div class="mname"><h3>' + esc(m.nickname) + "</h3>" + badges + "</div>" +
        '<p class="mmeta">' + esc(meta) + "　·　" + esc(m.emailMasked) + "</p>" +
        (m.bio ? '<p class="mbio">' + esc(m.bio) + "</p>" : "") +
        (m.purposes.length ? '<div class="taglist">' +
          m.purposes.map(function (p) { return '<span class="t">想找：' + esc(p) + "</span>"; }).join("") +
          "</div>" : "") +
        (v.matched.length ? '<div class="taglist">' + tagChips(v.matched, "hit") + "</div>" : "") +
        (v.missing.length ? '<div class="taglist">' + tagChips(v.missing, "miss") + "</div>" : "") +
        (shared.length ? '<p class="mmeta">共同點：' + esc(shared.join("、")) + "</p>" : "") +
        '<div class="scorebits"><span>我對他 <b>' + v.score + "</b></span>" +
          "<span>他對我 <b>" + (m.theirView.pass ? m.theirView.score : "未達標") + "</b></span>" +
          "<span>條件符合 <b>" + v.tagScore + "%</b></span></div>" +
        why +
      "</div>" +
    "</div>" +
    '<div class="mfoot"><button class="btn primary small" data-write="' + esc(m.id) + '"' +
      (m.contacted ? " disabled" : "") + ">" +
      (m.contacted ? "已聯絡過" : "寫信給 " + esc(m.nickname)) + "</button></div>" +
  "</article>";
}

function loadMatches() {
  if (!S.hasProfile) {
    $("match-sub").textContent = "請先於「我的檔案」填寫並儲存資料。";
    $("match-list").innerHTML = "";
    return Promise.resolve();
  }
  return api("/api/match" + ($("show-blocked").checked ? "?all=1" : "")).then(function (j) {
    S.matches = j.matches;
    $("match-sub").textContent = "在 " + j.pool + " 位會員中，找到 " + j.matches.length +
      " 位人選（依綜合契合度排序）。今日還可取用 " + j.quotaLeft + " 位對象的信箱。";
    $("match-list").innerHTML = j.matches.length
      ? j.matches.map(matchCard).join("")
      : '<div class="card"><p class="lead" style="margin:0">目前沒有符合條件的人選。' +
        '試著放寬硬性條件，或把某些「必要」權重調低。</p></div>';
  }).catch(function (e) {
    $("match-sub").textContent = "配對失敗：" + e.message;
  });
}

// ---------- 寫信 ----------
function openLetter(id, autoFirst) {
  var m = S.matches.filter(function (x) { return x.id === id; })[0];
  if (!m) return;
  S.target = m;
  $("m-title").textContent = "寫信給 " + m.nickname;
  var shared = uniq([].concat(m.shared.hobbies, m.shared.interests, m.shared.abilities));
  $("m-shared").innerHTML = "綜合契合度 <b>" + Math.round(m.score) + "</b>　·　" +
    (shared.length ? "你們的共同點：" + esc(shared.join("、"))
                   : "你們沒有重疊的標籤，系統會改用另一種寫法");
  $("m-subject").value = "";
  $("m-body").value = "";
  $("m-msg").textContent = "";
  $("m-to-email").textContent = "取得中…";
  $("m-to-hint").textContent = "";
  S.toEmail = "";
  $("modal").hidden = false;
  setMode(autoFirst ? "auto" : "self");
  if (!autoFirst) fetchLetter("literary", true);   // 自己寫也要先拿到對方信箱
}
function setMode(mode) {
  S.mode = mode;
  Array.prototype.forEach.call($("m-mode").children, function (b) {
    b.classList.toggle("on", b.dataset.mode === mode);
  });
  $("m-autoline").hidden = mode !== "auto";
  if (mode === "auto") regen();
  else {
    $("m-subject").value = "你好，想認識你";
    $("m-body").value = "";
    $("m-body").focus();
  }
}
function fetchLetter(style, emailOnly) {
  if (!S.target) return Promise.resolve();
  if (!emailOnly) $("m-msg").textContent = "代寫中…";
  return api("/api/compose", { method: "POST", body: {
    toId: S.target.id, style: style,
    seed: Math.floor(Math.random() * 1e9)
  }}).then(function (j) {
    S.toEmail = j.to.email;
    S.toName = j.to.nickname;
    $("m-to-email").textContent = j.to.email;
    $("m-to-hint").textContent =
      "信由你自己的信箱（" + j.from.email + "）寄出，系統不代寄。" +
      "請尊重對方，只寄這一次，等對方回覆。";
    if (emailOnly) return;
    $("m-subject").value = j.letter.subject;
    $("m-body").value = j.letter.body;
    flash($("m-msg"), "已產生新的一篇，可自行修改", "ok");
  }).catch(function (e) {
    $("m-to-email").textContent = "—";
    flash($("m-msg"), e.message, "bad");
  });
}

function regen() { return fetchLetter($("m-style").value, false); }

function copyText(text, btn) {
  function done() {
    if (!btn) return;
    var old = btn.textContent;
    btn.textContent = "已複製";
    btn.classList.add("done");
    setTimeout(function () { btn.textContent = old; btn.classList.remove("done"); }, 1600);
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(done, fallback);
  }
  return fallback();
  function fallback() {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); done(); } catch (err) { /* 使用者可手動選取 */ }
    document.body.removeChild(ta);
  }
}
function recordContact(then) {
  if (!S.target) return;
  api("/api/contact", { method: "POST", body: {
    toId: S.target.id,
    subject: $("m-subject").value, body: $("m-body").value,
    writtenBy: S.mode, score: S.target.score
  }}).then(function () {
    if (then) then();
    flash($("m-msg"), "已存入寄件備份，記得回你的信箱把信寄出去", "ok");
    setTimeout(function () {
      $("modal").hidden = true;
      loadMatches(); loadOutbox();
    }, 2200);
  }).catch(function (e) { flash($("m-msg"), e.message, "bad"); });
}

function openMailApp() {
  if (!S.toEmail) { flash($("m-msg"), "還沒取得對方信箱，請稍候", "bad"); return; }
  if (!$("m-subject").value.trim() || !$("m-body").value.trim()) {
    flash($("m-msg"), "主旨與內文都不能空白", "bad"); return;
  }
  var url = "mailto:" + encodeURIComponent(S.toEmail) +
            "?subject=" + encodeURIComponent($("m-subject").value) +
            "&body=" + encodeURIComponent($("m-body").value);
  recordContact(function () { window.location.href = url; });
}

// ---------- 寄件備份 ----------
function loadOutbox() {
  if (!S.hasProfile) return Promise.resolve();
  return api("/api/outbox").then(function (j) {
    $("outbox-sub").textContent = j.outbox.length
      ? "共 " + j.outbox.length + " 封。"
      : "還沒寄出任何信件。";
    $("outbox-list").innerHTML = j.outbox.map(function (r) {
      return '<article class="ocard"><div class="ohead"><h3>致 ' + esc(r.toNickname) +
        "　<span class='otime'>" + esc(r.toEmail || "") + "</span></h3>" +
        '<span class="otime">' + esc(r.sentAt.replace("T", " ")) + "</span></div>" +
        '<p class="mmeta" style="margin:8px 0 0">主旨：' + esc(r.subject) +
        "　·　" + (r.writtenBy === "auto" ? "系統代寫" : "親筆") + "</p>" +
        '<div class="obody">' + esc(r.body) + "</div></article>";
    }).join("");
  });
}

// ---------- 初始化 ----------
function fillSelect(id, list, placeholder) {
  $(id).innerHTML = '<option value="">' + placeholder + "</option>" +
    list.map(function (o) { return "<option>" + esc(o) + "</option>"; }).join("");
}

function boot() {
  api("/api/meta").then(function (j) {
    S.meta = j;
    var c = j.catalog;
    fillSelect("f-zodiac", c.zodiac, "請選擇");
    fillSelect("f-marital", c.marital, "請選擇");
    fillSelect("f-relationship", c.relationship, "請選擇");
    $("m-style").innerHTML = j.styles.map(function (s) {
      return '<option value="' + esc(s.key) + '">' + esc(s.name) + "</option>";
    }).join("");
    $("m-note").textContent =
      "系統不代寄信件——把內容複製到你自己的信箱寄出，對方就能直接回覆你。" +
      "為避免騷擾，每人每天最多取用 " + j.mail.dailyLimit +
      " 位對象的信箱，同一位對象只能取用一次。";

    TAG_GROUPS.forEach(function (g) { S.sel[g] = new Set(); renderChips(g); });
    renderWeights();
    syncDisabled();

    return api("/api/session").then(function (r) {
      if (!r.loggedIn) { showGate(); return; }
      afterLogin(r);
    });
  }).catch(function (e) {
    document.body.insertAdjacentHTML("afterbegin",
      '<div class="wrap"><div class="notice" style="border-left-color:#a8453c">無法連線到伺服器：' +
      esc(e.message) + "</div></div>");
  });
}

// ---------- 事件 ----------
document.addEventListener("click", function (e) {
  var t = e.target;

  if (t.classList.contains("tab")) {
    Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (b) {
      b.classList.toggle("is-on", b === t);
    });
    Array.prototype.forEach.call(document.querySelectorAll(".view"), function (v) {
      v.classList.toggle("is-on", v.id === "view-" + t.dataset.view);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (t.dataset.view === "match") loadMatches();
    if (t.dataset.view === "outbox") loadOutbox();
    return;
  }
  if (t.classList.contains("chip")) {
    var group = t.parentNode.id;
    if (group) toggleTag(group, t.dataset.tag);
    return;
  }
  if (t.dataset.addbtn) { addCustom(t.dataset.addbtn); return; }
  if (t.dataset.w) {
    S.weights.forEach(function (w) {
      if (w.tag === t.dataset.wtag) w.w = Number(t.dataset.w);
    });
    renderWeights();
    return;
  }
  if (t.dataset.del) { removeWeight(t.dataset.del); renderWeights(); return; }
  if (t.dataset.write) { openLetter(t.dataset.write, false); return; }
  if (t.dataset.mode) { setMode(t.dataset.mode); return; }
  if (t.dataset.copy) {
    e.preventDefault();
    copyText($(t.dataset.copy).textContent || $(t.dataset.copy).value, t);
    return;
  }
  if (t === $("modal")) { $("modal").hidden = true; return; }
});

function addCustom(groupId) {
  var input = document.querySelector('[data-add="' + groupId + '"]');
  var tag = (input.value || "").trim();
  if (!tag) return;
  if (options(groupId).indexOf(tag) < 0) (S.extra[groupId] = S.extra[groupId] || []).push(tag);
  input.value = "";
  if (!S.sel[groupId].has(tag)) toggleTag(groupId, tag);
  else renderChips(groupId);
}

document.addEventListener("keydown", function (e) {
  if (e.key === "Enter" && e.target.dataset && e.target.dataset.add) {
    e.preventDefault(); addCustom(e.target.dataset.add);
  }
  if (e.key === "Escape" && !$("modal").hidden) $("modal").hidden = true;
});

document.addEventListener("change", function (e) {
  if (/^w-(age|height|weight|zodiac|marital|relationship)-any$/.test(e.target.id)) syncDisabled();
  if (e.target.id === "show-blocked") loadMatches();
});

window.addEventListener("DOMContentLoaded", function () {
  $("btn-save").addEventListener("click", function () {
    var msg = $("savemsg");
    flash(msg, "儲存中…");
    api("/api/users", { method: "POST", body: collect() }).then(function (j) {
      S.me = j.user;
      S.hasProfile = true;
      showWhoami(j.user);
      flash(msg, j.action === "created" ? "已建立檔案，正在為你配對…" : "已更新檔案，重新配對中…", "ok");
      return loadMatches().then(function () {
        document.querySelector('.tab[data-view="match"]').click();
      });
    }).catch(function (e) { flash(msg, e.message, "bad"); });
  });

  $("btn-seed").addEventListener("click", function () {
    var msg = $("savemsg");
    flash(msg, "灌入中…");
    api("/api/seed", { method: "POST", body: {} }).then(function (j) {
      flash(msg, "已新增 " + j.added + " 位示範會員，目前共 " + j.total + " 位", "ok");
      return loadMatches();
    }).catch(function (e) { flash(msg, e.message, "bad"); });
  });

  $("btn-clear").addEventListener("click", function () {
    if (!confirm("重新載入表單，未儲存的修改會消失。要繼續嗎？")) return;
    location.reload();
  });

  $("btn-refresh").addEventListener("click", loadMatches);
  $("btn-best").addEventListener("click", function () {
    var best = S.matches.filter(function (m) { return m.myView.pass && !m.contacted; })[0];
    if (!best) { alert("目前沒有可聯絡的人選，先按「重新配對」或放寬條件。"); return; }
    openLetter(best.id, true);
  });

  // ---- 登入 / 信箱驗證 ----
  function requestCode() {
    var email = $("g-email").value.trim();
    if (!email) { flash($("g-msg"), "請先填寫信箱", "bad"); return; }
    $("btn-code").disabled = true;
    flash($("g-msg"), "寄送中…");
    api("/api/auth/request", { method: "POST", body: { email: email } }).then(function (j) {
      S.email = email;
      $("step-email").hidden = true;
      $("step-code").hidden = false;
      $("g-sent").innerHTML = j.devCode
        ? esc(j.note) + "：<code>" + esc(j.devCode) + "</code>"
        : esc(j.note);
      $("g-msg").textContent = "";
      $("g-code").value = "";
      $("g-code").focus();
    }).catch(function (e) {
      flash($("g-msg"), e.message, "bad");
    }).then(function () { $("btn-code").disabled = false; });
  }

  function verifyCode() {
    var code = $("g-code").value.trim();
    if (code.length < 6) { flash($("g-msg2"), "請輸入六位數驗證碼", "bad"); return; }
    $("btn-verify").disabled = true;
    flash($("g-msg2"), "驗證中…");
    api("/api/auth/verify", { method: "POST", body: { email: S.email, code: code } })
      .then(function (j) {
        flash($("g-msg2"), "驗證成功", "ok");
        afterLogin(j);
      })
      .catch(function (e) { flash($("g-msg2"), e.message, "bad"); })
      .then(function () { $("btn-verify").disabled = false; });
  }

  $("btn-code").addEventListener("click", requestCode);
  $("btn-verify").addEventListener("click", verifyCode);
  $("btn-back").addEventListener("click", function () {
    $("step-code").hidden = true;
    $("step-email").hidden = false;
    $("g-msg2").textContent = "";
  });
  $("g-email").addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); requestCode(); }
  });
  $("g-code").addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); verifyCode(); }
  });
  $("btn-logout").addEventListener("click", function () {
    api("/api/auth/logout", { method: "POST", body: {} })
      .then(function () { location.reload(); });
  });

  // ---- 帳號與隱私 ----
  $("f-optout").addEventListener("change", function () {
    var want = $("f-optout").checked;
    api("/api/optout", { method: "POST", body: { optOut: want } }).then(function () {
      if (S.me) { S.me.optOut = want; showWhoami(S.me); }
      flash($("acctmsg"), want ? "已暫停配對" : "已重新開啟配對", "ok");
      loadMatches();
    }).catch(function (e) {
      $("f-optout").checked = !want;
      flash($("acctmsg"), e.message, "bad");
    });
  });

  $("btn-delete").addEventListener("click", function () {
    if (!confirm("將永久刪除你的檔案與寄件備份，且無法復原。確定要繼續嗎？")) return;
    api("/api/account/delete", { method: "POST", body: {} })
      .then(function () { alert("檔案已刪除。"); location.reload(); })
      .catch(function (e) { flash($("acctmsg"), e.message, "bad"); });
  });

  $("m-close").addEventListener("click", function () { $("modal").hidden = true; });
  $("m-cancel").addEventListener("click", function () { $("modal").hidden = true; });
  $("m-regen").addEventListener("click", regen);
  $("m-style").addEventListener("change", regen);
  $("m-open").addEventListener("click", openMailApp);
  $("m-copyall").addEventListener("click", function () {
    if (!S.toEmail) { flash($("m-msg"), "還沒取得對方信箱，請稍候", "bad"); return; }
    copyText("收件者：" + S.toEmail + "\n主旨：" + $("m-subject").value +
             "\n\n" + $("m-body").value, $("m-copyall"));
    recordContact(null);
  });

  boot();
});
})();
