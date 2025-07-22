const WebSocket = require('ws');
const fs = require('fs');
const SentimentAnalyzer = require('./sentiment-analyzer');
const ProgressController = require('./progress-controller');
const ProgressWebSocketServer = require('./websocket-server');
const MessageFilter = require('./message-filter');
require('dotenv').config();

class TwitchChatController {
    constructor(channel, username = 'justinfan12345') {
        this.channel = channel.toLowerCase();
        this.username = username;
        this.ws = null;
        this.isConnected = false;
        this.messageHandlers = [];
        
        // 初始化 WebSocket 服務器
        this.wsServer = new ProgressWebSocketServer(8080);
        
        // 初始化訊息過濾器
        this.messageFilter = new MessageFilter();
        // 添加此頻道特有的貼圖過濾規則
        this.messageFilter.addEmotePattern(new RegExp(this.channel, 'gi'));
        
        // 初始化情感分析和進度控制
        this.sentimentAnalyzer = new SentimentAnalyzer();
        this.progressController = new ProgressController('./vertical-progress-bar.html', this.wsServer);
        
        // 統計資訊
        this.messageCount = 0;
        this.analysisCount = 0;
        this.filteredCount = 0;
        this.startTime = new Date();
        
        // Twitch IRC WebSocket URL
        this.twitchIRC = 'wss://irc-ws.chat.twitch.tv:443';
    }

    // 連接到 Twitch 聊天室
    async connect() {
        // 先啟動 WebSocket 服務器
        try {
            await this.wsServer.start();
        } catch (error) {
            console.error('WebSocket 服務器啟動失敗:', error);
        }
        
        console.log(`正在連接到 Twitch 聊天室: ${this.channel}`);
        
        this.ws = new WebSocket(this.twitchIRC);
        
        this.ws.on('open', () => {
            console.log('WebSocket 連接已建立');
            
            // 發送 IRC 認證
            this.ws.send(`PASS SCHMOOPIIE`);
            this.ws.send(`NICK ${this.username}`);
            this.ws.send(`JOIN #${this.channel}`);
            
            this.isConnected = true;
            console.log(`已加入聊天室: ${this.channel}`);
        });

        this.ws.on('message', (data) => {
            const message = data.toString();
            this.handleMessage(message);
        });

        this.ws.on('close', () => {
            console.log('WebSocket 連接已關閉');
            this.isConnected = false;
        });

        this.ws.on('error', (error) => {
            console.error('WebSocket 錯誤:', error);
        });
    }

    // 處理接收到的訊息
    handleMessage(rawMessage) {
        console.log('收到原始訊息:', rawMessage);

        // 處理 PING/PONG
        if (rawMessage.startsWith('PING')) {
            this.ws.send('PONG :tmi.twitch.tv');
            return;
        }

        // 解析聊天訊息
        if (rawMessage.includes('PRIVMSG')) {
            const chatMessage = this.parseMessage(rawMessage);
            if (chatMessage) {
                this.messageCount++;
                console.log(`💬 [${chatMessage.username}]: ${chatMessage.text}`);
                
                // 廣播聊天訊息
                this.wsServer.sendChatMessage(chatMessage);
                
                // 進行情感分析和進度調整
                this.processChatMessage(chatMessage);
                
                // 通知所有訊息處理器
                this.messageHandlers.forEach(handler => {
                    try {
                        handler(chatMessage);
                    } catch (error) {
                        console.error('訊息處理器錯誤:', error);
                    }
                });
            }
        }
    }

    // 解析 Twitch IRC 訊息格式
    parseMessage(rawMessage) {
        try {
            // 範例格式: :username!username@username.tmi.twitch.tv PRIVMSG #channel :message text
            const parts = rawMessage.split(' ');
            
            if (parts.length < 4) return null;
            
            const userInfo = parts[0];
            const messageType = parts[1];
            const channel = parts[2];
            
            // 提取用戶名
            const username = userInfo.split('!')[0].substring(1);
            
            // 提取訊息內容
            const messageStart = rawMessage.indexOf(' :', rawMessage.indexOf('PRIVMSG'));
            const text = messageStart !== -1 ? rawMessage.substring(messageStart + 2) : '';
            
            return {
                username: username,
                channel: channel,
                text: text.trim(),
                timestamp: new Date(),
                rawMessage: rawMessage
            };
        } catch (error) {
            console.error('解析訊息失敗:', error);
            return null;
        }
    }

    // 添加訊息處理器
    onMessage(handler) {
        if (typeof handler === 'function') {
            this.messageHandlers.push(handler);
        }
    }

    // 移除訊息處理器
    removeMessageHandler(handler) {
        const index = this.messageHandlers.indexOf(handler);
        if (index > -1) {
            this.messageHandlers.splice(index, 1);
        }
    }

    // 斷開連接
    async disconnect() {
        if (this.ws) {
            this.ws.close();
            this.isConnected = false;
            console.log('已斷開 Twitch 連接');
        }
        
        // 關閉 WebSocket 服務器
        if (this.wsServer) {
            await this.wsServer.stop();
        }
    }

