const OpenAI = require('openai');
require('dotenv').config();

class SentimentAnalyzer {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
        
        this.systemPrompt = `你是一個專業的聊天室情感分析師。你需要分析 Twitch 聊天室的訊息，判斷觀眾對主播的態度和情感。

重要資訊：
- 主播的名字是
- 主播

請分析每條訊息並回傳 JSON 格式：
{
    "sentiment": "positive/neutral/negative",
    "score": -5到+5的分數,
    "reason": "簡短的分析原因",
    "category": "praise/support/neutral/criticism/toxic"
}

評分標準：
+5: 極度正面 (超讚美、感謝、愛心表達)
+4: 非常正面 (大讚美、鼓勵)
+3: 正面 (讚美、支持、好評)
+2: 輕微正面 (小讚、認同)
+1: 略微正面 (輕微好感)
 0: 中性 (普通聊天、問問題、表情符號)
-1: 略微負面 (輕微抱怨)
-2: 負面 (批評、不滿)
-3: 很負面 (明顯批評、諷刺)
-4: 非常負面 (惡意批評、羞辱)
-5: 極度負面 (仇恨言論、嚴重辱罵)

分類說明：
- praise: 讚美主播技術、外觀、人格
- support: 鼓勵、支持、正能量
- neutral: 普通聊天、詢問、中性回應
- criticism: 建設性批評、意見
- toxic: 惡意言論、辱罵、仇恨

請只回傳有效的 JSON，不要額外文字。`;
    }

    async analyzeMessage(message) {
        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-4.1-mini-2025-04-14",
                messages: [
                    { role: "system", content: this.systemPrompt },
                    { role: "user", content: `請分析這條聊天訊息：「${message}」` }
                ],
                temperature: 0.3,
                max_tokens: 150
            });

            let content = response.choices[0].message.content.trim();
            
            // 移除可能的 markdown 代碼塊標記
            content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            
            // 如果內容以 ` 開頭，可能是代碼塊，需要清理
            if (content.startsWith('`')) {
                content = content.replace(/^`+|`+$/g, '');
            }
            
            console.log('GPT-4.1-mini 原始回應:', content);
            
            const result = JSON.parse(content);
            
            // 驗證結果格式
            if (!this.isValidAnalysis(result)) {
                throw new Error('分析結果格式無效');
            }

            return result;
        } catch (error) {
            console.error('情感分析錯誤:', error.message);
            
            // 回傳預設中性結果
            return {
                sentiment: "neutral",
                score: 0,
                reason: "分析失敗，預設中性",
                category: "neutral"
            };
        }
    }

    isValidAnalysis(result) {
        return (
            result &&
            typeof result.sentiment === 'string' &&
            ['positive', 'neutral', 'negative'].includes(result.sentiment) &&
            typeof result.score === 'number' &&
            result.score >= -5 &&
            result.score <= 5 &&
            typeof result.reason === 'string' &&
            typeof result.category === 'string' &&
            ['praise', 'support', 'neutral', 'criticism', 'toxic'].includes(result.category)
        );
    }

    // 批量分析多條訊息
    async analyzeMessages(messages) {
        const results = [];
        
        for (const message of messages) {
            const analysis = await this.analyzeMessage(message);
            results.push({
                message: message,
                analysis: analysis
            });
            
            // 避免 API 限流，稍微延遲
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        return results;
    }

    // 計算整體情感趨勢
    calculateOverallSentiment(analyses) {
        if (analyses.length === 0) return { average: 0, trend: 'neutral' };
        
        const totalScore = analyses.reduce((sum, analysis) => sum + analysis.score, 0);
        const average = totalScore / analyses.length;
        
        let trend = 'neutral';
        if (average > 1) trend = 'positive';
        else if (average < -1) trend = 'negative';
        
        return {
            average: Math.round(average * 100) / 100,
            trend: trend,
            totalMessages: analyses.length,
            breakdown: {
                positive: analyses.filter(a => a.score > 0).length,
                neutral: analyses.filter(a => a.score === 0).length,
                negative: analyses.filter(a => a.score < 0).length
            }
        };
    }
}

// 測試功能
if (require.main === module) {
    const analyzer = new SentimentAnalyzer();
    
    const testMessages = [
        "主播你好棒！",
        "gg",
        "這局打得不錯",
        "你好爛",
        "謝謝主播的分享",
        "無聊"
    ];
    
    console.log('開始測試情感分析...');
    
    testMessages.forEach(async (message, index) => {
        setTimeout(async () => {
            const result = await analyzer.analyzeMessage(message);
            console.log(`\n訊息: "${message}"`);
            console.log(`分析結果:`, result);
        }, index * 1000);
    });
}

module.exports = SentimentAnalyzer;
