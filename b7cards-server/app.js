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
//-----------------------添加内容
let deviceCounter = 1;
const deviceMap = new Map();

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
const clients = new Set();
app.ws.use(async(ctx) => {
  console.log("websocket 连接已经建立");
  clients.add(ctx.websocket);
  //------------------------------------------------
  const deviceIP = ctx.request.ip || ctx.socket.remoteAddress
  const deviceId = deviceCounter++
  // 存储设备信息
  deviceMap.set(deviceId, {
    ip: deviceIP,
    connectedAt: new Date()
  });
  // 发送欢迎消息包含设备ID
  ctx.websocket.send(JSON.stringify({
    type: 'system',
    content: `您的设备ID: ${deviceId}`,
    deviceId
  }));

  //-------------------------------------------------
  
  // 监听客户端发送的消息
  ctx.websocket.on('message', (msg) => {
    
    let message;
    if(Buffer.isBuffer(msg)){
      message = msg.toString('utf8');
    }else{
      message = msg
    }
    console.log('收到消息:', message);
    try{
      const parsedMsg = JSON.parse(message);
      console.log('解析后的消息:', parsedMsg);
      const response = {
        type: 'message',
        timestamp: Date.now(),
        content: `服务器已收到你的消息: ${parsedMsg.content}`,
        deviceId,//添加设备id
        original: parsedMsg
      };


      //ctx.websocket.send(JSON.stringify(response));
      clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify(response));
      }
    });
    }
    catch(err){
      console.log('解析消息失败:', err);
    }
  
  });
  // 监听连接关闭
  ctx.websocket.on('close', () => {
    console.log('WebSocket 连接已关闭');
  });
})
//-----------------------------------
setInterval(() => {
  console.log("当前连接设备:");
  deviceMap.forEach((info, id) => {
    console.log(`ID: ${id} | IP: ${info.ip} | 连接时间: ${info.connectedAt.toLocaleTimeString()}`);
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
