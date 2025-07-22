class MessageFilter {
    constructor() {
        // Twitch 貼圖和表情符號過濾規則
        this.emotePatterns = [
            // buuuggyy 頻道貼圖（基於頻道名稱）
            /buuugg\w*/gi,
            /buuugg/gi,
            
            // 常見 Twitch 貼圖
            /Kappa/gi,
            /PogChamp/gi,
            /4Head/gi,
            /EZ\s*Clap/gi,
            /LUL/gi,
            /OMEGALUL/gi,
            /MonkaS/gi,
            /Pepega/gi,
            /5Head/gi,
            /EZ/gi,
            /Clap/gi,
            /Pog/gi,
            /POGGERS/gi,
            /WeirdChamp/gi,
            /Sadge/gi,
            /Copium/gi,
            /Hopium/gi,
            /Aware/gi,
            
            // 數字重複（777777, 88888 等）
            /(\d)\1{4,}/g,
            
            // 字母重複貼圖（aaaaa, wwwww 等）
            /([a-zA-Z])\1{4,}/gi,
            
            // 常見數字組合（可能是貼圖）
            /^\d+$/,
            
            // 單純的標點符號組合
            /^[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]+$/,
            
            // 常見中文貼圖用詞
            /草{3,}/g,
            /笑{3,}/g,
            /哈{3,}/g
        ];
        
        // 需要完全忽略的詞彙（貼圖名稱等）
        this.ignoreWords = new Set([
            'kappa',
            'pogchamp',
            '4head',
            'lul',
            'omegalul',
            'monkas',
            'pepega',
            '5head',
            'ezclap',
            'pog',
            'poggers',
            'weirdchamp',
            'sadge',
            'copium',
            'hopium',
            'aware',
            'buuugg',
            'buuuggyy'
        ]);
        
        // 最小有效訊息長度
        this.minMessageLength = 2;
        
        // 最大重複字符比例
        this.maxRepeatRatio = 0.7;
    }

    // 主要過濾功能
    filterMessage(originalMessage) {
        let message = originalMessage.trim();
        
        // 記錄原始訊息用於調試
        const debugInfo = {
            original: originalMessage,
            steps: []
        };
        
        // 步驟 1: 移除 Twitch 貼圖
        const beforeEmoteFilter = message;
        message = this.removeEmotes(message);
        if (message !== beforeEmoteFilter) {
            debugInfo.steps.push(`移除貼圖: "${beforeEmoteFilter}" → "${message}"`);
        }
        
        // 步驟 2: 移除忽略詞彙
        const beforeIgnoreFilter = message;
        message = this.removeIgnoreWords(message);
        if (message !== beforeIgnoreFilter) {
            debugInfo.steps.push(`移除忽略詞: "${beforeIgnoreFilter}" → "${message}"`);
        }
        
        // 步驟 3: 清理空白字符
        message = message.replace(/\s+/g, ' ').trim();
        
        // 步驟 4: 檢查是否應該完全忽略
        const shouldIgnore = this.shouldIgnoreMessage(message);
        
        const result = {
            original: originalMessage,
            filtered: message,
            shouldAnalyze: !shouldIgnore && message.length >= this.minMessageLength,
            reason: shouldIgnore ? this.getIgnoreReason(message) : null,
            debugInfo: debugInfo
        };
        
        return result;
    }

    // 移除 Twitch 貼圖
    removeEmotes(message) {
        let filtered = message;
        
        this.emotePatterns.forEach(pattern => {
            filtered = filtered.replace(pattern, '');
        });
        
        return filtered;
    }

    // 移除忽略詞彙
    removeIgnoreWords(message) {
        const words = message.split(/\s+/);
        const filteredWords = words.filter(word => 
            !this.ignoreWords.has(word.toLowerCase())
        );
        
        return filteredWords.join(' ');
    }

    // 判斷是否應該忽略整個訊息
    shouldIgnoreMessage(message) {
        if (message.length < this.minMessageLength) {
            return true;
        }
        
        // 檢查是否主要由重複字符組成
        if (this.isMainlyRepeatedChars(message)) {
            return true;
        }
        
        // 檢查是否只包含數字和標點符號（但排除中文字符）
        if (/^[\d\s\W]*$/.test(message) && !/[\u4e00-\u9fff\u3400-\u4dbf]/.test(message)) {
            return true;
        }
        
        // 檢查是否為純表情符號
        if (this.isOnlyEmojis(message)) {
            return true;
        }
        
        return false;
    }

    // 檢查是否主要由重複字符組成
    isMainlyRepeatedChars(message) {
        if (message.length < 3) return false;
        
        const charCount = {};
        for (const char of message.toLowerCase()) {
            if (char !== ' ') {
                charCount[char] = (charCount[char] || 0) + 1;
            }
        }
        
        const totalChars = message.replace(/\s/g, '').length;
        const maxCharCount = Math.max(...Object.values(charCount));
        
        return maxCharCount / totalChars > this.maxRepeatRatio;
    }

    // 檢查是否只包含表情符號
    isOnlyEmojis(message) {
        // Unicode 表情符號範圍的簡化檢查
        const emojiRegex = /^[\u{1f600}-\u{1f64f}\u{1f300}-\u{1f5ff}\u{1f680}-\u{1f6ff}\u{1f1e0}-\u{1f1ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}\s]*$/u;
        return emojiRegex.test(message);
    }

    // 獲取忽略原因
    getIgnoreReason(message) {
        if (message.length < this.minMessageLength) {
            return '訊息太短';
        }
        if (this.isMainlyRepeatedChars(message)) {
            return '主要為重複字符';
        }
        if (/^[\d\s\W]*$/.test(message) && !/[\u4e00-\u9fff\u3400-\u4dbf]/.test(message)) {
            return '只包含數字和標點符號';
        }
        if (this.isOnlyEmojis(message)) {
            return '只包含表情符號';
        }
        return '未知原因';
    }

    // 添加自定義貼圖規則
    addEmotePattern(pattern) {
        if (pattern instanceof RegExp) {
            this.emotePatterns.push(pattern);
        } else {
            this.emotePatterns.push(new RegExp(pattern, 'gi'));
        }
    }

    // 添加忽略詞彙
    addIgnoreWord(word) {
        this.ignoreWords.add(word.toLowerCase());
    }

    // 獲取統計資訊
    getFilterStats(messages) {
        const stats = {
            total: messages.length,
            analyzed: 0,
            filtered: 0,
            reasons: {}
        };
        
        messages.forEach(msg => {
            const result = this.filterMessage(msg);
            if (result.shouldAnalyze) {
                stats.analyzed++;
            } else {
                stats.filtered++;
                const reason = result.reason || '未知';
                stats.reasons[reason] = (stats.reasons[reason] || 0) + 1;
            }
        });
        
        return stats;
    }
}

