const TwitchChatController = require('./twitch-chat-controller');
const YouTubeChatController = require('./youtube-chat-controller');
const ProgressWebSocketServer = require('./websocket-server');
require('dotenv').config();

// 簡化版統一進度管理器
class UnifiedProgressManager {
    constructor(wsServer) {
        this.wsServer = wsServer;
        this.unifiedProgress = 0;
        this.platformStats = new Map(); // 存儲各平台統計資訊
        this.lastUpdateTime = new Date();
        this.history = []; // 進度變化歷史
        
        // 七階段情感狀態定義
        this.emotionLevels = [
            { range: [-100, -70], name: '極度憤怒', emoji: '😤', color: '#8B0000', description: '極度憤怒/厭惡' },
            { range: [-70, -30], name: '不滿生氣', emoji: '😠', color: '#FF4500', description: '不滿/生氣' },
            { range: [-30, 0], name: '冷淡疏離', emoji: '😐', color: '#808080', description: '冷淡/疏離' },
            { range: [0, 30], name: '友善好感', emoji: '😊', color: '#32CD32', description: '友善/好感' },
            { range: [30, 70], name: '喜愛迷戀', emoji: '😍', color: '#FF69B4', description: '喜愛/迷戀' },
            { range: [70, 90], name: '深深愛慕', emoji: '💕', color: '#FF1493', description: '深深愛慕' },
            { range: [90, 100], name: '完全沉醉', emoji: '💖', color: '#DC143C', description: '完全沉醉' }
        ];
        
        // 自動回調系統
        this.autoDecayTimer = null;
        this.decayConfig = {
            interval: 3 * 60 * 1000,  // 3分鐘 = 180秒
            rates: {
                high: { threshold: 50, amount: 3 },    // ±50%以上回調3%
                medium: { threshold: 20, amount: 2 },  // 20-50%回調2%
                low: { threshold: 0, amount: 1 }       // 20%以下回調1%
            }
        };
        
        // 載入之前保存的進度
        this.loadProgress();
        
        // 啟動自動回調計時器
        this.startAutoDecayTimer();
    }
    
    // 註冊平台
    registerPlatform(platformKey, controller) {
        this.platformStats.set(platformKey, {
            controller: controller,
            messageCount: 0,
            lastUpdate: new Date()
        });
        
        console.log(`📊 註冊平台到統一進度管理器: ${platformKey}`);
    }
    
    // 直接調整統一進度 (不分平台，所有訊息平等對待)
    adjustUnifiedProgress(amount, metadata = {}) {
        const oldProgress = this.unifiedProgress;
        this.unifiedProgress = Math.max(-100, Math.min(100, this.unifiedProgress + amount));
        const actualChange = this.unifiedProgress - oldProgress;
        
        if (actualChange !== 0) {
            this.lastUpdateTime = new Date();
            
            // 記錄變化歷史
            this.history.push({
                timestamp: this.lastUpdateTime,
                oldProgress: oldProgress,
                newProgress: this.unifiedProgress,
                change: actualChange,
                requestedChange: amount,
                metadata: metadata
            });
            
            // 限制歷史記錄長度
            if (this.history.length > 100) {
                this.history = this.history.slice(-50);
            }
            
            // 保存進度
            this.saveProgress();
            
            // 重置自動回調計時器（任何進度變化都重置）
            this.resetAutoDecayTimer();
            
            this.broadcastUnifiedProgress(oldProgress, actualChange, metadata);
        }
        
        return {
            oldProgress: oldProgress,
            newProgress: this.unifiedProgress,
            change: actualChange
        };
    }
    
    // 更新平台統計資訊
    updatePlatformStats(platformKey, messageCount) {
        const stats = this.platformStats.get(platformKey);
        if (stats) {
            stats.messageCount = messageCount;
            stats.lastUpdate = new Date();
        }
    }
    
    // 廣播統一進度
    broadcastUnifiedProgress(oldProgress, change, metadata = {}) {
        // 收集平台統計資訊
        const platformStats = {};
        this.platformStats.forEach((data, key) => {
            const [platform, channel] = key.split(':');
            platformStats[platform] = {
                channel: channel,
                messageCount: data.messageCount,
                lastUpdate: data.lastUpdate
            };
        });
        
        // 獲取當前和之前的情感狀態
        const currentEmotion = this.getCurrentEmotionState();
        const oldEmotion = this.getEmotionStateByProgress(oldProgress);
        
        // 通過 WebSocket 廣播
        this.wsServer.updateProgress(this.unifiedProgress, {
            type: 'unified_progress',
            change: change,
            oldProgress: oldProgress,
            currentEmotion: currentEmotion,
            oldEmotion: oldEmotion,
            emotionChanged: currentEmotion.name !== oldEmotion.name,
            platformStats: platformStats,
            timestamp: this.lastUpdateTime,
            ...metadata
        });
        
        const emotionInfo = `${currentEmotion.emoji} ${currentEmotion.name} (${currentEmotion.intensity}%)`;
        console.log(`🎯 統一進度更新: ${oldProgress}% → ${this.unifiedProgress}% (${change > 0 ? '+' : ''}${change}%) | ${emotionInfo}`);
    }
    
