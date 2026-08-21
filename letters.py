# -*- coding: utf-8 -*-
"""系統代寫信件：依共同點自動生成文情並茂的初次來信。"""

import random

STYLES = [
    {"key": "literary", "name": "溫柔文青"},
    {"key": "sincere", "name": "誠懇直白"},
    {"key": "humor", "name": "幽默輕鬆"},
    {"key": "poetic", "name": "詩意浪漫"},
]

SUBJECTS = {
    "literary": ["在人海裡先向你點個頭", "讀完你的介紹，想寫幾句話給你",
                 "一封來自陌生人的、不太陌生的信"],
    "sincere": ["你好，想認識你", "有幾個共同點，所以寫了這封信",
                "冒昧來信，想交個朋友"],
    "humor": ["系統說我們很合，我來查證一下", "打擾了，一位同好路過",
              "這封信有 87%% 是真心的（剩下 13%% 是緊張）"],
    "poetic": ["願這封信，落在你手心", "寫給素未謀面的你", "山長水遠，先寄一封信"],
}

OPENINGS = {
    "literary": [
        "傍晚讀到你的自我介紹時，窗外的光正斜斜地落在桌上。我把那幾行字看了兩遍，想著世界上竟真有人，把日子過成我嚮往的樣子。",
        "有些人的文字讀起來是安靜的，你的就是。我在許多份介紹裡停在你這一頁，於是決定不只是路過。",
        "我一向不太擅長開場白，可是看完你寫的東西，忽然覺得沉默有點可惜。",
    ],
    "sincere": [
        "你好，我是{me}。這是一封陌生人的來信，我會盡量寫得簡短而誠實。",
        "冒昧打擾。我在配對名單上看到你的介紹，覺得有些地方很像，所以決定主動寫信。",
        "你好。我不太會鋪陳，就直接說了：我想認識你。",
    ],
    "humor": [
        "先自首：是系統把我推到你面前的，而且分數高到我不好意思當作沒看到。",
        "你好，我是{me}，一個在配對頁面上滑了很久、終於鼓起勇氣按下按鈕的人。",
        "這封信的難度大概等同於第一次上場發球，手是抖的，但球還是要發。",
    ],
    "poetic": [
        "如果緣分真有形狀，我想它大概就是——在千萬人之中，恰好讀到你這一頁。",
        "海上有霧的時候，船隻會互相鳴笛。這封信，就當作我朝你的方向，輕輕鳴了一聲。",
        "有些相遇像春天：不必轟轟烈烈，只要恰好在對的時候，落一場雨。",
    ],
}

BRIDGES = {
    "literary": "讓我停下來的，是這幾件事——{items}。",
    "sincere": "我們重疊的地方不少：{items}。",
    "humor": "重點來了，我們居然都{items}。這種巧合，不好好利用一下說不過去。",
    "poetic": "而最動人的是，我們竟共享著同樣的偏愛：{items}。",
}

NO_SHARE = {
    "literary": "我們的興趣不算重疊，但你的世界看起來很寬。我一向覺得，兩個不一樣的人，反而更有話可聊。",
    "sincere": "我們的興趣不完全一樣，不過我對你擅長的事很好奇，也願意從頭學起。",
    "humor": "我們的共同點目前是零，但這代表我可以名正言順地當你的學生，這不是很划算嗎？",
    "poetic": "縱使我們來自不同的河流，也終將在同一片海裡遇見。",
}

PURPOSE_LINES = {
    "旅伴": "如果哪天要出走，我想找一個節奏對得上的人同行——不趕行程，願意為一條巷子改變路線的那種。",
    "牌搭子": "牌桌上最迷人的不是輸贏，是四個人願意把一整個下午留給彼此。缺人的時候，記得算我一個。",
    "球友": "固定的球伴很難得。有人陪著練、陪著輸，才會一直打下去。",
    "飯友": "一個人吃飯久了，會忘記食物本來是有味道的。找個人一起吃，才像回事。",
    "運動夥伴": "運動最難的從來不是動作，是出門。有人約，就成功一半了。",
    "尋找伴侶": "我不急著定義什麼，只是希望能認識一個可以慢慢走下去的人。",
    "認識新朋友": "不必有什麼前提，先當朋友，剩下的交給時間。",
    "學習夥伴": "一個人學容易放棄，兩個人就變成約定。",
    "寵物同好": "養過的人都懂，那種被無條件依賴的重量。",
    "聊天談心": "有時候需要的不是建議，只是一個願意聽完的人。",
    "看展看戲": "散場後那段走路的路上，聊剛剛看到的東西，往往比展覽本身更好。",
    "創業夥伴": "想法值錢的前提，是有人願意一起把它做出來。",
}

INVITES = {
    "literary": "如果你也覺得這封信不算突兀，願不願意回我一封？不必長，一兩句就好。",
    "sincere": "如果你有興趣，回信讓我知道；如果沒有，也完全沒關係，祝你一切都好。",
    "humor": "回或不回都可以，但我先說：我很會挑餐廳，這點請列入考量。",
    "poetic": "若你願意，就回我一封信吧。我會等，等得起。",
}

CLOSINGS = {
    "literary": "祝好，也祝你今天的光剛剛好。",
    "sincere": "祝順心。",
    "humor": "祝你今天諸事順利，包括看完這封信。",
    "poetic": "願風常向你，願你所行皆坦途。",
}


def _fmt_items(shared, limit=4):
    """把共同標籤組成一句話。"""
    pool = []
    for key in ("hobbies", "interests", "abilities"):
        for t in shared.get(key) or []:
            if t not in pool:
                pool.append(t)
    if not pool:
        return None
    picked = pool[:limit]
    if len(picked) == 1:
        return "喜歡" + picked[0]
    return "、".join(picked[:-1]) + "，還有" + picked[-1]


def compose(me, target, shared, style="literary", seed=None):
    """回傳 {subject, body}；body 為純文字（前端可再編輯）。"""
    if style not in OPENINGS:
        style = "literary"
    rnd = random.Random(seed)
    my_name = me.get("nickname") or me.get("name") or "我"
    to_name = target.get("nickname") or target.get("name") or "你"

    paras = []
    paras.append("%s 你好：" % to_name)
    paras.append(rnd.choice(OPENINGS[style]).replace("{me}", my_name))

    items = _fmt_items(shared)
    if items:
        paras.append(BRIDGES[style].replace("{items}", items))
    else:
        paras.append(NO_SHARE[style])

    purposes = shared.get("purposes") or []
    if purposes:
        line = PURPOSE_LINES.get(purposes[0])
        if line:
            paras.append(line)
    elif target.get("purposes"):
        line = PURPOSE_LINES.get((target.get("purposes") or [None])[0])
        if line:
            paras.append(line)

    if me.get("bio"):
        paras.append("關於我：%s" % me["bio"].strip())

    paras.append(INVITES[style])
    paras.append(CLOSINGS[style])
    paras.append("—— %s" % my_name)

    subject = rnd.choice(SUBJECTS[style]).replace("%%", "%")
    return {"subject": subject, "body": "\n\n".join(paras)}
