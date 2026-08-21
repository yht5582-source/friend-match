# -*- coding: utf-8 -*-
"""加權配對引擎。

規則：
  1. 硬性條件（可勾「不在意」關閉）：年齡／身高／體重區間、星座、婚姻狀況、交友狀況。
  2. 期望的能力／興趣／嗜好可加權 20~100%，其中 100% = 必要條件，缺一即淘汰。
  3. 分數同時計算「我對他」與「他對我」，取加權平均，避免單向熱臉。
"""

BASELINE_NO_PREF = 60.0   # 完全沒填期望條件時的中性分
PURPOSE_SHARE = 12.0      # 交友目的最多可貢獻的分數
MY_SIDE = 0.6             # 綜合分中「我對他」的比重


def _num(v, default=None):
    try:
        if v is None or v == "":
            return default
        return float(v)
    except (TypeError, ValueError):
        return default


def _in_range(value, rule, label):
    """rule = {any: bool, min: n, max: n}；回傳 (通過?, 未通過原因)。"""
    if not rule or rule.get("any"):
        return True, None
    v = _num(value)
    if v is None:
        return False, "%s未填寫" % label
    lo, hi = _num(rule.get("min")), _num(rule.get("max"))
    if lo is not None and v < lo:
        return False, "%s %g 低於期望的 %g" % (label, v, lo)
    if hi is not None and v > hi:
        return False, "%s %g 高於期望的 %g" % (label, v, hi)
    return True, None


def _in_list(value, rule, label):
    if not rule or rule.get("any"):
        return True, None
    allowed = rule.get("list") or []
    if not allowed:
        return True, None
    if value in allowed:
        return True, None
    return False, "%s「%s」不在期望範圍" % (label, value or "未填")


def _tags(profile):
    """把三類標籤攤平成 (kind, tag) 集合，並保留純標籤集合供跨類比對。"""
    flat = set()
    for kind in ("abilities", "interests", "hobbies"):
        for t in profile.get(kind) or []:
            flat.add(t)
    return flat


def _hard_gate(viewer, cand):
    """檢查 viewer 的硬性條件，回傳 (通過?, 原因清單)。"""
    prefs = viewer.get("prefs") or {}
    reasons = []
    checks = [
        _in_range(cand.get("age"), prefs.get("age"), "年齡"),
        _in_range(cand.get("height"), prefs.get("height"), "身高"),
        _in_range(cand.get("weight"), prefs.get("weight"), "體重"),
        _in_list(cand.get("zodiac"), prefs.get("zodiac"), "星座"),
        _in_list(cand.get("marital"), prefs.get("marital"), "婚姻狀況"),
        _in_list(cand.get("relationship"), prefs.get("relationship"), "交友狀況"),
    ]
    for ok, why in checks:
        if not ok:
            reasons.append(why)
    return (len(reasons) == 0), reasons


def _want_score(viewer, cand):
    """加權標籤比對。回傳 (分數0~100, 已符合清單, 缺少清單, 缺少的必要條件)。"""
    wants = (viewer.get("prefs") or {}).get("wants") or []
    have = _tags(cand)
    total = 0.0
    got = 0.0
    matched, missing, missing_must = [], [], []
    for w in wants:
        tag = (w.get("tag") or "").strip()
        if not tag:
            continue
        weight = _num(w.get("w"), 60.0) or 60.0
        weight = max(0.0, min(100.0, weight))
        total += weight
        entry = {"tag": tag, "w": int(weight), "kind": w.get("kind", "")}
        if tag in have:
            got += weight
            matched.append(entry)
        else:
            missing.append(entry)
            if weight >= 100:
                missing_must.append(entry)
    if total <= 0:
        return BASELINE_NO_PREF, matched, missing, missing_must
    return (got / total) * 100.0, matched, missing, missing_must


def _purpose_score(viewer, cand):
    """交友目的契合度 0~1，以及共同目的。"""
    prefs = viewer.get("prefs") or {}
    wanted = [p for p in (prefs.get("purposes") or []) if p]
    if not wanted:
        wanted = [p for p in (viewer.get("purposes") or []) if p]
    if not wanted:
        return 0.5, []
    theirs = set(cand.get("purposes") or [])
    shared = [p for p in wanted if p in theirs]
    return (len(shared) / float(len(wanted))), shared


def one_way(viewer, cand):
    """viewer 眼中 cand 的表現。"""
    passed, reasons = _hard_gate(viewer, cand)
    tag_pct, matched, missing, missing_must = _want_score(viewer, cand)
    if missing_must:
        passed = False
        reasons = reasons + ["缺少必要條件：" + "、".join(m["tag"] for m in missing_must)]
    p_ratio, shared_purposes = _purpose_score(viewer, cand)
    raw = tag_pct * ((100.0 - PURPOSE_SHARE) / 100.0) + p_ratio * PURPOSE_SHARE
    return {
        "pass": passed,
        "reasons": reasons,
        "score": round(raw, 1),
        "tagScore": round(tag_pct, 1),
        "matched": matched,
        "missing": missing,
        "missingMust": missing_must,
        "sharedPurposes": shared_purposes,
    }


def shared_tags(a, b):
    """兩人共同的能力／興趣／嗜好，用於代寫信件。"""
    out = {}
    for kind in ("abilities", "interests", "hobbies"):
        mine = set(a.get(kind) or [])
        out[kind] = sorted(mine & set(b.get(kind) or []))
    out["purposes"] = sorted(set(a.get("purposes") or []) & set(b.get("purposes") or []))
    return out


def rank(viewer, others, limit=20, include_blocked=False):
    """對所有候選人排序。預設只回傳通過我方硬性條件者。"""
    rows = []
    for cand in others:
        if cand.get("id") == viewer.get("id"):
            continue
        mine = one_way(viewer, cand)
        if not mine["pass"] and not include_blocked:
            continue
        theirs = one_way(cand, viewer)
        their_score = theirs["score"] if theirs["pass"] else 0.0
        final = mine["score"] * MY_SIDE + their_score * (1 - MY_SIDE)
        if not mine["pass"]:
            final = final * 0.4
        rows.append({
            "id": cand.get("id"),
            "nickname": cand.get("nickname") or cand.get("name"),
            "age": cand.get("age"),
            "height": cand.get("height"),
            "weight": cand.get("weight"),
            "zodiac": cand.get("zodiac"),
            "marital": cand.get("marital"),
            "relationship": cand.get("relationship"),
            "city": cand.get("city"),
            "bio": cand.get("bio"),
            "purposes": cand.get("purposes") or [],
            "abilities": cand.get("abilities") or [],
            "interests": cand.get("interests") or [],
            "hobbies": cand.get("hobbies") or [],
            "score": round(final, 1),
            "myView": mine,
            "theirView": {
                "pass": theirs["pass"],
                "score": round(their_score, 1),
                "reasons": theirs["reasons"],
            },
            "mutual": bool(mine["pass"] and theirs["pass"]),
            "shared": shared_tags(viewer, cand),
        })
    rows.sort(key=lambda r: (-r["score"], not r["mutual"]))
    return rows[:limit]