    // 重置進度
    resetProgress() {
        return this.adjustUnifiedProgress(-this.unifiedProgress, { type: 'reset' });
    }
    
    // 設定特定進度值
    setProgress(percentage) {
        const change = percentage - this.unifiedProgress;
        return this.adjustUnifiedProgress(change, { type: 'manual_set', targetValue: percentage });
    }
    
    // 獲取當前統一進度
    getUnifiedProgress() {
        return this.unifiedProgress;
    }
    
    // 根據進度值計算當前情感狀態
    getCurrentEmotionState() {
        const progress = this.unifiedProgress;
        
        for (const level of this.emotionLevels) {
            const [min, max] = level.range;
            if (progress >= min && progress < max) {
                return {
                    ...level,
                    progress: progress,
                    intensity: this.calculateIntensity(progress, level.range)
                };
            }
        }
        
        // 處理邊界情況 (100%)
        if (progress === 100) {
            const lastLevel = this.emotionLevels[this.emotionLevels.length - 1];
            return {
                ...lastLevel,
                progress: progress,
                intensity: 100
            };
        }
        
        // 預設值（理論上不應該到達這裡）
        return {
            range: [0, 0],
            name: '未知狀態',
            emoji: '❓',
            color: '#000000',
            description: '未知狀態',
            progress: progress,
            intensity: 0
        };
    }
    
    // 計算在該情感階段內的強度百分比
    calculateIntensity(progress, range) {
        const [min, max] = range;
        if (max === min) return 100;
        return Math.round(((progress - min) / (max - min)) * 100);
    }
    
    // 根據指定進度值獲取情感狀態（用於比較舊狀態）
    getEmotionStateByProgress(progress) {
        for (const level of this.emotionLevels) {
            const [min, max] = level.range;
            if (progress >= min && progress < max) {
                return {
                    ...level,
                    progress: progress,
                    intensity: this.calculateIntensity(progress, level.range)
                };
            }
        }
        
        // 處理邊界情況 (100%)
        if (progress === 100) {
            const lastLevel = this.emotionLevels[this.emotionLevels.length - 1];
            return {
                ...lastLevel,
                progress: progress,
                intensity: 100
            };
        }
        
        // 預設值
        return {
            range: [0, 0],
            name: '未知狀態',
            emoji: '❓',
            color: '#000000',
            description: '未知狀態',
            progress: progress,
            intensity: 0
        };
    }
    
    // 獲取平台統計
    getPlatformStats() {
        const stats = {};
        this.platformStats.forEach((data, key) => {
            stats[key] = {
                messageCount: data.messageCount,
                lastUpdate: data.lastUpdate
            };
        });
        return stats;
    }
    
    // 保存進度到檔案
    saveProgress() {
        const fs = require('fs');
        const data = {
            currentProgress: this.unifiedProgress,
            lastUpdated: this.lastUpdateTime.toISOString(),
            history: this.history.slice(-20) // 只保存最近20筆記錄
        };
        
        try {
            fs.writeFileSync('progress-data.json', JSON.stringify(data, null, 2));
            console.log(`💾 進度已保存: ${this.unifiedProgress}%`);
        } catch (error) {
            console.error('❌ 保存進度失敗:', error);
        }
    }

    // 從檔案載入進度
    loadProgress() {
        const fs = require('fs');
        try {
            if (fs.existsSync('progress-data.json')) {
                const data = JSON.parse(fs.readFileSync('progress-data.json', 'utf8'));
                this.unifiedProgress = data.currentProgress || 0;
                this.history = data.history || [];
                this.lastUpdateTime = data.lastUpdated ? new Date(data.lastUpdated) : new Date();
                console.log(`📂 載入進度: ${this.unifiedProgress}%`);
            } else {
                console.log('📂 未找到進度檔案，使用預設值: 0%');
            }
        } catch (error) {
            console.error('❌ 載入進度失敗:', error);
            this.unifiedProgress = 0;
            this.history = [];
            this.lastUpdateTime = new Date();
        }
    }
    
    // 啟動自動回調計時器
    startAutoDecayTimer() {
        this.resetAutoDecayTimer();
    }
    
