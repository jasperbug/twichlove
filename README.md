# 多平台聊天室好感度控制器 💕

這是一個支援 **Twitch** 和 **YouTube** 雙平台的即時聊天監控與好感度分析系統。程式會分析聊天內容的情感傾向，自動調整視覺化的好感度進度條，適合直播主用來與觀眾互動，支援同時監控多個平台。

## 主要功能

### 🌟 多平台支援
- 📺 **Twitch 直播**: 連接 Twitch IRC WebSocket，即時接收聊天訊息
- 🎬 **YouTube 直播**: 支援 YouTube Live Chat 監控，包含 SuperChat 付費留言
- ⚡ **雙平台同步**: 可同時監控兩個平台，統一好感度進度條

### 🧠 智能分析
- 🤖 **GPT-4 情感分析**: 使用 OpenAI GPT-4.1-mini 分析訊息情感
- 💰 **SuperChat 加成**: YouTube 付費留言自動額外加分
- 🎯 **智能過濾**: 自動過濾機器人訊息、貼圖和重複內容
- 🎭 **主播人設**: 支援自定義主播個性設定，影響情感分析結果
- 📝 **關鍵字規則**: 可自定義好感度觸發關鍵字和權重

### 📊 視覺化與統計
- 📈 **七階段情感狀態**: 從極度憤怒到完全沉醉的細緻情感分級系統
- 💝 **情感強度顯示**: 每個階段內0-100%的強度百分比
- 🌐 **WebSocket 即時同步**: 進度條和情感狀態即時更新到網頁界面
- 📋 **多平台統計**: 提供詳細的聊天分析統計資訊
- 🔄 **進度管理**: 支援手動重置和完全清空歷史記錄
- 🎨 **自動回調系統**: 無新訊息時自動往中性狀態回調

## 系統需求

- Node.js 16.0 或以上版本
- OpenAI API Key（用於情感分析）
- 穩定的網路連接
- 對於 YouTube 直播：需要正在進行的直播才能監控聊天

## 安裝步驟

1. 複製專案到本地：
```bash
git clone https://github.com/jasperbug/twichlove
cd twichlove
```

2. 安裝相依套件：
```bash
npm install
```

3. 設定環境變數：
建立 `.env` 檔案並加入你的 API Key 和預設頻道：
```env
# OpenAI API 設定（必需）
OPENAI_API_KEY=your_openai_api_key_here

# 預設頻道設定（選用，設定後可直接執行程式）
TWITCH_CHANNEL=你的Twitch頻道名稱
YOUTUBE_CHANNEL_ID=你的YouTube頻道ID
YOUTUBE_CHANNEL_NAME=你的YouTube頻道名稱

# 進度條控制設定
PROGRESS_UPDATE_INTERVAL=1000
MAX_PROGRESS=100
MIN_PROGRESS=-100

# 自動回調系統設定
AUTO_DECAY_INTERVAL=180000    # 3分鐘無活動後開始回調 (毫秒)
DECAY_RATE_HIGH=3            # 高強度回調幅度 (±50%以上時)
DECAY_RATE_MEDIUM=2          # 中強度回調幅度 (20-50%時)
DECAY_RATE_LOW=1             # 低強度回調幅度 (20%以下時)

# 主播人設配置
STREAMER_PERSONALITY=friendly    # 主播個性: friendly/tsundere/shy/energetic/professional
CUSTOM_KEYWORDS_ENABLED=true     # 啟用自定義關鍵字
STICKER_FILTER_ENABLED=true      # 啟用貼圖過濾

# AI分析設定
OPENAI_MODEL=gpt-4o-mini        # AI模型選擇
ANALYSIS_LANGUAGE=zh-TW         # 分析語言
SENTIMENT_SENSITIVITY=medium    # 情感分析敏感度: low/medium/high
```

## ✨ 七階段情感狀態系統

### 情感分級詳細說明

本系統將聊天室的整體情感分為七個階段，每個階段都有對應的表情符號、顏色和強度百分比：