    // 檢查連接狀態
    isConnectionActive() {
        return this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    // 處理聊天訊息進行情感分析
    async processChatMessage(chatMessage) {
        try {
            // 排除機器人和系統訊息
            if (this.isSystemMessage(chatMessage)) {
                return;
            }

            // 過濾訊息內容（移除貼圖等）
            const filterResult = this.messageFilter.filterMessage(chatMessage.text);
            
            console.log(`📝 原始訊息: "${chatMessage.text}"`);
            
            if (!filterResult.shouldAnalyze) {
                this.filteredCount++;
                console.log(`🚫 已過濾: ${filterResult.reason}`);
                if (filterResult.filtered.length > 0) {
                    console.log(`   過濾後: "${filterResult.filtered}"`);
                }
                return;
            }
            
            const messageToAnalyze = filterResult.filtered;
            console.log(`🔍 分析中: "${messageToAnalyze}"`);
            
            // 進行情感分析
            const analysis = await this.sentimentAnalyzer.analyzeMessage(messageToAnalyze);
            this.analysisCount++;
            
            console.log(`📊 分析結果: ${analysis.sentiment} (${analysis.score}) - ${analysis.reason}`);
            
            // 根據分析結果調整進度
            const progressChange = this.progressController.adjustProgressBySentiment(analysis);
            
            // 廣播分析結果（包含過濾資訊）
            this.wsServer.sendAnalysisResult({
                ...analysis,
                originalMessage: chatMessage.text,
                filteredMessage: messageToAnalyze
            }, progressChange);
            
            console.log(`📈 進度更新: ${progressChange.oldProgress}% → ${progressChange.newProgress}% (${progressChange.change > 0 ? '+' : ''}${progressChange.change}%)`);
            
            // 顯示統計資訊
            if (this.analysisCount % 5 === 0) {
                this.showStatistics();
            }
            
        } catch (error) {
            console.error('處理聊天訊息失敗:', error);
        }
    }

    // 判斷是否為系統訊息
    isSystemMessage(chatMessage) {
        // 排除機器人或系統相關用戶
        const systemUsers = ['streamlabs', 'nightbot', 'streamelements', 'moobot'];
        return systemUsers.includes(chatMessage.username.toLowerCase());
    }

    // 顯示統計資訊
    showStatistics() {
        const uptime = Math.round((new Date() - this.startTime) / 1000);
        const progressStats = this.progressController.getStatistics();
        
        console.log('\n📊 ===== 統計資訊 =====');
        console.log(`⏰ 運行時間: ${uptime}秒`);
        console.log(`💬 訊息總數: ${this.messageCount}`);
        console.log(`🚫 已過濾: ${this.filteredCount}`);
        console.log(`🔍 分析總數: ${this.analysisCount}`);
        console.log(`📈 當前進度: ${progressStats.currentProgress}%`);
        console.log(`📊 趨勢: ${progressStats.recentTrend}`);
        console.log(`✅ 正面變化: ${progressStats.positiveChanges}`);
        console.log(`❌ 負面變化: ${progressStats.negativeChanges}`);
        console.log(`📊 過濾率: ${this.messageCount > 0 ? Math.round(this.filteredCount / this.messageCount * 100) : 0}%`);
        console.log('========================\n');
    }

    // 手動調整進度
    manualAdjustProgress(amount) {
        const result = this.progressController.adjustProgress(amount, { type: 'manual' });
        console.log(`🎛️ 手動調整: ${result.oldProgress}% → ${result.newProgress}% (${result.change > 0 ? '+' : ''}${result.change}%)`);
        return result;
    }

    // 重置進度
    resetProgress() {
        const result = this.progressController.reset();
        console.log(`🔄 進度重置: ${result.newProgress}%`);
        return result;
    }

    // 獲取當前狀態
    getCurrentState() {
        return {
            channel: this.channel,
            connected: this.isConnectionActive(),
            messageCount: this.messageCount,
            filteredCount: this.filteredCount,
            analysisCount: this.analysisCount,
            filterRate: this.messageCount > 0 ? Math.round(this.filteredCount / this.messageCount * 100) : 0,
            currentProgress: this.progressController.getCurrentProgress(),
            statistics: this.progressController.getStatistics(),
            uptime: Math.round((new Date() - this.startTime) / 1000)
        };
    }
}

// 使用範例
if (require.main === module) {
    // 檢查是否設定 API Key
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === '你的OpenAI_API_Key') {
        console.error('❌ 請在 .env 檔案中設定您的 OPENAI_API_KEY');
        console.error('請編輯 .env 檔案，將 OPENAI_API_KEY=你的OpenAI_API_Key 改為您的實際 API Key');
        process.exit(1);
    }
    
    const channelName = process.argv[2] || process.env.TWITCH_CHANNEL || 'shroud';
    
    console.log('🚀 啟動 Twitch 聊天室好感度分析器');
    console.log(`📺 目標頻道: ${channelName}`);
    console.log('🤖 情感分析: GPT-4o');
    console.log('📊 進度控制: 已啟用');
    console.log('=' .repeat(50));
    
    const chatController = new TwitchChatController(channelName);
    
    // 連接到聊天室
    chatController.connect();
    
    // 設定定期顯示統計資訊
    setInterval(() => {
        if (chatController.analysisCount > 0) {
            chatController.showStatistics();
        }
    }, 30000); // 每30秒顯示一次統計
    
    // 優雅地處理程序結束
    process.on('SIGINT', async () => {
        console.log('\n🛑 正在關閉連接...');
        chatController.showStatistics();
        await chatController.disconnect();
        console.log('👋 感謝使用！');
        process.exit(0);
    });
    
    // 處理錯誤
    process.on('uncaughtException', (error) => {
        console.error('💥 未捕獲的錯誤:', error);
        chatController.disconnect();
        process.exit(1);
    });
}

module.exports = TwitchChatController;