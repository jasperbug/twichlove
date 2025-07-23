const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

class ProgressWebSocketServer {
    constructor(port = 8080) {
        this.port = port;
        this.server = null;
        this.wss = null;
        this.clients = new Set();
        this.currentProgress = 0;
        
        this.setupServer();
    }

    setupServer() {
        // 創建 HTTP 服務器來提供靜態文件
        this.server = http.createServer((req, res) => {
            this.handleHttpRequest(req, res);
        });

        // 創建 WebSocket 服務器
        this.wss = new WebSocket.Server({ server: this.server });
        
        this.wss.on('connection', (ws, req) => {
            console.log('🔗 新的進度條連接');
            this.clients.add(ws);
            
            // 發送當前進度給新連接的客戶端
            ws.send(JSON.stringify({
                type: 'progress_update',
                progress: this.currentProgress,
                timestamp: new Date().toISOString()
            }));
            
            ws.on('close', () => {
                console.log('🔌 進度條連接已斷開');
                this.clients.delete(ws);
            });
            
            ws.on('error', (error) => {
                console.error('WebSocket 錯誤:', error);
                this.clients.delete(ws);
            });
        });
    }

    handleHttpRequest(req, res) {
        let filePath = req.url === '/' ? '/vertical-progress-bar.html' : req.url;
        filePath = path.join(__dirname, filePath);
        
        // 安全檢查，防止路徑遍歷
        if (!filePath.startsWith(__dirname)) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }
        
        // 檢查文件是否存在
        if (!fs.existsSync(filePath)) {
            res.writeHead(404);
            res.end('File not found');
            return;
        }
        
        // 設定內容類型
        const ext = path.extname(filePath);
        const contentType = {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
            '.json': 'application/json'
        }[ext] || 'text/plain';
        
        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
    }

    // 更新進度並廣播給所有客戶端
    updateProgress(progress, metadata = {}) {
        this.currentProgress = progress;
        
        const message = JSON.stringify({
            type: 'progress_update',
            progress: progress,
            metadata: metadata,
            timestamp: new Date().toISOString()
        });
        
        // 廣播給所有連接的客戶端
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
        
        console.log(`📡 廣播進度更新: ${progress}% (${this.clients.size} 個客戶端)`);
    }

    // 發送情感分析結果
    sendAnalysisResult(analysis, progressChange) {
        const message = JSON.stringify({
            type: 'analysis_result',
            analysis: analysis,
            progressChange: progressChange,
            timestamp: new Date().toISOString()
        });
        
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

    // 發送聊天訊息
    sendChatMessage(chatMessage) {
        const message = JSON.stringify({
            type: 'chat_message',
            username: chatMessage.username,
            text: chatMessage.text,
            timestamp: new Date().toISOString()
        });
        
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

    // 啟動服務器
    start() {
        return new Promise((resolve, reject) => {
            // 檢查服務器是否已經在監聽
            if (this.server.listening) {
                console.log(`⚡ WebSocket 服務器已在運行中 (埠號 ${this.port})`);
                resolve();
                return;
            }
            
            this.server.listen(this.port, (error) => {
                if (error) {
                    if (error.code === 'EADDRINUSE') {
                        console.log(`⚡ 埠號 ${this.port} 已被占用，WebSocket 服務器可能已在運行`);
                        resolve();
                    } else {
                        reject(error);
                    }
                } else {
                    console.log(`🚀 WebSocket 服務器啟動成功`);
                    console.log(`📺 進度條網址: http://localhost:${this.port}`);
                    console.log(`🔗 WebSocket 端點: ws://localhost:${this.port}`);
                    resolve();
                }
            });
        });
    }

    // 停止服務器
    stop() {
        return new Promise((resolve) => {
            // 關閉所有客戶端連接
            this.clients.forEach(client => {
                client.close();
            });
            this.clients.clear();
            
            // 關閉服務器
            if (this.server) {
                this.server.close(() => {
                    console.log('🛑 WebSocket 服務器已關閉');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    // 獲取連接狀態
    getStatus() {
        return {
            port: this.port,
            clients: this.clients.size,
            currentProgress: this.currentProgress,
            isRunning: this.server && this.server.listening
        };
    }
}

// 測試功能
if (require.main === module) {
    const server = new ProgressWebSocketServer(8080);
    
    server.start().then(() => {
        console.log('伺服器啟動成功！請在瀏覽器中開啟 http://localhost:8080');
        
        // 測試進度更新
        let progress = 0;
        setInterval(() => {
            progress = (progress + 5) % 201 - 100; // -100 到 100 循環
            server.updateProgress(progress, { type: 'test', description: '測試更新' });
        }, 2000);
    }).catch(error => {
        console.error('啟動失敗:', error);
    });
    
    // 優雅關閉
    process.on('SIGINT', async () => {
        console.log('\n正在關閉服務器...');
        await server.stop();
        process.exit(0);
    });
}

module.exports = ProgressWebSocketServer;