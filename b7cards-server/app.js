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
const { buffer } = require('stream/consumers')
const { type } = require('os')
//-----------------------添加内容
// 获取牌面值的辅助函数
function getCardValue(rank) {
  switch(rank) {
    case 'A': return 1;
    case 'J': return 11;
    case 'Q': return 12;
    case 'K': return 13;
    default: return parseInt(rank);
  }
}
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
  //关闭处理
  ctx.websocket.on('close', (code, reason) => {
    
    if(Buffer.isBuffer(reason)){
    //clients.delete(deviceId); 
    message = reason.toString('utf8');
    let constmsg = JSON.parse(message)
    const deviceId = constmsg.deviceId
    clients.delete(deviceId)
    
    console.log(`设备 ${deviceId} 已关闭`+ "原因：" + constmsg.reason);
   }

  })


  //-------------------------------------------------
  
  // 监听客户端发送的消息
  ctx.websocket.on('message', (msg) => {
    
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
    console.log('收到消息:', message);
     
    
    try{
       const parsedMsg = JSON.parse(message);


       //----------这里做消息的判别处理
      if (parsedMsg.type === 'close'){
        console.log("收到关闭消息")
        const puid = parsedMsg.deviceId
        if(clients.has(puid)){
          clients.get(puid).close(1000,"用户：" + puid + "已退出")
          clients.delete(puid);
        }
      return;
      }
      //注意这里接收用的是system但是回传用的不是system
      if(parsedMsg.type === 'system'){
        const reqmthuoud = parsedMsg.reqmethoud
        if(reqmthuoud === 'syninformation'){
          if(clients.has(parsedMsg.playerid)){
            let arr = []
            clients.forEach((socket, deviceId) => {
              let a = 0
              //在这里添加push的代码
              arr.push({deviceId})
              
              console.log("同步到的玩家信息:" + a + "  " + arr[a]);
              a++;
            })
            let msg = JSON.stringify({
              type: 'syninformation',
              content: arr,

            })
            clients.get(parsedMsg.playerid).send(msg);
            console.log("同步信息给玩家：" + parsedMsg.playerid + "  " + msg);
          }
        }

      }
      //-----------------处理开始游戏后的发牌操作
      if(parsedMsg.type === 'gameStart'){
        if(clients.size < 2){
          clients.forEach((socket, deviceId) => {
            let mse = JSON.stringify({
              type: 'alert',
              content: "人数不足2，无法开始",
              deviceId: deviceId
            })
            socket.send(mse)
          })
        }
        //-------不是一个人开始游戏
        else{
          let members = clients.size;
          
          // 创建一副52张扑克牌
          const suits = ['hearts', 'spades', 'clubs', 'diamonds']; // 红心、黑桃、梅花、方块
          const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
          
          let deck = [];
          // 生成完整的扑克牌
          suits.forEach(suit => {
            ranks.forEach(rank => {
              deck.push({
                suit: suit,
                rank: rank,
                value: getCardValue(rank),
                id: suit + '_' + rank
              });
            });
          });
          
          // 洗牌算法
          for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
          }
          
          // 计算每个玩家应该获得的牌数
          const cardsPerPlayer = Math.floor(52 / members);
          const remainingCards = 52 % members;
          
          // 给每个玩家发牌
          let playerCards = new Map();
          let cardIndex = 0;
          
          clients.forEach((socket, deviceId) => {
            let playerDeck = [];
            
            // 给玩家发牌
            for (let i = 0; i < cardsPerPlayer; i++) {
              if (cardIndex < deck.length) {
                playerDeck.push(deck[cardIndex]);
                cardIndex++;
              }
            }
            
            // 如果有剩余的牌，给前几个玩家各多发一张
            if (remainingCards > 0 && Array.from(clients.keys()).indexOf(deviceId) < remainingCards) {
              if (cardIndex < deck.length) {
                playerDeck.push(deck[cardIndex]);
                cardIndex++;
              }
            }
            
            playerCards.set(deviceId, playerDeck);
            
            // 发送牌给玩家
            let gameStartMsg = JSON.stringify({
              type: 'gameStartRes',
              content: {
                playerCards: playerDeck,
                totalPlayers: members,
                cardsCount: playerDeck.length
              },
              deviceId: deviceId
            });
            socket.send(gameStartMsg);
          });
          
          console.log(`游戏开始，${members}名玩家，每人${cardsPerPlayer}张牌`);
        }
      }
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
