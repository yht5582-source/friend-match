// 示範會員（由 seed.py 產生，請勿手改）

export function demoUsers() {
  return [
    {
      "name": "林政哲",
      "nickname": "阿哲",
      "email": "demo.zhe@example.com",
      "age": 34,
      "height": 176,
      "weight": 70,
      "zodiac": "天蠍座",
      "marital": "未婚",
      "relationship": "沒有交往對象",
      "city": "台北",
      "bio": "軟體工程師，週末不是在山上就是在往山上的路上。煮得一手好咖哩。",
      "purposes": [
        "旅伴",
        "尋找伴侶",
        "運動夥伴"
      ],
      "abilities": [
        "下廚",
        "開車",
        "程式設計",
        "行程規劃",
        "英文流利"
      ],
      "interests": [
        "登山健行",
        "旅行",
        "攝影",
        "咖啡",
        "健身"
      ],
      "hobbies": [
        "爬山",
        "慢跑",
        "手沖咖啡",
        "露營"
      ],
      "prefs": {
        "age": {
          "any": false,
          "min": 28,
          "max": 40
        },
        "height": {
          "any": true
        },
        "weight": {
          "any": true
        },
        "zodiac": {
          "any": true
        },
        "marital": {
          "any": false,
          "list": [
            "未婚",
            "離婚"
          ]
        },
        "relationship": {
          "any": false,
          "list": [
            "沒有交往對象"
          ]
        },
        "purposes": [
          "旅伴",
          "尋找伴侶"
        ],
        "wants": [
          {
            "tag": "登山健行",
            "w": 100,
            "kind": "interest"
          },
          {
            "tag": "攝影",
            "w": 60,
            "kind": "interest"
          },
          {
            "tag": "旅行",
            "w": 80,
            "kind": "interest"
          },
          {
            "tag": "下廚",
            "w": 40,
            "kind": "ability"
          }
        ]
      }
    },
    {
      "name": "陳語柔",
      "nickname": "小雨",
      "email": "demo.yu@example.com",
      "age": 31,
      "height": 162,
      "weight": 50,
      "zodiac": "巨蟹座",
      "marital": "未婚",
      "relationship": "沒有交往對象",
      "city": "台北",
      "bio": "出版社編輯。相信一段好的關係，是兩個人各自完整。",
      "purposes": [
        "旅伴",
        "尋找伴侶",
        "看展看戲"
      ],
      "abilities": [
        "寫作",
        "英文流利",
        "咖啡手沖",
        "攝影"
      ],
      "interests": [
        "閱讀",
        "旅行",
        "看展覽",
        "攝影",
        "咖啡",
        "登山健行"
      ],
      "hobbies": [
        "爬山",
        "手沖咖啡",
        "攝影",
        "拼圖"
      ],
      "prefs": {
        "age": {
          "any": false,
          "min": 30,
          "max": 42
        },
        "height": {
          "any": false,
          "min": 170,
          "max": 190
        },
        "weight": {
          "any": true
        },
        "zodiac": {
          "any": true
        },
        "marital": {
          "any": false,
          "list": [
            "未婚"
          ]
        },
        "relationship": {
          "any": false,
          "list": [
            "沒有交往對象"
          ]
        },
        "purposes": [
          "旅伴",
          "尋找伴侶"
        ],
        "wants": [
          {
            "tag": "閱讀",
            "w": 80,
            "kind": "interest"
          },
          {
            "tag": "旅行",
            "w": 100,
            "kind": "interest"
          },
          {
            "tag": "攝影",
            "w": 60,
            "kind": "interest"
          },
          {
            "tag": "下廚",
            "w": 60,
            "kind": "ability"
          }
        ]
      }
    },
    {
      "name": "黃志明",
      "nickname": "老黃",
      "email": "demo.ming@example.com",
      "age": 58,
      "height": 170,
      "weight": 74,
      "zodiac": "獅子座",
      "marital": "已婚",
      "relationship": "不便透露",
      "city": "新北",
      "bio": "退休公務員。牌搭子難尋，週三下午固定開桌。",
      "purposes": [
        "牌搭子",
        "認識新朋友",
        "飯友"
      ],
      "abilities": [
        "麻將",
        "橋牌",
        "開車",
        "書法"
      ],
      "interests": [
        "書法國畫",
        "品茶",
        "美食探店",
        "看球賽"
      ],
      "hobbies": [
        "麻將",
        "橋牌",
        "品茶",
        "釣魚"
      ],
      "prefs": {
        "age": {
          "any": false,
          "min": 45,
          "max": 75
        },
        "height": {
          "any": true
        },
        "weight": {
          "any": true
        },
        "zodiac": {
          "any": true
        },
        "marital": {
          "any": true
        },
        "relationship": {
          "any": true
        },
        "purposes": [
          "牌搭子"
        ],
        "wants": [
          {
            "tag": "麻將",
            "w": 100,
            "kind": "hobby"
          },
          {
            "tag": "品茶",
            "w": 40,
            "kind": "interest"
          },
          {
            "tag": "橋牌",
            "w": 60,
            "kind": "hobby"
          }
        ]
      }
    },
    {
      "name": "王淑芬",
      "nickname": "芬姐",
      "email": "demo.fen@example.com",
      "age": 55,
      "height": 158,
      "weight": 56,
      "zodiac": "處女座",
      "marital": "離婚",
      "relationship": "沒有交往對象",
      "city": "台北",
      "bio": "開了間小早餐店。想找人打牌、偶爾一起走走。",
      "purposes": [
        "牌搭子",
        "旅伴",
        "認識新朋友"
      ],
      "abilities": [
        "下廚",
        "麻將",
        "理財投資"
      ],
      "interests": [
        "美食探店",
        "旅行",
        "追劇",
        "品酒"
      ],
      "hobbies": [
        "麻將",
        "KTV",
        "爬山",
        "品茶"
      ],
      "prefs": {
        "age": {
          "any": false,
          "min": 45,
          "max": 70
        },
        "height": {
          "any": true
        },
        "weight": {
          "any": true
        },
        "zodiac": {
          "any": true
        },
        "marital": {
          "any": true
        },
        "relationship": {
          "any": true
        },
        "purposes": [
          "牌搭子",
          "旅伴"
        ],
        "wants": [
          {
            "tag": "麻將",
            "w": 100,
            "kind": "hobby"
          },
          {
            "tag": "旅行",
            "w": 60,
            "kind": "interest"
          },
          {
            "tag": "下廚",
            "w": 40,
            "kind": "ability"
          }
        ]
      }
    },
    {
      "name": "張俊傑",
      "nickname": "阿傑",
      "email": "demo.jie@example.com",
      "age": 27,
      "height": 182,
      "weight": 76,
      "zodiac": "射手座",
      "marital": "未婚",
      "relationship": "沒有交往對象",
      "city": "台中",
      "bio": "健身教練。想找固定球伴，羽球桌球都可以。",
      "purposes": [
        "球友",
        "運動夥伴",
        "認識新朋友"
      ],
      "abilities": [
        "健身指導",
        "球類指導",
        "游泳",
        "開車"
      ],
      "interests": [
        "健身",
        "跑步",
        "單車",
        "看球賽",
        "美食探店"
      ],
      "hobbies": [
        "羽球",
        "桌球",
        "籃球",
        "慢跑",
        "看球賽"
      ],
      "prefs": {
        "age": {
          "any": false,
          "min": 22,
          "max": 40
        },
        "height": {
          "any": true
        },
        "weight": {
          "any": true
        },
        "zodiac": {
          "any": true
        },
        "marital": {
          "any": true
        },
        "relationship": {
          "any": true
        },
        "purposes": [
          "球友",
          "運動夥伴"
        ],
        "wants": [
          {
            "tag": "羽球",
            "w": 100,
            "kind": "hobby"
          },
          {
            "tag": "健身",
            "w": 80,
            "kind": "interest"
          },
          {
            "tag": "跑步",
            "w": 60,
            "kind": "interest"
          }
        ]
      }
    },
    {
      "name": "李欣怡",
      "nickname": "怡怡",
      "email": "demo.yi@example.com",
      "age": 29,
      "height": 165,
      "weight": 52,
      "zodiac": "雙子座",
      "marital": "未婚",
      "relationship": "沒有交往對象",
      "city": "台中",
      "bio": "牙醫助理。羽球打了十年，找得到對手就開心。",
      "purposes": [
        "球友",
        "運動夥伴",
        "尋找伴侶"
      ],
      "abilities": [
        "急救證照",
        "游泳",
        "唱歌"
      ],
      "interests": [
        "健身",
        "旅行",
        "追劇",
        "唱歌KTV",
        "跑步"
      ],
      "hobbies": [
        "羽球",
        "桌球",
        "慢跑",
        "KTV"
      ],
      "prefs": {
        "age": {
          "any": false,
          "min": 25,
          "max": 38
        },
        "height": {
          "any": false,
          "min": 172,
          "max": 195
        },
        "weight": {
          "any": true
        },
        "zodiac": {
          "any": true
        },
        "marital": {
          "any": false,
          "list": [
            "未婚"
          ]
        },
        "relationship": {
          "any": true
        },
        "purposes": [
          "球友",
          "尋找伴侶"
        ],
        "wants": [
          {
            "tag": "羽球",
            "w": 100,
            "kind": "hobby"
          },
          {
            "tag": "健身",
            "w": 80,
            "kind": "interest"
          },
          {
            "tag": "健身指導",
            "w": 60,
            "kind": "ability"
          }
        ]
      }
    },
    {
      "name": "吳孟儒",
      "nickname": "儒儒",
      "email": "demo.ru@example.com",
      "age": 38,
      "height": 174,
      "weight": 68,
      "zodiac": "水瓶座",
      "marital": "離婚",
      "relationship": "沒有交往對象",
      "city": "高雄",
      "bio": "自由接案設計師。一個人旅行久了，想試試有人同行。",
      "purposes": [
        "旅伴",
        "認識新朋友",
        "看展看戲"
      ],
      "abilities": [
        "設計繪圖",
        "攝影",
        "剪影片",
        "日文流利",
        "開車"
      ],
      "interests": [
        "旅行",
        "看展覽",
        "攝影",
        "聽音樂",
        "品酒",
        "手作DIY"
      ],
      "hobbies": [
        "攝影",
        "潛水",
        "露營",
        "模型公仔"
      ],
      "prefs": {
        "age": {
          "any": false,
          "min": 28,
          "max": 45
        },
        "height": {
          "any": true
        },
        "weight": {
          "any": true
        },
        "zodiac": {
          "any": true
        },
        "marital": {
          "any": true
        },
        "relationship": {
          "any": true
        },
        "purposes": [
          "旅伴",
          "看展看戲"
        ],
        "wants": [
          {
            "tag": "旅行",
            "w": 100,
            "kind": "interest"
          },
          {
            "tag": "看展覽",
            "w": 80,
            "kind": "interest"
          },
          {
            "tag": "攝影",
            "w": 80,
            "kind": "interest"
          },
          {
            "tag": "日文流利",
            "w": 40,
            "kind": "ability"
          }
        ]
      }
    },
    {
      "name": "蔡佩珊",
      "nickname": "珊珊",
      "email": "demo.shan@example.com",
      "age": 35,
      "height": 160,
      "weight": 48,
      "zodiac": "天秤座",
      "marital": "未婚",
      "relationship": "曖昧中",
      "city": "高雄",
      "bio": "咖啡店主理人。喜歡展覽、老電影、和不趕時間的旅行。",
      "purposes": [
        "旅伴",
        "看展看戲",
        "認識新朋友"
      ],
      "abilities": [
        "咖啡手沖",
        "調酒",
        "英文流利",
        "行程規劃"
      ],
      "interests": [
        "看展覽",
        "看電影",
        "旅行",
        "咖啡",
        "品酒",
        "聽音樂"
      ],
      "hobbies": [
        "攝影",
        "手沖咖啡",
        "品茶",
        "劇本殺"
      ],
      "prefs": {
        "age": {
          "any": false,
          "min": 30,
          "max": 48
        },
        "height": {
          "any": true
        },
        "weight": {
          "any": true
        },
        "zodiac": {
          "any": true
        },
        "marital": {
          "any": true
        },
        "relationship": {
          "any": true
        },
        "purposes": [
          "旅伴",
          "看展看戲"
        ],
        "wants": [
          {
            "tag": "看展覽",
            "w": 100,
            "kind": "interest"
          },
          {
            "tag": "旅行",
            "w": 80,
            "kind": "interest"
          },
          {
            "tag": "咖啡",
            "w": 60,
            "kind": "interest"
          },
          {
            "tag": "攝影",
            "w": 60,
            "kind": "interest"
          }
        ]
      }
    },
    {
      "name": "鄭凱文",
      "nickname": "Kevin",
      "email": "demo.kev@example.com",
      "age": 42,
      "height": 178,
      "weight": 80,
      "zodiac": "摩羯座",
      "marital": "未婚",
      "relationship": "沒有交往對象",
      "city": "新竹",
      "bio": "半導體業。想找人下棋、偶爾一起吃頓好的。",
      "purposes": [
        "認識新朋友",
        "飯友",
        "牌搭子"
      ],
      "abilities": [
        "圍棋",
        "象棋",
        "程式設計",
        "理財投資",
        "開車"
      ],
      "interests": [
        "投資理財",
        "閱讀",
        "美食探店",
        "天文觀星"
      ],
      "hobbies": [
        "圍棋",
        "象棋",
        "撲克德州",
        "釣魚"
      ],
      "prefs": {
        "age": {
          "any": false,
          "min": 30,
          "max": 50
        },
        "height": {
          "any": true
        },
        "weight": {
          "any": true
        },
        "zodiac": {
          "any": true
        },
        "marital": {
          "any": true
        },
        "relationship": {
          "any": true
        },
        "purposes": [
          "飯友",
          "認識新朋友"
        ],
        "wants": [
          {
            "tag": "圍棋",
            "w": 80,
            "kind": "hobby"
          },
          {
            "tag": "閱讀",
            "w": 60,
            "kind": "interest"
          },
          {
            "tag": "投資理財",
            "w": 60,
            "kind": "interest"
          }
        ]
      }
    },
    {
      "name": "許雅婷",
      "nickname": "婷婷",
      "email": "demo.ting@example.com",
      "age": 26,
      "height": 168,
      "weight": 55,
      "zodiac": "牡羊座",
      "marital": "未婚",
      "relationship": "沒有交往對象",
      "city": "台南",
      "bio": "小學老師。養兩隻貓，週末喜歡帶著相機亂晃。",
      "purposes": [
        "認識新朋友",
        "寵物同好",
        "旅伴"
      ],
      "abilities": [
        "唱歌",
        "樂器演奏",
        "急救證照"
      ],
      "interests": [
        "養寵物",
        "攝影",
        "旅行",
        "手作DIY",
        "聽音樂",
        "追劇"
      ],
      "hobbies": [
        "攝影",
        "KTV",
        "拼圖",
        "爬山"
      ],
      "prefs": {
        "age": {
          "any": false,
          "min": 24,
          "max": 36
        },
        "height": {
          "any": true
        },
        "weight": {
          "any": true
        },
        "zodiac": {
          "any": true
        },
        "marital": {
          "any": true
        },
        "relationship": {
          "any": true
        },
        "purposes": [
          "認識新朋友",
          "寵物同好"
        ],
        "wants": [
          {
            "tag": "養寵物",
            "w": 100,
            "kind": "interest"
          },
          {
            "tag": "攝影",
            "w": 80,
            "kind": "interest"
          },
          {
            "tag": "旅行",
            "w": 60,
            "kind": "interest"
          }
        ]
      }
    },
    {
      "name": "周世豪",
      "nickname": "豪哥",
      "email": "demo.hao@example.com",
      "age": 47,
      "height": 172,
      "weight": 78,
      "zodiac": "金牛座",
      "marital": "已婚",
      "relationship": "不便透露",
      "city": "桃園",
      "bio": "做工程的。下班想打球流汗，週末偶爾摸兩圈。",
      "purposes": [
        "球友",
        "牌搭子",
        "飯友"
      ],
      "abilities": [
        "水電修繕",
        "開車",
        "麻將",
        "球類指導"
      ],
      "interests": [
        "看球賽",
        "健身",
        "美食探店",
        "釣魚"
      ],
      "hobbies": [
        "籃球",
        "麻將",
        "釣魚",
        "撞球",
        "看球賽"
      ],
      "prefs": {
        "age": {
          "any": false,
          "min": 35,
          "max": 60
        },
        "height": {
          "any": true
        },
        "weight": {
          "any": true
        },
        "zodiac": {
          "any": true
        },
        "marital": {
          "any": true
        },
        "relationship": {
          "any": true
        },
        "purposes": [
          "球友",
          "牌搭子"
        ],
        "wants": [
          {
            "tag": "籃球",
            "w": 80,
            "kind": "hobby"
          },
          {
            "tag": "麻將",
            "w": 60,
            "kind": "hobby"
          },
          {
            "tag": "看球賽",
            "w": 60,
            "kind": "interest"
          }
        ]
      }
    },
    {
      "name": "何宜庭",
      "nickname": "庭庭",
      "email": "demo.tin@example.com",
      "age": 33,
      "height": 166,
      "weight": 53,
      "zodiac": "雙魚座",
      "marital": "未婚",
      "relationship": "沒有交往對象",
      "city": "台北",
      "bio": "護理師。輪班族，找得到一起吃宵夜的人就很幸福。",
      "purposes": [
        "飯友",
        "聊天談心",
        "尋找伴侶"
      ],
      "abilities": [
        "急救證照",
        "下廚",
        "唱歌"
      ],
      "interests": [
        "美食探店",
        "烹飪",
        "追劇",
        "旅行",
        "瑜伽"
      ],
      "hobbies": [
        "KTV",
        "爬山",
        "手沖咖啡",
        "拼圖"
      ],
      "prefs": {
        "age": {
          "any": false,
          "min": 30,
          "max": 45
        },
        "height": {
          "any": true
        },
        "weight": {
          "any": true
        },
        "zodiac": {
          "any": true
        },
        "marital": {
          "any": false,
          "list": [
            "未婚",
            "離婚"
          ]
        },
        "relationship": {
          "any": false,
          "list": [
            "沒有交往對象"
          ]
        },
        "purposes": [
          "飯友",
          "尋找伴侶",
          "聊天談心"
        ],
        "wants": [
          {
            "tag": "美食探店",
            "w": 100,
            "kind": "interest"
          },
          {
            "tag": "烹飪",
            "w": 60,
            "kind": "interest"
          },
          {
            "tag": "下廚",
            "w": 80,
            "kind": "ability"
          }
        ]
      }
    }
  ];
}