| 進度範圍 | 情感狀態 | 表情符號 | 顏色 | 描述 |
|---------|---------|---------|------|------|
| `-100% ~ -70%` | **極度憤怒** | 😤 | #8B0000 (深紅) | 極度憤怒/厭惡狀態 |
| `-70% ~ -30%` | **不滿生氣** | 😠 | #FF4500 (橙紅) | 不滿/生氣情緒 |
| `-30% ~ 0%` | **冷淡疏離** | 😐 | #808080 (灰色) | 冷淡/疏離狀態 |
| `0% ~ 30%` | **友善好感** | 😊 | #32CD32 (綠色) | 友善/好感狀態 |
| `30% ~ 70%` | **喜愛迷戀** | 😍 | #FF69B4 (粉紅) | 喜愛/迷戀狀態 |
| `70% ~ 90%` | **深深愛慕** | 💕 | #FF1493 (深粉) | 深深愛慕狀態 |
| `90% ~ 100%` | **完全沉醉** | 💖 | #DC143C (深紅) | 完全沉醉狀態 |

### 情感強度計算

每個階段內都有 **0-100%** 的強度百分比：
- **0%**: 剛進入該階段
- **50%**: 該階段中等強度
- **100%**: 該階段最高強度（即將進入下一階段）

### 自動回調機制

系統具有智能回調功能，3分鐘無新訊息時自動往中性狀態(0%)回調：
- **高強度回調** (±50%以上): 每次回調 3%
- **中強度回調** (20-50%): 每次回調 2%  
- **低強度回調** (20%以下): 每次回調 1%

### 情感狀態轉換示例

```
冷淡疏離 (-15%) → 收到正面訊息 → 友善好感 (5%)
友善好感 (25%) → 收到SuperChat → 喜愛迷戀 (35%)
喜愛迷戀 (60%) → 長時間無訊息 → 自動回調至 (57%)
```

## 🎭 主播人設系統

### 支援的主播人設類型

系統支援多種主播人設，影響AI對訊息的情感分析結果：

#### 1. **友善型 (friendly)** - 預設
- 對正面訊息反應積極
- 對負面訊息較為寬容
- 適合溫和友善的主播

#### 2. **傲嬌型 (tsundere)**
- 對讚美訊息反應較為保守
- 對調侃訊息有特殊加分
- 符合傲嬌角色設定

#### 3. **害羞型 (shy)**
- 對直接讚美反應強烈
- 對過於熱情的訊息會降低分數
- 適合內向害羞的主播

#### 4. **活力型 (energetic)**
- 對所有正面訊息都有高分加成
- 反應較為激烈
- 適合活潑外向的主播

#### 5. **專業型 (professional)**
- 注重訊息內容品質
- 對無意義訊息過濾更嚴格
- 適合知識型/教學型主播

### 人設配置方法

在 `.env` 檔案中設定：
```env
STREAMER_PERSONALITY=tsundere
```

或在程式啟動時指定：
```bash
STREAMER_PERSONALITY=shy npm start
```

## 🎯 自定義配置系統

### 貼圖過濾設定

系統可以智能識別和過濾各種貼圖訊息，包括：

#### Twitch 貼圖過濾
- **全域表情符號**: Kappa, PogChamp, LUL 等
- **頻道專屬表情**: 根據頻道自動識別
- **BTTV/FFZ表情**: 第三方表情符號
- **純表情訊息**: 只有表情符號的訊息

#### YouTube 貼圖過濾  
- **系統表情符號**: 😀😂❤️ 等 Unicode 表情符號
- **YouTube 專屬表情**: :youtube_emoji: 格式
- **Super Stickers**: 付費貼圖（但仍會計算付費加成）

#### 貼圖過濾配置
```env
# 啟用貼圖過濾
STICKER_FILTER_ENABLED=true

# 貼圖過濾嚴格程度
STICKER_FILTER_STRICT=medium    # loose/medium/strict

# 允許的表情符號比例（訊息中表情符號佔比）
MAX_EMOJI_RATIO=0.5            # 50%以上表情符號的訊息會被過濾
```

### 自定義關鍵字規則

可以設定特定關鍵字的好感度加成：

