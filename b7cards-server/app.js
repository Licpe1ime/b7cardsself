const Koa = require('koa')

const views = require('koa-views')
const json = require('koa-json')
const onerror = require('koa-onerror')
const bodyparser = require('koa-bodyparser')
const cors = require('@koa/cors');
const router = require('koa-router')()
const logger = require('koa-logger')
const websockify = require('koa-websocket');
const app = websockify(new Koa());
const index = require('./routes/index')
const users = require('./routes/users')
const url = require('url')
//-----------------------添加内容


//--------------------------------

// error handler
onerror(app)

// middlewares
app.use(cors())
app.use(bodyparser({
  enableTypes:['json', 'form', 'text']
}))
app.use(json())
app.use(logger())
app.use(require('koa-static')(__dirname + '/public'))

app.use(views(__dirname + '/views', {
  extension: 'ejs'
}))

// logger
app.use(async (ctx, next) => {
  const start = new Date()
  await next()
  const ms = new Date() - start
  console.log(`${ctx.method} ${ctx.url} - ${ms}ms`)
})

// routes
app.use(index.routes(), index.allowedMethods())
app.use(users.routes(), users.allowedMethods())
//web-socker routes
const clients = new Map();
app.ws.use(async(ctx) => {
  console.log("websocket 连接已经建立");
  try{
    const parsedUrl = url.parse(ctx.request.url, true);
    const deviceId = parsedUrl.query.deviceId;
    console.log("设备ID：" + deviceId);
    if(!deviceId){
      ctx.websocket.close(1000,"设备ID不存在")
    
    }
    if(clients.has(deviceId)){
      clients.get(deviceId).close(1000,"设备ID已存在")

      clients.set(deviceId,ctx.websocket)
    }
    if(clients.size>3){
      ctx.websocket.close(1000,"设备数量已达上限")
    
    }
    // 获取设备IP
    const deviceIP = ctx.request.headers['x-real-ip'] || 
                    ctx.request.ip || 
                    ctx.socket.remoteAddress;

    ctx.websocket._connectedAt = Date.now(); // 连接时间
    ctx.websocket._lastActive = Date.now();  // 最后活动时间
    ctx.websocket._ip = deviceIP; 
    clients.set(deviceId,ctx.websocket)
    
    console.log(`新设备连接: ${deviceId}`);
    console.log("当前设备数: " + clients.size);
  //clients.add(ctx.websocket);
  //------------------------------------------------
  //const deviceIP = ctx.request.ip || ctx.socket.remoteAddress
  //const deviceId = deviceCounter++
  // 存储设备信息
  // deviceMap.set(deviceId, {
  //   ip: deviceIP,
  //   connectedAt: new Date()
  // });
  // 发送欢迎消息包含设备ID
    clients.forEach((socket, deviceId) => {
  if (socket.readyState === 1) {
    socket.send(JSON.stringify({
      type: 'system',
      content: `当前在线设备数: ${clients.size}`,
      deviceId
    }));
     }
    });
  }
  catch(err){
    console.log("websocket 连接建立失败" + err);
    
  }
  


  //-------------------------------------------------
  
  // 监听客户端发送的消息
  ctx.websocket.on("close",(code,reason) =>{
    console.log("识别到关闭请求");
    console.log('原始 reason:', typeof reason, reason); // 检查是否为字符串
    let reasonStr;
    if (Buffer.isBuffer(reason)) {
    reasonStr = reason.toString('utf8'); // 二进制转字符串
  } else if (typeof reason === 'string') {
    reasonStr = reason;
  } else {
    console.log('未知的 reason 类型:', typeof reason, reason);
    return;
  }
    try {
    const closeData = JSON.parse(reasonStr); // 解析 reason
    if (closeData.type === 'close' && closeData.deviceId) {
      console.log(`设备 ${closeData.deviceId} 主动退出，原因: ${closeData.reason}`);
      if (clients.has(closeData.deviceId)) {
        clients.get(closeData.deviceId).close(1000, reason); // 关闭连接
        clients.delete(closeData.deviceId); // 清理 Map
      }
      
    }
  } catch (err) {
    console.log('普通关闭，未携带额外信息', reason);
  }
  })


  ctx.websocket.on('message', (msg) => {
    //console.log("收到消息：" + msg);
    let message;
    if(Buffer.isBuffer(msg)){
      message = msg.toString('utf8');
    }else{
      message = msg
    }
    if (!message || typeof message !== 'string') {
    console.log('无效的消息格式:', message);
    return;
    }
    if (ctx.websocket.readyState !== 1) {
    console.log('连接已关闭，忽略消息');
    return;
  }
    console.log('收到消息:', message);
     
    //===============这里有严重错误
    try{
       const parsedMsg = JSON.parse(message);
       
      // if (parsedMsg.type === 'close'){
      //   const puid = parsedMsg.deviceId
      //   if(clients.has(puid)){
      //     clients.get(puid).close(1000,"用户：" + puid + "已退出")
      //     clients.delete(puid);
      //   }
      // return;
      // }

     }
    catch(err){
      console.log('解析消息失败:', err);
    }










//     try{
//       const parsedMsg = JSON.parse(message);
//       console.log('解析后的消息:', parsedMsg);
//       const response = {
//         type: 'message',
//         timestamp: Date.now(),
//         content: `服务器已收到你的消息: ${parsedMsg.content}`,
//         deviceId,//添加设备id
//         original: parsedMsg
//       };

// //--------------消息广播-------------------------------
//       //ctx.websocket.send(JSON.stringify(response));
//       clients.forEach(client => {
//       if (client.readyState === 1) {
//         client.send(JSON.stringify(response));
//       }
//     });
//     }
//     catch(err){
//       console.log('解析消息失败:', err);
//     }
  
  // });
  // // 监听连接关闭
  // ctx.websocket.on('close', () => {
  //   console.log('WebSocket 连接已关闭');
   });
})
//-----------------------------------
setInterval(() => {
  if (clients.size === 0) {
    console.log('当前没有连接的设备');
    return;
  }
  
  console.log(`当前连接设备数: ${clients.size}`);
  
  // 遍历所有设备连接
  clients.forEach((socket, deviceId) => {
    // 获取连接状态
    const status = socket.readyState === 1 ? '在线' : '离线';
    
    // 获取连接时间（如果已存储）
    const connectedAt = socket._connectedAt ? 
      ` | 连接时间: ${new Date(socket._connectedAt).toLocaleTimeString()}` : 
      '';
    
    // 获取最后活动时间（如果已存储）
    const lastActive = socket._lastActive ? 
      ` | 最后活动: ${Math.floor((Date.now() - socket._lastActive)/1000)}秒前` : 
      '';
    
    // 获取IP地址（如果已存储）
    const ip = socket._ip ? ` | IP: ${socket._ip}` : '';
    
    console.log(`设备ID: ${deviceId} | 状态: ${status}${connectedAt}${lastActive}${ip}`);
  });
}, 30000);
//-----------------------------------
// 错误处理
app.on('error', (err, ctx) => {
  console.error('服务器错误', err, ctx);
});



// error-handling
app.on('error', (err, ctx) => {
  console.error('server error', err, ctx)
});

module.exports = app