// 測試功能
if (require.main === module) {
    const filter = new MessageFilter();
    
    const testMessages = [
        "buuugg 你好棒！",
        "77777",
        "主播午安",
        "buuuggLUL",
        "POGGERS",
        "草草草草草",
        "你真的很厲害",
        "aaaaaaa",
        "123456",
        "！！！！！",
        "😊😊😊",
        "buuugg buuugg 主播加油",
        "Kappa 4Head LUL",
        "謝謝主播的分享",
        "...",
        "buuuggbuuuggbuuugg"
    ];
    
    console.log('🧪 測試訊息過濾器\n');
    
    testMessages.forEach((msg, index) => {
        const result = filter.filterMessage(msg);
        console.log(`${index + 1}. "${msg}"`);
        console.log(`   過濾後: "${result.filtered}"`);
        console.log(`   分析: ${result.shouldAnalyze ? '✅ 是' : '❌ 否'}${result.reason ? ` (${result.reason})` : ''}`);
        if (result.debugInfo.steps.length > 0) {
            console.log(`   步驟: ${result.debugInfo.steps.join(' → ')}`);
        }
        console.log('');
    });
    
    // 統計資訊
    const stats = filter.getFilterStats(testMessages);
    console.log('📊 統計資訊:');
    console.log(`   總訊息: ${stats.total}`);
    console.log(`   需分析: ${stats.analyzed}`);
    console.log(`   已過濾: ${stats.filtered}`);
    console.log('   過濾原因:');
    Object.entries(stats.reasons).forEach(([reason, count]) => {
        console.log(`     ${reason}: ${count} 條`);
    });
}

module.exports = MessageFilter;