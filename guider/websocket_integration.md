# WebSocket 集成与前后端通信指南

## 1. 在 `app.js` 中集成 WebSocket

### 安装依赖
```bash
npm install koa-websocket ws
```

### 修改 `app.js`
```javascript
const Koa = require('koa');
const websockify = require('koa-websocket');
const app = websockify(new Koa());

// HTTP 路由
app.use(async ctx => {
  ctx.body = 'HTTP 服务已启动';
});

// WebSocket 路由
app.ws.use(async (ctx) => {
  console.log('WebSocket 连接已建立');

  // 监听客户端消息
  ctx.websocket.on('message', (message) => {
    console.log('收到消息:', message);
    
    // 回复客户端
    ctx.websocket.send(`服务器收到: ${message}`);
  });

  // 监听连接关闭
  ctx.websocket.on('close', () => {
    console.log('WebSocket 连接已关闭');
  });
});

// 启动服务
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`服务运行在 http://localhost:${PORT}`);
});
```

## 2. 前端 WebSocket 通信

### HTML + JavaScript 示例
```html
<!DOCTYPE html>
<html>
<head>
  <title>WebSocket 测试</title>
</head>
<body>
  <input id="message" placeholder="输入消息" />
  <button onclick="sendMessage()">发送</button>
  <div id="output"></div>

  <script>
    const socket = new WebSocket('ws://localhost:3000');

    // 连接建立
    socket.onopen = () => {
      console.log('已连接到服务器');
    };

    // 接收消息
    socket.onmessage = (event) => {
      document.getElementById('output').innerHTML += `<p>服务器回复: ${event.data}</p>`;
    };

    // 发送消息
    function sendMessage() {
      const message = document.getElementById('message').value;
      socket.send(message);
    }
  </script>
</body>
</html>
```

## 3. 核心功能实现

### 广播消息（群发）
```javascript
const clients = new Set();

app.ws.use(async (ctx) => {
  clients.add(ctx.websocket);

  ctx.websocket.on('message', (message) => {
    // 广播给所有客户端
    clients.forEach(client => {
      if (client !== ctx.websocket && client.readyState === WebSocket.OPEN) {
        client.send(`广播: ${message}`);
      }
    });
  });

  ctx.websocket.on('close', () => {
    clients.delete(ctx.websocket);
  });
});
```

### 房间管理（分组通信）
```javascript
const rooms = {};

app.ws.use(async (ctx) => {
  const roomId = ctx.query.roomId; // 从 URL 参数获取房间号
  if (!rooms[roomId]) rooms[roomId] = new Set();
  rooms[roomId].add(ctx.websocket);

  ctx.websocket.on('message', (message) => {
    // 仅广播给同房间用户
    rooms[roomId].forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(`房间消息: ${message}`);
      }
    });
  });
});
```

## 4. 调试工具
- **后端调试**：使用 `console.log` 输出 WebSocket 事件。
- **前端调试**：浏览器开发者工具 → Network → WS 标签。

## 5. 部署注意事项
- **Nginx 配置**：需代理 WebSocket 连接。
  ```nginx
  location /ws {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
  }
  ```

## 6. 学习资源
- [WebSocket API 文档](https://developer.mozilla.org/zh-CN/docs/Web/API/WebSocket)
- [koa-websocket GitHub](https://github.com/kudos/koa-websocket)

---

这份文档已生成在 `guider` 目录下，文件名为 `websocket_integration.md`。