#### 關鍵字配置檔案 `keywords-config.json`
```json
{
  "positive_keywords": {
    "超棒": 5,
    "太神了": 4,
    "好可愛": 3,
    "喜歡": 2,
    "不錯": 1
  },
  "negative_keywords": {
    "爛": -3,
    "無聊": -2,
    "不喜歡": -2,
    "差": -1
  },
  "special_keywords": {
    "主播名字": 3,
    "生日快樂": 5,
    "新年快樂": 4
  }
}
```

#### 關鍵字權重設定
```env
CUSTOM_KEYWORDS_ENABLED=true
KEYWORD_WEIGHT_MULTIPLIER=1.5    # 關鍵字權重倍數
KEYWORD_CASE_SENSITIVE=false     # 是否區分大小寫
```

## 使用方法

### 🚀 快速開始

#### ⚡ 超簡單啟動（推薦）
設定好 `.env` 檔案後，只需一個命令：
```bash
# 自動使用 .env 中的預設頻道啟動
npm start                   # 自動雙平台監控（如果兩個頻道都有設定）

# 其他簡化命令
npm run both               # 明確指定雙平台監控
npm run twitch             # 只監控 Twitch（使用預設頻道）
npm run youtube            # 只監控 YouTube（使用預設頻道）
```

#### 🎯 指定頻道監控
```bash
# 覆蓋預設設定，監控指定頻道
npm run twitch buuuggyy
npm run youtube UCOsFUU8EtJGDd6-AouF_MwQ
npm run multi both buuuggyy UCOsFUU8EtJGDd6-AouF_MwQ

# 測試頻道
npm test                    # Twitch 測試
npm run test-youtube        # YouTube 測試
```

#### 🔧 直接執行檔案
```bash
# 使用預設頻道直接執行
node twitch-chat-controller.js
node youtube-chat-controller.js  
node multi-platform-controller.js

# 指定頻道執行
node twitch-chat-controller.js shroud
node youtube-chat-controller.js UC1opHUrw8rvnsadT-iGp7Cg
```

### 📺 獲取 YouTube 頻道 ID
要監控 YouTube 直播，你需要頻道 ID（不是頻道名稱）：
1. 前往 YouTube 頻道頁面
2. 查看網址中的 `UC` 開頭的 ID
3. 或使用線上工具：`https://commentpicker.com/youtube-channel-id.php`

### 進度條重置
```bash
# 保留歷史記錄的重置（進度歸零）
node reset-progress.js

# 完全清空所有記錄
node full-reset.js
```

### 💡 實際使用範例

#### 🏆 推薦使用方式（設定 .env 後）
```bash
# 步驟1: 設定 .env 檔案
# TWITCH_CHANNEL=你家蟲子
# YOUTUBE_CHANNEL_ID=UCUSdbuXhXyu84cyRkAvWq7A

# 步驟2: 直接啟動！
npm start                   # 自動雙平台監控
```

#### 🎮 其他使用範例
```bash
# 監控知名 Twitch 主播
npm run twitch shroud
npm run twitch ninja
npm run twitch pokimane

# 監控 YouTube 直播主
npm run youtube UC1opHUrw8rvnsadT-iGp7Cg    # 志祺七七
npm run youtube UCFmjlgMwPMX5rrQ5Waa0bHg    # 阿滴英文

# 同時監控雙平台（直播主常用）
npm run multi both shroud UC1opHUrw8rvnsadT-iGp7Cg

# 使用預設頻道的快速監控
npm run twitch             # 使用 .env 中的 Twitch 頻道
npm run youtube            # 使用 .env 中的 YouTube 頻道
```

### 在 OBS 中使用

1. 啟動程式連接到聊天室
2. 在 OBS 中新增「瀏覽器來源」
3. 設定 URL 為：`localhost:8080`
4. 設定寬度：120px，高度：600px
5. 勾選「透明背景」選項
6. 進度條具有白色外框，文字清晰可見

### 手動控制
在網頁界面中可以使用：
- **按鈕控制**: -5%, -3%, -1%, Reset, +1%, +3%, +5%
- **鍵盤快捷鍵**:
  - `0`: 重置為0%
  - `1-9`: 增加對應數值
  - `↑`: +1%
  - `↓`: -1%
  - `+/=`: +5%
  - `-/_`: -5%