    // 重置自動回調計時器
    resetAutoDecayTimer() {
        // 清除現有計時器
        if (this.autoDecayTimer) {
            clearTimeout(this.autoDecayTimer);
        }
        
        // 如果已經在中心點，不需要設定計時器
        if (this.unifiedProgress === 0) {
            console.log('🎯 進度已在中心點，暫停自動回調');
            return;
        }
        
        // 設定新的計時器
        this.autoDecayTimer = setTimeout(() => {
            this.performAutoDecay();
        }, this.decayConfig.interval);
        
        console.log(`⏰ 自動回調計時器已重置 (${this.decayConfig.interval / 1000}秒後觸發)`);
    }
    
    // 執行自動回調
    performAutoDecay() {
        if (this.unifiedProgress === 0) {
            console.log('🎯 進度已在中心點，停止自動回調');
            return;
        }
        
        const absProgress = Math.abs(this.unifiedProgress);
        let decayAmount = 0;
        
        // 根據距離中心點的遠近決定回調幅度
        if (absProgress >= this.decayConfig.rates.high.threshold) {
            decayAmount = this.decayConfig.rates.high.amount;
        } else if (absProgress >= this.decayConfig.rates.medium.threshold) {
            decayAmount = this.decayConfig.rates.medium.amount;
        } else {
            decayAmount = this.decayConfig.rates.low.amount;
        }
        
        // 決定回調方向（往中心點回調）
        const direction = this.unifiedProgress > 0 ? -1 : 1;
        const finalDecayAmount = decayAmount * direction;
        
        console.log(`📉 執行自動回調: ${this.unifiedProgress}% → ${this.unifiedProgress + finalDecayAmount}% (${finalDecayAmount > 0 ? '+' : ''}${finalDecayAmount}%)`);
        
        // 執行回調
        this.adjustUnifiedProgress(finalDecayAmount, {
            type: 'auto_decay',
            source: 'timer',
            absProgress: absProgress,
            decayAmount: decayAmount
        });
    }
    
    // 停止自動回調（用於清理）
    stopAutoDecayTimer() {
        if (this.autoDecayTimer) {
            clearTimeout(this.autoDecayTimer);
            this.autoDecayTimer = null;
            console.log('⏹️  自動回調計時器已停止');
        }
    }
}

class MultiPlatformController {
    constructor() {
        this.controllers = new Map();
        this.wsServer = new ProgressWebSocketServer(8080);
        this.isRunning = false;
        
        // 統一進度管理器
        this.unifiedProgressManager = new UnifiedProgressManager(this.wsServer);
        
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
            
            // 設定 API 處理器
            this.wsServer.handleProgressControl = (data) => {
                return this.handleManualProgressControl(data);
            };
            
            console.log('🚀 WebSocket 服務器啟動成功');
            console.log('📺 進度條網址: http://localhost:8080');
            console.log('🔗 WebSocket 端點: ws://localhost:8080');
            console.log('🔗 手動控制 API: http://localhost:8080/api/progress');
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
        const platformKey = `twitch:${channelName}`;
        
        // 禁用個別控制器的 WebSocket 更新，統一由 MultiPlatformController 管理
        controller.wsServer = null;
        controller.progressController.setWebSocketServer(null);
        
        this.controllers.set(platformKey, controller);
        
        // 註冊到統一進度管理器
        this.unifiedProgressManager.registerPlatform(platformKey, controller);
        
        // 修改統計回調和進度更新回調
        this.overrideControllerStats(controller, 'Twitch', channelName, platformKey);
        
        await controller.connect();
        console.log(`✅ Twitch 頻道 ${channelName} 連接成功`);
    }

    async addYouTubeChannel(channelId, channelName = '') {
        if (this.controllers.has(`youtube:${channelId}`)) {
            console.log(`⚠️  YouTube 頻道 ${channelId} 已經在監控中`);
            return;
        }

        console.log(`📺 添加 YouTube 頻道: ${channelName || channelId}`);
        
        const controller = new YouTubeChatController(channelId, null); // 不直接使用 WebSocket
        const platformKey = `youtube:${channelId}`;
        
        // 禁用個別控制器的 WebSocket 更新，統一由 MultiPlatformController 管理
        controller.progressController.setWebSocketServer(null);
        
        this.controllers.set(platformKey, controller);
        
        // 註冊到統一進度管理器
        this.unifiedProgressManager.registerPlatform(platformKey, controller);
        
        // 修改統計回調和進度更新回調
        this.overrideControllerStats(controller, 'YouTube', channelName || channelId, platformKey);
        
        await controller.connect();
        console.log(`✅ YouTube 頻道 ${channelName || channelId} 連接成功`);
    }

