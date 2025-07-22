# Twitch 聊天室好感度控制器 💕

這是一個即時監控 Twitch 聊天室訊息並控制好感度進度條的完整系統。程式會分析聊天內容的情感傾向，自動調整視覺化的好感度進度條，適合直播主用來與觀眾互動。

## 主要功能

- 🔗 **即時聊天監控**: 連接 Twitch IRC WebSocket，即時接收聊天訊息
- 🧠 **智能情感分析**: 使用 OpenAI GPT-4.1-mini 分析訊息情感，可以為主播定制
- 📊 **視覺化進度條**: 美觀的垂直好感度進度條，白色外框透明背景，適合OBS直播
- 🎯 **訊息過濾**: 自動過濾機器人訊息、貼圖和重複內容
- 🌐 **WebSocket 服務**: 即時同步進度條數據到網頁界面
- 📈 **統計報表**: 提供詳細的聊天分析統計資訊
- 🔄 **進度管理**: 支援手動重置和完全清空歷史記錄

## 系統需求

- Node.js 16.0 或以上版本
- OpenAI API Key（用於情感分析）
- 穩定的網路連接

## 安裝步驟

1. 複製專案到本地：
```bash
git clone <repository-url>
cd twitch-chat-progress-controller
```

2. 安裝相依套件：
```bash
npm install
```

3. 設定環境變數：
建立 `.env` 檔案並加入你的 OpenAI API Key：
```
OPENAI_API_KEY=your_openai_api_key_here
```

## 使用方法

### 基本使用
```bash
# 啟動並連接到指定頻道
node twitch-chat-controller.js 頻道名稱

# 連接到主播「你家蟲子」的頻道
node twitch-chat-controller.js 你家蟲子

# 使用預設測試頻道
npm test
```

### 進度條重置
```bash
# 保留歷史記錄的重置（進度歸零）
node reset-progress.js

# 完全清空所有記錄
node full-reset.js
```

### 實際範例
```bash
# 連接到主播頻道
node twitch-chat-controller.js 你家蟲子
node twitch-chat-controller.js ninja
node twitch-chat-controller.js pokimane
```

### 在 OBS 中使用

1. 啟動程式連接到聊天室
2. 在 OBS 中新增「瀏覽器來源」
3. 設定 URL 為：`file:///完整路徑/vertical-progress-bar.html`
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
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Twitch IRC    │ →  │  訊息情感分析器   │ →  │   進度條控制器   │
│   WebSocket     │    │   (OpenAI API)   │    │  (WebSocket)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                       │
         v                        v                       v
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   訊息過濾器     │    │    統計分析      │    │   HTML 進度條   │
│  (防機器人)     │    │     模組        │    │  (視覺化介面)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 已實現功能

✅ **核心功能:**
- Twitch IRC WebSocket 連接
- 即時聊天訊息接收與解析
- OpenAI 驅動的情感分析
- 智能訊息過濾（機器人、重複訊息、貼圖）
- 好感度數值自動計算與調整
- WebSocket 服務器（埠號 8080）
- 美觀的垂直進度條界面
- 透明背景支援（適合 OBS）
- 統計資訊與分析報表
- 優雅的錯誤處理與重連機制

✅ **進階功能:**
- 自定義關鍵字規則
- 頻道專屬貼圖過濾
- 即時數據同步
- 響應式進度條動畫
- 聊天頻率統計

## 檔案結構

```
├── twitch-chat-controller.js    # 主控制程式
├── sentiment-analyzer.js        # 情感分析模組 (GPT-4.1-mini)
├── progress-controller.js       # 進度條控制邏輯  
├── websocket-server.js          # WebSocket 服務器
├── message-filter.js            # 訊息過濾器
├── vertical-progress-bar.html   # 進度條視覺界面 (白框透明背景)
├── progress-data.json           # 進度數據儲存
├── reset-progress.js            # 進度重置腳本
├── full-reset.js               # 完全清空腳本
├── package.json                 # 專案配置
└── .env                        # 環境變數 (需自建)
```

## API 說明

### 環境變數
- `OPENAI_API_KEY`: OpenAI API 金鑰（必需）

### WebSocket 端點
- 本地服務器: `ws://localhost:8080`
- 資料格式: JSON `{"progress": 0-100, "sentiment": "positive/negative/neutral"}`

## 技術規格

- **通訊協議**: Twitch IRC over WebSocket
- **連接地址**: `wss://irc-ws.chat.twitch.tv:443`
- **認證方式**: 匿名連接（無需 OAuth）
- **情感分析**: OpenAI GPT-4.1-mini-2025-04-14 模型
- **前端框架**: 原生 HTML/CSS/JavaScript
- **即時通訊**: WebSocket (ws 套件)
- **環境管理**: dotenv

## 使用範例輸出

```
🚀 正在啟動 Twitch 聊天好感度控制器...
📡 WebSocket 服務器已啟動在埠號 8080
🔗 正在連接到 Twitch 聊天室: 你家蟲子
✅ WebSocket 連接已建立
🎯 已加入聊天室: 你家蟲子

💬 觀眾A: 蟲子今天好帥！ → 😊 正面 (+5)
💬 觀眾B: 老蟲唱歌超好聽 → 😊 正面 (+4)  
💬 觀眾C: 蟲主播身高185 → 😞 負面 (-3) [檢測到貶抑言論]
💬 觀眾D: 愛你蟲子！ → 😊 正面 (+5)

📊 統計資訊 (運行 5分鐘):
   - 總訊息數: 1,234
   - 已分析: 856 (69.4%)
   - 已過濾: 378 (30.6%)
   - 當前好感度: 23/100
   - 平均每分鐘: 247 則訊息

✨ 好感度進度條已同步更新！（白色外框，清晰可見）
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

**Q: 無法連接到聊天室**
A: 檢查頻道名稱是否正確，確保網路連接正常

**Q: OpenAI API 錯誤**
A: 確認 `.env` 檔案中的 API Key 正確，並檢查 API 額度

**Q: 進度條不顯示**
A: 確認 WebSocket 服務器正在運行 (埠號 8080)，檢查防火牆設定

**Q: OBS 中看不到進度條**
A: 確保勾選了「透明背景」選項，調整瀏覽器來源的寬高，使用file://協議

**Q: 如何重置進度？**
A: 使用 `node reset-progress.js` 重置進度，或 `node full-reset.js` 完全清空

**Q: 文字看不清楚**
A: 已優化為白色外框和大字體，確保在各種背景下都清晰可見

### 除錯模式
```bash
# 啟用詳細日誌
DEBUG=true node twitch-chat-controller.js 頻道名稱
```

## 開發貢獻

歡迎提交 Issue 和 Pull Request！

## 授權條款

MIT License - 詳見 LICENSE 檔案

---

**提示**: 首次使用建議先用 `npm test` 測試連接，確認所有功能正常後再用於實際直播。

按 `Ctrl+C` 可安全關閉程式。