## 系統架構

```
┌─────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│   Twitch IRC    │    │  YouTube Chat   │    │  訊息情感分析器   │
│   WebSocket     │    │     監控        │ →  │   (OpenAI API)   │
└─────────────────┘    └─────────────────┘    └──────────────────┘
         │                       │                       │
         v                       v                       v
┌─────────────────────────────────────────────────────────────────┐
│                    多平台統一控制器                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│  │ 智能過濾器   │  │ 情感分析     │  │ 進度控制器   │               │
│  │ 貼圖/機器人  │  │ 主播人設     │  │ 七階段狀態   │               │
│  └─────────────┘  └─────────────┘  └─────────────┘               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│  │ 關鍵字系統   │  │ 自動回調     │  │ 統計分析     │               │
│  │ 自定義規則   │  │   機制      │  │   模組      │               │
│  └─────────────┘  └─────────────┘  └─────────────┘               │
└─────────────────────────────────────────────────────────────────┘
                               │
                               v
                    ┌─────────────────┐
                    │ 情感狀態進度條   │
                    │ 😤😠😐😊😍💕💖  │
                    │  (WebSocket)    │
                    └─────────────────┘
```

### 情感分析流程
```
聊天訊息 → 貼圖過濾 → 主播人設分析 → 關鍵字匹配 → 情感分數
    ↓
七階段狀態計算 → 強度百分比 → WebSocket廣播 → 進度條更新
    ↓
自動回調計時器重置 → 3分鐘後無活動 → 自動往中性回調
```

## 已實現功能

✅ **多平台支援:**
- Twitch IRC WebSocket 連接
- YouTube Live Chat API 整合
- 雙平台同時監控
- 統一進度條控制
- 跨平台統計資訊整合

✅ **核心功能:**
- 即時聊天訊息接收與解析
- OpenAI GPT-4 驅動的情感分析
- 智能訊息過濾（機器人、重複訊息、貼圖）
- 七階段情感狀態系統（😤😠😐😊😍💕💖）
- 情感強度百分比計算（0-100%）
- WebSocket 服務器（埠號 8080）
- 美觀的垂直進度條界面
- 透明背景支援（適合 OBS）
- 優雅的錯誤處理與重連機制

✅ **進階功能:**
- YouTube SuperChat 付費留言加成
- 多平台統計與分析報表
- 主播人設系統（5種個性類型）
- 自定義關鍵字規則和權重
- 頻道專屬貼圖過濾
- 自動回調機制（3分鐘無活動）
- 即時數據同步
- 響應式進度條動畫
- 聊天頻率統計
- 情感狀態變化檢測

## 檔案結構

```
├── 🎯 主控制器
│   ├── multi-platform-controller.js     # 多平台統一控制器
│   ├── twitch-chat-controller.js        # Twitch 聊天控制器
│   └── youtube-chat-controller.js       # YouTube 聊天控制器
│
├── 🧠 核心模組
│   ├── sentiment-analyzer.js            # 情感分析模組 (GPT-4.1-mini)
│   ├── progress-controller.js           # 進度條控制邏輯  
│   ├── websocket-server.js              # WebSocket 服務器
│   └── message-filter.js                # 訊息過濾器
│
├── 🎨 介面與數據
│   ├── vertical-progress-bar.html       # 進度條視覺界面 (白框透明背景)
│   ├── progress-data.json               # 進度數據儲存
│   ├── reset-progress.js                # 進度重置腳本
│   └── full-reset.js                   # 完全清空腳本
│
└── ⚙️  配置檔案
    ├── package.json                     # 專案配置與依賴
    ├── .env                            # 環境變數 (需自建)
    └── README.md                       # 專案說明文件
```

## 🔧 API 參考

### 環境變數完整列表

#### 基本設定
- `OPENAI_API_KEY`: OpenAI API 金鑰（必需）
- `TWITCH_CHANNEL`: 預設 Twitch 頻道名稱
- `YOUTUBE_CHANNEL_ID`: 預設 YouTube 頻道 ID
- `YOUTUBE_CHANNEL_NAME`: 預設 YouTube 頻道名稱

