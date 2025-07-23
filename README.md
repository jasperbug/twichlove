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

### 📊 視覺化與統計
- 📈 **美觀進度條**: 垂直好感度進度條，白色外框透明背景，適合OBS
- 🌐 **WebSocket 即時同步**: 進度條數據即時更新到網頁界面
- 📋 **多平台統計**: 提供詳細的聊天分析統計資訊
- 🔄 **進度管理**: 支援手動重置和完全清空歷史記錄

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
│  │ 訊息過濾器   │  │ 進度控制器   │  │ 統計分析     │               │
│  │ (防機器人)  │  │ (WebSocket) │  │   模組      │               │
│  └─────────────┘  └─────────────┘  └─────────────┘               │
└─────────────────────────────────────────────────────────────────┘
                               │
                               v
                    ┌─────────────────┐
                    │   HTML 進度條   │
                    │  (視覺化介面)   │
                    └─────────────────┘
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
- 好感度數值自動計算與調整
- WebSocket 服務器（埠號 8080）
- 美觀的垂直進度條界面
- 透明背景支援（適合 OBS）
- 優雅的錯誤處理與重連機制

✅ **進階功能:**
- YouTube SuperChat 付費留言加成
- 多平台統計與分析報表
- 自定義關鍵字規則
- 頻道專屬貼圖過濾
- 即時數據同步
- 響應式進度條動畫
- 聊天頻率統計

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

## API 說明

### 環境變數
- `OPENAI_API_KEY`: OpenAI API 金鑰（必需）

### WebSocket 端點
- 本地服務器: `ws://localhost:8080`
- 資料格式: JSON `{"progress": 0-100, "sentiment": "positive/negative/neutral"}`

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
📊 過濾率: 19%
========================
```

### 多平台監控
```
🚀 啟動多平台聊天室好感度分析器
📺 監控平台: Twitch: shroud, YouTube: UCOsFUU8EtJGDd6-AouF_MwQ
💬 總訊息數: 1,234
📈 平均進度: 28%
🔗 活躍連接: 2 個平台
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
