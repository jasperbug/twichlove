const fs = require('fs');

console.log('執行完全重置...');

// 完全清空數據文件
const emptyData = {
    currentProgress: 0,
    lastUpdated: new Date().toISOString(),
    history: []
};

try {
    fs.writeFileSync('progress-data.json', JSON.stringify(emptyData, null, 2));
    console.log('✅ 完全重置成功！');
    console.log('- 進度: 0%');
    console.log('- 歷史記錄: 已清空');
} catch (error) {
    console.error('❌ 重置失敗:', error);
}