#### 進度控制
- `PROGRESS_UPDATE_INTERVAL`: 進度更新間隔（毫秒，預設：1000）
- `MAX_PROGRESS`: 最大進度值（預設：100）
- `MIN_PROGRESS`: 最小進度值（預設：-100）

#### 自動回調系統
- `AUTO_DECAY_INTERVAL`: 自動回調間隔（毫秒，預設：180000）
- `DECAY_RATE_HIGH`: 高強度回調幅度（預設：3）
- `DECAY_RATE_MEDIUM`: 中強度回調幅度（預設：2）
- `DECAY_RATE_LOW`: 低強度回調幅度（預設：1）

#### 主播人設
- `STREAMER_PERSONALITY`: 主播個性類型（預設：friendly）
  - `friendly`: 友善型
  - `tsundere`: 傲嬌型
  - `shy`: 害羞型
  - `energetic`: 活力型
  - `professional`: 專業型

#### 過濾系統
- `STICKER_FILTER_ENABLED`: 啟用貼圖過濾（預設：true）
- `STICKER_FILTER_STRICT`: 過濾嚴格程度（loose/medium/strict）
- `MAX_EMOJI_RATIO`: 表情符號比例上限（預設：0.5）
- `CUSTOM_KEYWORDS_ENABLED`: 啟用自定義關鍵字（預設：true）
- `KEYWORD_WEIGHT_MULTIPLIER`: 關鍵字權重倍數（預設：1.5）
- `KEYWORD_CASE_SENSITIVE`: 關鍵字區分大小寫（預設：false）

#### AI 分析
- `OPENAI_MODEL`: AI 模型選擇（預設：gpt-4o-mini）
- `ANALYSIS_LANGUAGE`: 分析語言（預設：zh-TW）
- `SENTIMENT_SENSITIVITY`: 情感分析敏感度（low/medium/high）

### WebSocket API

#### 連接端點
- **本地服務器**: `ws://localhost:8080`
- **連接協議**: WebSocket

#### 傳送資料格式
```json
{
  "progress": 45,
  "currentEmotion": {
    "name": "喜愛迷戀",
    "emoji": "😍",
    "color": "#FF69B4",
    "intensity": 38,
    "range": [30, 70]
  },
  "oldEmotion": {
    "name": "友善好感",
    "emoji": "😊",
    "color": "#32CD32",
    "intensity": 83,
    "range": [0, 30]
  },
  "emotionChanged": true,
  "change": 15,
  "platformStats": {
    "twitch": {
      "channel": "shroud",
      "messageCount": 1234
    },
    "youtube": {
      "channel": "頻道名稱",
      "messageCount": 567
    }
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### 手動控制 API
- **端點**: `POST http://localhost:8080/api/progress`
- **Content-Type**: `application/json`

**調整進度**：
```json
{
  "action": "adjust",
  "amount": 5
}
```

**設定特定進度**：
```json
{
  "action": "set",
  "value": 50
}
```

**重置進度**：
```json
{
  "action": "reset"
}
```

**回應格式**：
```json
{
  "success": true,
  "oldProgress": 45,
  "newProgress": 50,
  "change": 5,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 配置檔案

#### `keywords-config.json` 結構
```json
{
  "positive_keywords": {
    "關鍵字": 權重值(數字)
  },
  "negative_keywords": {
    "關鍵字": 權重值(負數)
  },
  "special_keywords": {
    "特殊關鍵字": 權重值
  },
  "personality_modifiers": {
    "friendly": {
      "positive_multiplier": 1.0,
      "negative_multiplier": 0.8
    },
    "tsundere": {
      "positive_multiplier": 0.7,
      "negative_multiplier": 1.2
    }
  }
}
```

#### `progress-data.json` 結構
```json
{
  "currentProgress": 45,
  "lastUpdated": "2024-01-01T12:00:00.000Z",
  "history": [
    {
      "timestamp": "2024-01-01T12:00:00.000Z",
      "oldProgress": 40,
      "newProgress": 45,
      "change": 5,
      "metadata": {
        "platform": "Twitch",
        "channel": "shroud"
      }
    }
  ]
}
```

## 技術規格

### 🔌 Twitch 整合
- **通訊協議**: Twitch IRC over WebSocket
- **連接地址**: `wss://irc-ws.chat.twitch.tv:443`
- **認證方式**: 匿名連接（無需 OAuth）

