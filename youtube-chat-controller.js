const { LiveChat } = require('youtube-chat');
const SentimentAnalyzer = require('./sentiment-analyzer');
const ProgressController = require('./progress-controller');
const ProgressWebSocketServer = require('./websocket-server');
const MessageFilter = require('./message-filter');
require('dotenv').config();

class YouTubeChatController {
    constructor(channelId, wsServer = null) {
        this.channelId = channelId;
        this.liveChat = null;
        this.isConnected = false;
        
        // 使用傳入的 WebSocket 服務器或創建新的
        this.wsServer = wsServer || new ProgressWebSocketServer(8080);
        
        // 初始化訊息過濾器
        this.messageFilter = new MessageFilter();
        
        // 初始化情感分析和進度控制
        this.sentimentAnalyzer = new SentimentAnalyzer();
        this.progressController = new ProgressController('./vertical-progress-bar.html', this.wsServer);
        
        // 統計資訊
        this.messageCount = 0;
        this.analysisCount = 0;
        this.filteredCount = 0;
        this.startTime = new Date();
    }

    async connect() {
        console.log(`🔗 正在連接到 YouTube 直播聊天室: ${this.channelId}`);
        
        try {
            // 創建 YouTube 聊天實例
            this.liveChat = new LiveChat({ channelId: this.channelId });
            
            // 監聽聊天訊息
            this.liveChat.on('chat', (chatItem) => {
                this.handleMessage(chatItem);
            });
            
            // 監聽錯誤
            this.liveChat.on('error', (error) => {
                console.error('❌ YouTube 聊天錯誤:', error);
                this.reconnect();
            });
            
            // 開始監聽
            await this.liveChat.start();
            this.isConnected = true;
            console.log('✅ 已成功連接到 YouTube 聊天室');
            
            // 開始統計報告
            this.startStatistics();
            
        } catch (error) {
            console.error('❌ 連接 YouTube 聊天室失敗:', error);
            setTimeout(() => this.reconnect(), 5000);
        }
    }

    handleMessage(chatItem) {
        this.messageCount++;
        
        // 提取訊息內容和用戶資訊
        const username = chatItem.author?.name || '匿名用戶';
        
        // 修正訊息提取方式
        let message = '';
        if (typeof chatItem.message === 'string') {
            message = chatItem.message;
        } else if (Array.isArray(chatItem.message)) {
            // 處理包含文字和表情符號的複合訊息
            message = chatItem.message.map(item => {
                if (typeof item === 'string') return item;
                if (typeof item === 'object' && item.text) return item.text;
                return '';
            }).join('');
        } else if (typeof chatItem.message === 'object' && chatItem.message !== null) {
            message = chatItem.message.text || '';
        }
        
        // 處理 SuperChat 訊息（付費留言）
        if (chatItem.superchat) {
            console.log(`💸 [SuperChat] ${username}: ${message} (${chatItem.superchat.amount})`);
        } else {
            console.log(`💬 [${username}]: ${message}`);
        }

        // 跳過空訊息
        if (!message.trim()) {
            this.filteredCount++;
            return;
        }

        // 簡化訊息過濾（暫時跳過複雜過濾）
        if (message.length < 2 || /^\s*$/.test(message)) {
            console.log(`🚫 已過濾: 訊息太短或只有空白`);
            this.filteredCount++;
            return;
        }

        // 情感分析
        this.analyzeMessage(message, username, chatItem.superchat);
    }

