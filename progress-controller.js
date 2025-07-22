const fs = require('fs');
const path = require('path');

class ProgressController {
    constructor(htmlFilePath = './vertical-progress-bar.html', wsServer = null) {
        this.htmlFilePath = htmlFilePath;
        this.currentProgress = 0;
        this.minProgress = -100;
        this.maxProgress = 100;
        this.history = [];
        this.wsServer = wsServer; // WebSocket 服務器實例
        
        // 讀取當前進度（如果有保存的話）
        this.loadProgress();
    }
    
    // 設定 WebSocket 服務器
    setWebSocketServer(wsServer) {
        this.wsServer = wsServer;
    }

    // 根據情感分析結果調整進度
    adjustProgressBySentiment(sentimentAnalysis) {
        const { score, category, sentiment } = sentimentAnalysis;
        
        // 計算進度變化量
        let progressChange = 0;
        
        // 基於分數的基礎變化
        progressChange = score;
        
        // 根據分類進行微調
        switch (category) {
            case 'praise':
                progressChange = Math.max(progressChange, 2); // 讚美至少+2
                break;
            case 'support':
                progressChange = Math.max(progressChange, 1); // 支持至少+1
                break;
            case 'toxic':
                progressChange = Math.min(progressChange, -3); // 毒性至少-3
                break;
            case 'criticism':
                progressChange = Math.min(progressChange, -1); // 批評至少-1
                break;
        }
        
        // 應用進度變化
        return this.adjustProgress(progressChange, sentimentAnalysis);
    }

    // 手動調整進度
    adjustProgress(amount, metadata = {}) {
        const oldProgress = this.currentProgress;
        this.currentProgress = Math.max(
            this.minProgress, 
            Math.min(this.maxProgress, this.currentProgress + amount)
        );
        
        const actualChange = this.currentProgress - oldProgress;
        
        // 記錄變化歷史
        this.history.push({
            timestamp: new Date(),
            oldProgress: oldProgress,
            newProgress: this.currentProgress,
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
        
        // 通過 WebSocket 廣播進度更新
        if (this.wsServer) {
            this.wsServer.updateProgress(this.currentProgress, {
                change: actualChange,
                oldProgress: oldProgress,
                ...metadata
            });
        }
        
        console.log(`進度變化: ${oldProgress}% → ${this.currentProgress}% (${actualChange > 0 ? '+' : ''}${actualChange}%)`);
        
        return {
            oldProgress: oldProgress,
            newProgress: this.currentProgress,
            change: actualChange,
            metadata: metadata
        };
    }

    // 設定特定進度值
    setProgress(percentage) {
        percentage = Math.max(this.minProgress, Math.min(this.maxProgress, percentage));
        const change = percentage - this.currentProgress;
        return this.adjustProgress(change, { type: 'manual_set', targetValue: percentage });
    }

    // 重置進度
    reset() {
        return this.setProgress(0);
    }

    // 獲取當前進度
    getCurrentProgress() {
        return this.currentProgress;
    }

    // 獲取進度歷史
    getHistory(limit = 10) {
        return this.history.slice(-limit);
    }

    // 獲取統計資訊
    getStatistics() {
        if (this.history.length === 0) {
            return {
                totalChanges: 0,
                positiveChanges: 0,
                negativeChanges: 0,
                averageChange: 0,
                largestIncrease: 0,
                largestDecrease: 0
            };
        }
        
        const changes = this.history.map(h => h.change);
        const positiveChanges = changes.filter(c => c > 0);
        const negativeChanges = changes.filter(c => c < 0);
        
        return {
            currentProgress: this.currentProgress,
            totalChanges: this.history.length,
            positiveChanges: positiveChanges.length,
            negativeChanges: negativeChanges.length,
            averageChange: changes.reduce((a, b) => a + b, 0) / changes.length,
            largestIncrease: Math.max(...changes, 0),
            largestDecrease: Math.min(...changes, 0),
            recentTrend: this.calculateRecentTrend()
        };
    }

    // 計算近期趨勢
    calculateRecentTrend(recentCount = 5) {
        const recent = this.history.slice(-recentCount);
        if (recent.length === 0) return 'stable';
        
        const totalChange = recent.reduce((sum, h) => sum + h.change, 0);
        
        if (totalChange > 2) return 'rising';
        if (totalChange < -2) return 'falling';
        return 'stable';
    }

    // 保存進度到檔案
    saveProgress() {
        const data = {
            currentProgress: this.currentProgress,
            lastUpdated: new Date().toISOString(),
            history: this.history.slice(-20) // 只保存最近20筆記錄
        };
        
        try {
            fs.writeFileSync('progress-data.json', JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('保存進度失敗:', error);
        }
    }

    // 從檔案載入進度
    loadProgress() {
        try {
            if (fs.existsSync('progress-data.json')) {
                const data = JSON.parse(fs.readFileSync('progress-data.json', 'utf8'));
                this.currentProgress = data.currentProgress || 0;
                this.history = data.history || [];
                console.log(`載入進度: ${this.currentProgress}%`);
            }
        } catch (error) {
            console.error('載入進度失敗:', error);
            this.currentProgress = 0;
            this.history = [];
        }
    }

    // 更新HTML檔案中的進度條（實驗性功能）
    updateHTMLProgress() {
        try {
            if (fs.existsSync(this.htmlFilePath)) {
                let html = fs.readFileSync(this.htmlFilePath, 'utf8');
                
                // 注入JavaScript來更新進度
                const updateScript = `
                <script>
                // 自動更新進度條
                if (typeof setProgress === 'function') {
                    setProgress(${this.currentProgress});
                }
                </script>
                `;
                
                // 在 </body> 前插入更新腳本
                html = html.replace('</body>', updateScript + '\n</body>');
                
                // 寫回檔案（謹慎使用）
                // fs.writeFileSync(this.htmlFilePath, html);
                console.log(`HTML進度更新準備: ${this.currentProgress}%`);
            }
        } catch (error) {
            console.error('更新HTML失敗:', error);
        }
    }
}

// 測試功能
if (require.main === module) {
    const controller = new ProgressController();
    
    console.log('測試進度控制器...');
    console.log('初始進度:', controller.getCurrentProgress());
    
    // 模擬情感分析結果
    const testAnalyses = [
        { sentiment: 'positive', score: 3, category: 'praise', reason: '讚美' },
        { sentiment: 'negative', score: -2, category: 'criticism', reason: '批評' },
        { sentiment: 'positive', score: 5, category: 'support', reason: '強力支持' },
        { sentiment: 'negative', score: -4, category: 'toxic', reason: '毒性言論' }
    ];
    
    testAnalyses.forEach((analysis, index) => {
        setTimeout(() => {
            console.log(`\n測試 ${index + 1}:`, analysis);
            const result = controller.adjustProgressBySentiment(analysis);
            console.log('結果:', result);
            console.log('統計:', controller.getStatistics());
        }, index * 1000);
    });
}

module.exports = ProgressController;