    overrideControllerStats(controller, platform, channelName, platformKey) {
        // 劫持原始統計方法，將數據匯總到主控制器
        const originalHandleMessage = controller.handleMessage.bind(controller);
        
        // 劫持進度控制器的調整方法
        const originalAdjustProgress = controller.progressController.adjustProgress.bind(controller.progressController);
        
        // 重寫 handleMessage 來統計訊息
        controller.handleMessage = (messageOrChatItem) => {
            this.totalMessages++;
            // 更新平台訊息統計
            this.unifiedProgressManager.updatePlatformStats(platformKey, controller.messageCount + 1);
            return originalHandleMessage(messageOrChatItem);
        };
        
        // 重寫 adjustProgress 來直接調用統一進度管理器
        controller.progressController.adjustProgress = (amount, metadata = {}) => {
            // 不調用原始方法，直接使用統一進度管理器
            const result = this.unifiedProgressManager.adjustUnifiedProgress(amount, {
                platform: platform,
                channel: channelName,
                ...metadata
            });
            
            return result;
        };
        
        console.log(`🔗 ${platform} 控制器已連接到統一進度管理器: ${channelName}`);
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
            
            // 獲取統一進度資訊
            const unifiedProgress = this.unifiedProgressManager.getUnifiedProgress();
            const platformStats = this.unifiedProgressManager.getPlatformStats();
            const currentEmotion = this.unifiedProgressManager.getCurrentEmotionState();
            
            console.log('\n📊 ===== 多平台統計資訊 =====');
            console.log(`⏰ 運行時間: ${runtime}秒`);
            console.log(`📺 監控平台: ${platforms.join(', ')}`);
            console.log(`💬 總訊息數: ${totalCurrentMessages}`);
            console.log(`🚫 已過濾: ${totalCurrentFiltered}`);
            console.log(`🔍 分析總數: ${totalCurrentAnalyzed}`);
            console.log(`🎯 統一進度: ${unifiedProgress}% (平等權重)`);
            console.log(`💝 情感狀態: ${currentEmotion.emoji} ${currentEmotion.name} (強度: ${currentEmotion.intensity}%)`);
            console.log(`📊 過濾率: ${filterRate}%`);
            console.log(`🔗 活躍連接: ${activeControllers} 個平台`);
            
            // 顯示各平台詳細資訊
            console.log('\n📋 各平台訊息統計:');
            Object.entries(platformStats).forEach(([key, stats]) => {
                const [platform, channel] = key.split(':');
                console.log(`  ${platform}: ${channel} - 訊息: ${stats.messageCount}`);
            });
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
        
        // 從統一進度管理器中移除
        this.unifiedProgressManager.platformData.delete(key);
        
        controller.disconnect();
        this.controllers.delete(key);
        console.log(`✅ ${platform} 頻道 ${identifier} 已移除`);
    }

    listChannels() {
        if (this.controllers.size === 0) {
            console.log('📝 目前沒有監控任何頻道');
            return;
        }
        
        const unifiedProgress = this.unifiedProgressManager.getUnifiedProgress();
        const platformStats = this.unifiedProgressManager.getPlatformStats();
        const currentEmotion = this.unifiedProgressManager.getCurrentEmotionState();
        
        console.log('\n📝 目前監控的頻道:');
        console.log(`🎯 統一進度: ${unifiedProgress}%`);
        console.log(`💝 情感狀態: ${currentEmotion.emoji} ${currentEmotion.name} (強度: ${currentEmotion.intensity}%)`);
        console.log('');
        
        this.controllers.forEach((controller, key) => {
            const [platform, channel] = key.split(':');
            const status = controller.isConnected ? '🟢 已連接' : '🔴 未連接';
            const messages = controller.messageCount || 0;
            const stats = platformStats[key];
            const platformMessages = stats ? stats.messageCount : 0;
            
            console.log(`  ${platform}: ${channel} - ${status}`);
            console.log(`    📊 訊息數: ${platformMessages}`);
        });
        console.log('');
    }

    // 處理手動進度控制請求
    handleManualProgressControl(data) {
        try {
            console.log('🎮 收到手動控制請求:', data);
            
            let result;
            if (data.action === 'adjust') {
                // 調整進度
                result = this.unifiedProgressManager.adjustUnifiedProgress(data.amount, {
                    type: 'manual_adjust',
                    source: 'web_interface'
                });
            } else if (data.action === 'set') {
                // 設定特定進度值
                result = this.unifiedProgressManager.setProgress(data.value);
            } else if (data.action === 'reset') {
                // 重置進度
                result = this.unifiedProgressManager.resetProgress();
            } else {
                return { error: 'Unknown action', validActions: ['adjust', 'set', 'reset'] };
            }
            
            console.log(`✅ 手動控制完成: ${result.oldProgress}% → ${result.newProgress}%`);
            
            return {
                success: true,
                oldProgress: result.oldProgress,
                newProgress: result.newProgress,
                change: result.change,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ 手動控制失敗:', error);
            return { error: error.message };
        }
    }

    async shutdown() {
        console.log('🛑 正在關閉多平台控制器...');
        
        // 停止自動回調計時器
        this.unifiedProgressManager.stopAutoDecayTimer();
        
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