### 🎬 YouTube 整合
- **API 套件**: `youtube-chat` (非官方)
- **支援功能**: Live Chat 監控、SuperChat 識別
- **限制**: 需要正在進行的直播，非官方 API 可能有使用限制

### 🧠 核心技術
- **情感分析**: OpenAI GPT-4.1-mini 模型
- **前端框架**: 原生 HTML/CSS/JavaScript
- **即時通訊**: WebSocket (ws 套件)
- **環境管理**: dotenv
- **多平台協調**: 統一 WebSocket 服務器

## 使用範例輸出

### Twitch 監控
```
🚀 啟動 Twitch 聊天室好感度分析器
📺 目標頻道: shroud
🤖 情感分析: GPT-4o
📊 進度控制: 已啟用
==================================================
🚀 WebSocket 服務器啟動成功
📺 進度條網址: http://localhost:8080
🔗 WebSocket 端點: ws://localhost:8080
✅ WebSocket 連接已建立
🎯 已加入聊天室: shroud

💬 [觀眾A]: shroud is insane! → 😊 正面 (+4)
💬 [觀眾B]: nice shot! → 😊 正面 (+3)  
💬 [觀眾C]: lag again... → 😞 負面 (-2)
💬 [觀眾D]: GG 🔥 → 😊 正面 (+2)

📊 ===== 統計資訊 =====
⏰ 運行時間: 120秒
💬 訊息總數: 456
🚫 已過濾: 78
🔍 分析總數: 378
📈 當前進度: 23%
💝 情感狀態: 😊 友善好感 (強度: 77%)
📊 過濾率: 17%
========================
```

### YouTube 監控
```
🚀 啟動 YouTube 聊天室好感度分析器
📺 目標頻道 ID: UCOsFUU8EtJGDd6-AouF_MwQ
🤖 情感分析: GPT-4o
📊 進度控制: 已啟用
==================================================
✅ 已成功連接到 YouTube 聊天室

💬 [觀眾A]: 超棒！ → 😊 正面 (+3)
💸 [SuperChat] 觀眾B: 謝謝分享 (NT$100) → 😊 正面 (+4+1)
💬 [觀眾C]: 看不懂啊啊啊 → 😐 中性 (0)

📊 ===== YouTube 統計資訊 =====
⏰ 運行時間: 60秒
💬 訊息總數: 234
🚫 已過濾: 45
🔍 分析總數: 189
📈 當前進度: 32%
💝 情感狀態: 😍 喜愛迷戀 (強度: 5%)
📊 過濾率: 19%
========================
```

### 多平台監控
```
🚀 啟動多平台聊天室好感度分析器
📺 監控平台: Twitch: shroud, YouTube: UCOsFUU8EtJGDd6-AouF_MwQ
💬 總訊息數: 1,234
🎯 統一進度: 28% (平等權重)
💝 情感狀態: 😊 友善好感 (強度: 93%)
🔗 活躍連接: 2 個平台

🔄 情感狀態變化記錄:
✨ 情感狀態改變: 😐 冷淡疏離 → 😊 友善好感
✨ 情感狀態改變: 😊 友善好感 → 😍 喜愛迷戀
📉 執行自動回調: 35% → 32% (-3%)
```

## 進度條重置

重置進度條有兩種方式：

### 保留歷史記錄重置
```bash
node reset-progress.js
```
輸出：
```
載入進度: -43%
重置前進度: -43
進度變化: -43% → 0% (+43%)
重置後進度: 0
歷史記錄數量: 21
✅ 進度已重置為0
```

### 完全清空重置
```bash
node full-reset.js
```
輸出：
```
執行完全重置...
✅ 完全重置成功！
- 進度: 0%
- 歷史記錄: 已清空
```

## 故障排除

### 常見問題