    async analyzeMessage(message, username, superchat = null) {
        try {
            console.log(`📝 原始訊息: "${message}"`);
            
            // 處理超長訊息
            const analysisMessage = message.length > 100 ? message.substring(0, 100) : message;
            console.log(`🔍 分析中: "${analysisMessage}"`);
            
            // 執行情感分析
            const sentimentResult = await this.sentimentAnalyzer.analyzeMessage(analysisMessage);
            
            // SuperChat 額外加分
            if (superchat) {
                sentimentResult.score += Math.min(superchat.amount / 100, 3); // 每 100 元加 1 分，最多 3 分
                sentimentResult.reason += ` [SuperChat加成: +${Math.min(superchat.amount / 100, 3)}]`;
            }
            
            console.log(`📊 分析結果: ${sentimentResult.sentiment} (${sentimentResult.score}) - ${sentimentResult.reason}`);
            
            // 更新進度
            this.progressController.adjustProgressBySentiment(sentimentResult);
            this.analysisCount++;
            
        } catch (error) {
            console.error('情感分析錯誤:', error);
        }
    }

    startStatistics() {
        // 每 30 秒顯示統計資訊
        setInterval(() => {
            const runtime = Math.floor((new Date() - this.startTime) / 1000);
            const filterRate = this.messageCount > 0 ? Math.round((this.filteredCount / this.messageCount) * 100) : 0;
            
            console.log('\n📊 ===== YouTube 統計資訊 =====');
            console.log(`⏰ 運行時間: ${runtime}秒`);
            console.log(`💬 訊息總數: ${this.messageCount}`);
            console.log(`🚫 已過濾: ${this.filteredCount}`);
            console.log(`🔍 分析總數: ${this.analysisCount}`);
            console.log(`📈 當前進度: ${this.progressController.currentProgress}%`);
            console.log(`📊 過濾率: ${filterRate}%`);
            console.log('========================\n');
        }, 30000);
    }

    async reconnect() {
        if (this.isConnected) {
            console.log('🔄 YouTube 聊天連接斷開，嘗試重新連接...');
            this.isConnected = false;
            if (this.liveChat) {
                this.liveChat.stop();
            }
        }
        
        // 增加重連延遲，避免頻繁重連
        setTimeout(() => {
            if (!this.isConnected) {
                this.connect();
            }
        }, 10000); // 改為 10 秒
    }

    disconnect() {
        if (this.liveChat) {
            this.liveChat.stop();
            this.isConnected = false;
            console.log('🔌 已斷開 YouTube 聊天室連接');
        }
    }
}

module.exports = YouTubeChatController;

// 如果直接執行此檔案
if (require.main === module) {
    const channelId = process.argv[2] || process.env.YOUTUBE_CHANNEL_ID;
    const channelName = process.env.YOUTUBE_CHANNEL_NAME || channelId;
    
    if (!channelId) {
        console.log('使用方法: node youtube-chat-controller.js [YouTube頻道ID]');
        console.log('例如: node youtube-chat-controller.js UC1opHUrw8rvnsadT-iGp7Cg');
        console.log('');
        console.log('或在 .env 檔案中設定 YOUTUBE_CHANNEL_ID=頻道ID');
        console.log('然後直接執行: node youtube-chat-controller.js');
        process.exit(1);
    }
    
    console.log('🚀 啟動 YouTube 聊天室好感度分析器');
    console.log(`📺 目標頻道: ${channelName}`);
    console.log(`📺 頻道 ID: ${channelId}`);
    console.log(`🤖 情感分析: GPT-4o`);
    console.log(`📊 進度控制: 已啟用`);
    console.log('==================================================');
    
    const controller = new YouTubeChatController(channelId);
    
    // 啟動 WebSocket 服務器
    controller.wsServer.start().then(() => {
        console.log('🚀 WebSocket 服務器啟動成功');
        console.log('📺 進度條網址: http://localhost:8080');
        console.log('🔗 WebSocket 端點: ws://localhost:8080');
    }).catch(error => {
        console.error('WebSocket 服務器啟動失敗:', error);
    });
    
    // 連接到聊天室
    controller.connect();
    
    // 優雅關閉
    process.on('SIGINT', () => {
        console.log('\n🛑 正在關閉 YouTube 聊天監控...');
        controller.disconnect();
        process.exit(0);
    });
}