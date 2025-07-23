const TwitchChatController = require('./twitch-chat-controller');
const YouTubeChatController = require('./youtube-chat-controller');
const ProgressWebSocketServer = require('./websocket-server');
require('dotenv').config();

class MultiPlatformController {
    constructor() {
        this.controllers = new Map();
        this.wsServer = new ProgressWebSocketServer(8080);
        this.isRunning = false;
        
        // 統計資訊
        this.totalMessages = 0;
        this.totalAnalyzed = 0;
        this.totalFiltered = 0;
        this.startTime = new Date();
    }

    async start() {
        if (this.isRunning) {
            console.log('⚠️  多平台控制器已在運行中');
            return;
        }

        console.log('🚀 啟動多平台聊天室好感度分析器');
        console.log('==================================================');
        
        // 啟動 WebSocket 服務器
        try {
            await this.wsServer.start();
            console.log('🚀 WebSocket 服務器啟動成功');
            console.log('📺 進度條網址: http://localhost:8080');
            console.log('🔗 WebSocket 端點: ws://localhost:8080');
        } catch (error) {
            console.error('❌ WebSocket 服務器啟動失敗:', error);
            return;
        }

        this.isRunning = true;
        this.startGlobalStatistics();
    }

    async addTwitchChannel(channelName) {
        if (this.controllers.has(`twitch:${channelName}`)) {
            console.log(`⚠️  Twitch 頻道 ${channelName} 已經在監控中`);
            return;
        }

        console.log(`📺 添加 Twitch 頻道: ${channelName}`);
        
        const controller = new TwitchChatController(channelName);
        controller.wsServer = this.wsServer; // 使用共享的 WebSocket 服務器
        controller.progressController.setWebSocketServer(this.wsServer);
        
        this.controllers.set(`twitch:${channelName}`, controller);
        
        // 修改統計回調
        this.overrideControllerStats(controller, 'Twitch', channelName);
        
        await controller.connect();
        console.log(`✅ Twitch 頻道 ${channelName} 連接成功`);
    }

    async addYouTubeChannel(channelId, channelName = '') {
        if (this.controllers.has(`youtube:${channelId}`)) {
            console.log(`⚠️  YouTube 頻道 ${channelId} 已經在監控中`);
            return;
        }

        console.log(`📺 添加 YouTube 頻道: ${channelName || channelId}`);
        
        const controller = new YouTubeChatController(channelId, this.wsServer);
        this.controllers.set(`youtube:${channelId}`, controller);
        
        // 修改統計回調
        this.overrideControllerStats(controller, 'YouTube', channelName || channelId);
        
        await controller.connect();
        console.log(`✅ YouTube 頻道 ${channelName || channelId} 連接成功`);
    }

    overrideControllerStats(controller, platform, channelName) {
        // 劫持原始統計方法，將數據匯總到主控制器
        const originalHandleMessage = platform === 'Twitch' ? 
            controller.handleMessage.bind(controller) : 
            controller.handleMessage.bind(controller);
        
        if (platform === 'Twitch') {
            controller.handleMessage = (message) => {
                this.totalMessages++;
                return originalHandleMessage(message);
            };
        } else {
            controller.handleMessage = (chatItem) => {
                this.totalMessages++;
                return originalHandleMessage(chatItem);
            };
        }
    }

    startGlobalStatistics() {
        setInterval(() => {
            const runtime = Math.floor((new Date() - this.startTime) / 1000);
            const platforms = [];
            let totalCurrentMessages = 0;
            let totalCurrentAnalyzed = 0;
            let totalCurrentFiltered = 0;
            let totalCurrentProgress = 0;
            let activeControllers = 0;
            
            this.controllers.forEach((controller, key) => {
                const [platform, channel] = key.split(':');
                platforms.push(`${platform}: ${channel}`);
                totalCurrentMessages += controller.messageCount || 0;
                totalCurrentAnalyzed += controller.analysisCount || 0;
                totalCurrentFiltered += controller.filteredCount || 0;
                totalCurrentProgress += controller.progressController?.currentProgress || 0;
                activeControllers++;
            });
            
            const averageProgress = activeControllers > 0 ? Math.round(totalCurrentProgress / activeControllers) : 0;
            const filterRate = totalCurrentMessages > 0 ? Math.round((totalCurrentFiltered / totalCurrentMessages) * 100) : 0;
            
            console.log('\n📊 ===== 多平台統計資訊 =====');
            console.log(`⏰ 運行時間: ${runtime}秒`);
            console.log(`📺 監控平台: ${platforms.join(', ')}`);
            console.log(`💬 總訊息數: ${totalCurrentMessages}`);
            console.log(`🚫 已過濾: ${totalCurrentFiltered}`);
            console.log(`🔍 分析總數: ${totalCurrentAnalyzed}`);
            console.log(`📈 平均進度: ${averageProgress}%`);
            console.log(`📊 過濾率: ${filterRate}%`);
            console.log(`🔗 活躍連接: ${activeControllers} 個平台`);
            console.log('========================\n');
            
        }, 45000); // 45秒間隔，避免與單平台統計衝突
    }

    async removeChannel(platform, identifier) {
        const key = `${platform.toLowerCase()}:${identifier}`;
        const controller = this.controllers.get(key);
        
        if (!controller) {
            console.log(`⚠️  找不到 ${platform} 頻道 ${identifier}`);
            return;
        }
        
        console.log(`🔌 移除 ${platform} 頻道: ${identifier}`);
        controller.disconnect();
        this.controllers.delete(key);
        console.log(`✅ ${platform} 頻道 ${identifier} 已移除`);
    }