#### 🔌 連接問題
**Q: 執行 `npm start` 提示找不到頻道**
A: 請先在 `.env` 檔案中設定 `TWITCH_CHANNEL` 和/或 `YOUTUBE_CHANNEL_ID`

**Q: 無法連接到 Twitch 聊天室**
A: 檢查頻道名稱是否正確（不需要 # 符號），確保網路連接正常

**Q: 無法連接到 YouTube 聊天室**
A: 確認頻道 ID 正確、直播正在進行中，YouTube 非官方 API 可能有限制

**Q: 多平台監控只有一個平台有效**
A: 檢查兩個平台是否都在直播，確認頻道名稱和 ID 都正確

#### 🤖 AI 分析問題
**Q: OpenAI API 錯誤**
A: 確認 `.env` 檔案中的 API Key 正確，檢查 API 額度和網路連接

**Q: 情感分析不準確**
A: GPT 模型可能對特定語言或文化梗理解有限，可調整 prompt 提示詞

#### 📊 進度條問題
**Q: 進度條不顯示**
A: 確認 WebSocket 服務器運行 (埠號 8080)，檢查防火牆設定

**Q: OBS 中看不到進度條**
A: 勾選「透明背景」選項，調整寬高為 120x600px

**Q: 如何重置進度？**
A: 使用 `node reset-progress.js` 重置進度，或 `node full-reset.js` 完全清空

#### 💰 SuperChat 問題
**Q: SuperChat 沒有額外加分**
A: 確認是 YouTube 直播且 SuperChat 功能正常，檢查程式日誌

#### 🏷️ YouTube 頻道 ID 問題
**Q: 如何找到 YouTube 頻道 ID？**
A: 
1. 前往 YouTube 頻道頁面，查看網址中 UC 開頭的字串
2. 使用線上工具：https://commentpicker.com/youtube-channel-id.php
3. 在瀏覽器開發者工具中搜尋 "channelId"
4. 或觀看直播時，從網址 `watch?v=xxx` 中提取頻道資訊

**Q: .env 檔案設定後還是提示找不到頻道？**
A: 
1. 確認 `.env` 檔案在專案根目錄
2. 檢查變數名稱是否正確：`TWITCH_CHANNEL`、`YOUTUBE_CHANNEL_ID`
3. 確認沒有多餘的空格或引號
4. 重新啟動程式讓環境變數生效

### 除錯模式
```bash
# Twitch 除錯模式
DEBUG=true node twitch-chat-controller.js 頻道名稱

# YouTube 除錯模式
DEBUG=true node youtube-chat-controller.js 頻道ID

# 多平台除錯模式
DEBUG=true node multi-platform-controller.js both 頻道名稱 頻道ID
```

## 開發貢獻

歡迎提交 Issue 和 Pull Request！

## 授權條款

MIT License - 詳見 LICENSE 檔案

---

## 🎯 使用建議

### 首次使用
1. **設定環境**: 在 `.env` 檔案中設定你的頻道資訊
2. **測試連接**: 執行 `npm start` 測試雙平台連接
3. **確認功能**: 確保情感分析和進度條都正常運作
4. **OBS 設定**: 將進度條加入 OBS 並調整位置
5. **開始直播**: 之後只需 `npm start` 即可啟動

### 直播主推薦設定
```env
# .env 檔案設定範例
TWITCH_CHANNEL=你的頻道名稱
YOUTUBE_CHANNEL_ID=你的YouTube頻道ID
YOUTUBE_CHANNEL_NAME=你的YouTube頻道名稱
```

```bash
# 設定好後，一鍵啟動
npm start                   # 自動雙平台監控
```

### 注意事項
- **預設頻道**: 設定 `.env` 後可省略命令行參數，一鍵啟動
- **YouTube 監控**: 需要正在進行的直播才能監控聊天
- **API 限制**: 非官方 YouTube API 可能有使用限制
- **資料備份**: 建議定期備份 `.env` 和 `progress-data.json`
- **安全關閉**: 按 `Ctrl+C` 可安全關閉程式

**🚀 設定好 `.env` 後，只需 `npm start` 即可享受雙平台即時互動體驗！**
