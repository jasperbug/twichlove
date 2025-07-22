const ProgressController = require('./progress-controller.js');

// 創建進度控制器實例
const controller = new ProgressController();

console.log('重置前進度:', controller.getCurrentProgress());

// 方法1: 只重置進度到0（保留歷史記錄）
controller.reset();

console.log('重置後進度:', controller.getCurrentProgress());
console.log('歷史記錄數量:', controller.getHistory(100).length);

console.log('✅ 進度已重置為0');