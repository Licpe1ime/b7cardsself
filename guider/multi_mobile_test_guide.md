# 多部手机测试多人游戏指南

## 1. 环境准备
- **开发电脑IP**: `192.168.x.x` (替换为您的实际IP)
- **手机与电脑连接同一WiFi**

## 2. 后端配置
修改 `b7cards-server/app.js`:
```javascript
app.listen(3001, '0.0.0.0'); // 监听所有网络接口
```

## 3. 前端配置
修改 `b7cards/pages/index/index.vue`:
```javascript
const socketUrl = 'ws://192.168.x.x:3001'; // 替换为实际IP
```

## 4. 防火墙设置
1. 控制面板 → 系统和安全 → Windows Defender 防火墙
2. 高级设置 → 入站规则 → 新建规则
3. 选择"端口" → TCP/3001 → 允许连接

## 5. 多人游戏逻辑
- **服务器需为每个连接分配唯一ID**。
- **前端需发送玩家操作到服务器**，服务器广播给其他玩家。

## 6. 运行测试
1. 启动后端:
```bash
cd b7cards-server
node app.js
```

2. 在每部手机上运行前端应用并连接到服务器。