    listChannels() {
        if (this.controllers.size === 0) {
            console.log('📝 目前沒有監控任何頻道');
            return;
        }
        
        console.log('\n📝 目前監控的頻道:');
        this.controllers.forEach((controller, key) => {
            const [platform, channel] = key.split(':');
            const status = controller.isConnected ? '🟢 已連接' : '🔴 未連接';
            const messages = controller.messageCount || 0;
            const progress = controller.progressController?.currentProgress || 0;
            console.log(`  ${platform}: ${channel} - ${status} (${messages} 訊息, ${progress}% 進度)`);
        });
        console.log('');
    }

    async shutdown() {
        console.log('🛑 正在關閉多平台控制器...');
        
        // 斷開所有控制器
        for (const [key, controller] of this.controllers) {
            console.log(`🔌 斷開 ${key}`);
            controller.disconnect();
        }
        
        this.controllers.clear();
        
        // 關閉 WebSocket 服務器
        if (this.wsServer) {
            console.log('🔌 關閉 WebSocket 服務器');
            // 這裡可能需要添加 wsServer.shutdown() 方法
        }
        
        this.isRunning = false;
        console.log('✅ 多平台控制器已關閉');
    }
}

module.exports = MultiPlatformController;

// 如果直接執行此檔案
if (require.main === module) {
    const args = process.argv.slice(2);
    
    // 如果沒有參數，但有設定預設值，則使用雙平台模式
    if (args.length === 0) {
        const defaultTwitch = process.env.TWITCH_CHANNEL;
        const defaultYouTube = process.env.YOUTUBE_CHANNEL_ID;
        
        if (defaultTwitch && defaultYouTube) {
            args.push('both', defaultTwitch, defaultYouTube);
            console.log('🎯 使用 .env 設定的預設頻道啟動雙平台監控');
        } else if (defaultTwitch) {
            args.push('twitch', defaultTwitch);
            console.log('🎯 使用 .env 設定的預設 Twitch 頻道');
        } else if (defaultYouTube) {
            args.push('youtube', defaultYouTube);
            console.log('🎯 使用 .env 設定的預設 YouTube 頻道');
        } else {
            console.log('🎯 多平台聊天室好感度控制器');
            console.log('');
            console.log('使用方法:');
            console.log('  node multi-platform-controller.js twitch [頻道名稱]');
            console.log('  node multi-platform-controller.js youtube [頻道ID] [頻道名稱]');
            console.log('  node multi-platform-controller.js both [Twitch頻道] [YouTube頻道ID]');
            console.log('');
            console.log('或在 .env 檔案中設定預設頻道:');
            console.log('  TWITCH_CHANNEL=頻道名稱');
            console.log('  YOUTUBE_CHANNEL_ID=頻道ID');
            console.log('  然後直接執行: node multi-platform-controller.js');
            console.log('');
            console.log('範例:');
            console.log('  node multi-platform-controller.js twitch buuuggyy');
            console.log('  node multi-platform-controller.js youtube UC1opHUrw8rvnsadT-iGp7Cg 志祺七七');
            console.log('  node multi-platform-controller.js both buuuggyy UC1opHUrw8rvnsadT-iGp7Cg');
            process.exit(1);
        }
    }
    
    const controller = new MultiPlatformController();
    
    async function main() {
        await controller.start();
        
        const command = args[0].toLowerCase();
        
        if (command === 'twitch') {
            const twitchChannel = args[1] || process.env.TWITCH_CHANNEL;
            if (twitchChannel) {
                await controller.addTwitchChannel(twitchChannel);
            } else {
                console.log('❌ 需要 Twitch 頻道名稱或在 .env 中設定 TWITCH_CHANNEL');
                process.exit(1);
            }
        } 
        else if (command === 'youtube') {
            const youtubeChannel = args[1] || process.env.YOUTUBE_CHANNEL_ID;
            const channelName = args[2] || process.env.YOUTUBE_CHANNEL_NAME;
            if (youtubeChannel) {
                await controller.addYouTubeChannel(youtubeChannel, channelName);
            } else {
                console.log('❌ 需要 YouTube 頻道 ID 或在 .env 中設定 YOUTUBE_CHANNEL_ID');
                process.exit(1);
            }
        }
        else if (command === 'both') {
            const twitchChannel = args[1] || process.env.TWITCH_CHANNEL;
            const youtubeChannel = args[2] || process.env.YOUTUBE_CHANNEL_ID;
            
            if (twitchChannel && youtubeChannel) {
                await controller.addTwitchChannel(twitchChannel);
                await controller.addYouTubeChannel(youtubeChannel);
            } else {
                console.log('❌ 需要 Twitch 和 YouTube 頻道資訊或在 .env 中設定對應變數');
                process.exit(1);
            }
        }
        else {
            console.log('❌ 無效的命令');
            process.exit(1);
        }
        
        // 每 60 秒顯示頻道狀態
        setInterval(() => {
            controller.listChannels();
        }, 60000);
    }
    
    main().catch(error => {
        console.error('❌ 啟動失敗:', error);
        process.exit(1);
    });
    
    // 優雅關閉
    process.on('SIGINT', async () => {
        console.log('\n🛑 收到關閉信號...');
        await controller.shutdown();
        process.exit(0);
    });
}