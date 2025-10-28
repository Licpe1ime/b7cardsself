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

// 获取花色符号的辅助函数
function getSuitSymbol(suit) {
  switch(suit) {
    case 'hearts': return '♥';
    case 'spades': return '♠';
    case 'clubs': return '♣';
    case 'diamonds': return '♦';
    default: return suit;
  }
}

// 初始化牌堆（憋七游戏开始时，牌堆为空）
function initializePiles() {
  // 清空所有牌堆
  Object.keys(gamePiles).forEach(suit => {
    gamePiles[suit] = [];
  });
  
  console.log('牌堆初始化完成（空牌堆）');
}

// 检查玩家是否有7
function hasSevenInHand(playerId) {
  const hand = playerHands.get(playerId) || [];
  return hand.some(card => card.rank === '7');
}

// 检查是否可以出牌到指定牌堆（憋七规则）
function canPlayToPile(card, suit, playerId) {
  const pile = gamePiles[suit];
  
  // 检查花色是否匹配
  if (card.suit !== suit) {
    return false;
  }
  
  // 如果玩家手中有7，必须先出7
  if (hasSevenInHand(playerId) && card.rank !== '7') {
    return false;
  }
  
  if (pile.length === 0) {
    // 如果牌堆为空，只能出7
    return card.rank === '7';
  }
  
  // 获取牌堆的队尾（最上面的牌）和队头（最下面的牌）
  const tailCard = pile[pile.length - 1].card;
  const headCard = pile[0].card;
  
  const cardValue = card.value;
  const tailCardValue = tailCard.value;
  const headCardValue = headCard.value;
  
  // 检查是否可以接在队尾（向上接龙）
  const canPlayToTail = Math.abs(cardValue - tailCardValue) === 1;
  
  // 检查是否可以接在队头（向下接龙）
  const canPlayToHead = Math.abs(cardValue - headCardValue) === 1;
  
  console.log(`出牌检查: ${card.rank}${getSuitSymbol(card.suit)} -> 队尾${tailCard.rank}${getSuitSymbol(tailCard.suit)}(${tailCardValue}) 队头${headCard.rank}${getSuitSymbol(headCard.suit)}(${headCardValue}), 尾插: ${canPlayToTail}, 头插: ${canPlayToHead}`);
  
  // 只要能在队尾或队头接龙就可以出牌
  return canPlayToTail || canPlayToHead;
}

// 出牌到牌堆
function playCardToPile(card, suit, playerId) {
  const pile = gamePiles[suit];
  
  if (pile.length === 0) {
    // 空牌堆，直接添加
    gamePiles[suit].push({
      card: card,
      playedBy: playerId,
      timestamp: Date.now(),
      pileIndex: 0
    });
    return true;
  }
  
  // 获取牌堆的队尾和队头
  const tailCard = pile[pile.length - 1].card;
  const headCard = pile[0].card;
  
  const cardValue = card.value;
  const tailCardValue = tailCard.value;
  const headCardValue = headCard.value;
  
  // 检查是否可以接在队尾（向上接龙）
  const canPlayToTail = Math.abs(cardValue - tailCardValue) === 1;
  
  // 检查是否可以接在队头（向下接龙）
  const canPlayToHead = Math.abs(cardValue - headCardValue) === 1;
  
  if (!canPlayToTail && !canPlayToHead) {
    return false;
  }
  
  if (canPlayToTail) {
    // 尾插：添加到牌堆末尾
    gamePiles[suit].push({
      card: card,
      playedBy: playerId,
      timestamp: Date.now(),
      pileIndex: pile.length
    });
    console.log(`尾插成功: ${card.rank}${getSuitSymbol(card.suit)} -> 队尾${tailCard.rank}${getSuitSymbol(tailCard.suit)}`);
  } else if (canPlayToHead) {
    // 头插：添加到牌堆开头
    gamePiles[suit].unshift({
      card: card,
      playedBy: playerId,
      timestamp: Date.now(),
      pileIndex: 0
    });
    
    // 更新后续牌的索引
    for (let i = 1; i < gamePiles[suit].length; i++) {
      gamePiles[suit][i].pileIndex = i;
    }
    console.log(`头插成功: ${card.rank}${getSuitSymbol(card.suit)} -> 队头${headCard.rank}${getSuitSymbol(headCard.suit)}`);
  }
  
  // 从玩家手牌中移除这张牌
  const hand = playerHands.get(playerId) || [];
  const cardIndex = hand.findIndex(c => c.id === card.id);
  if (cardIndex > -1) {
    hand.splice(cardIndex, 1);
    playerHands.set(playerId, hand);
  }
  
  return true;
}

// 获取牌堆信息
function getPileInfo(suit) {
  const pile = gamePiles[suit];
  return {
    suit: suit,
    count: pile.length,
    topCard: pile.length > 0 ? pile[pile.length - 1].card : null,
    playedBy: pile.length > 0 ? pile[pile.length - 1].playedBy : null,
    cards: pile.map(entry => ({
      card: entry.card,
      playedBy: entry.playedBy,
      timestamp: entry.timestamp
    }))
  };
}

// 获取所有牌堆信息
function getAllPilesInfo() {
  return {
    hearts: getPileInfo('hearts'),
    spades: getPileInfo('spades'),
    diamonds: getPileInfo('diamonds'),
    clubs: getPileInfo('clubs')
  };
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

// 四个牌堆的数据结构
const gamePiles = {
  hearts: [],    // 红心牌堆
  spades: [],    // 黑桃牌堆
  diamonds: [],  // 方块牌堆
  clubs: []      // 梅花牌堆
};

// 存储玩家手牌信息
const playerHands = new Map();

// 出牌权轮换相关变量
let currentPlayerIndex = 0;
let playerOrder = [];
let gameStarted = false;
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
          
          // 初始化出牌权轮换
          playerOrder = Array.from(clients.keys());
          // 随机决定起始玩家
          currentPlayerIndex = Math.floor(Math.random() * playerOrder.length);
          gameStarted = true;
          
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
            // 存储玩家手牌
            playerHands.set(deviceId, playerDeck);
            
            // 发送牌给玩家
            let gameStartMsg = JSON.stringify({
              type: 'gameStartRes',
              content: {
                playerCards: playerDeck,
                totalPlayers: members,
                cardsCount: playerDeck.length,
                hasSeven: playerDeck.some(card => card.rank === '7'),
                currentPlayer: playerOrder[currentPlayerIndex],
                isYourTurn: deviceId === playerOrder[currentPlayerIndex]
              },
              deviceId: deviceId
            });
            socket.send(gameStartMsg);
          });
          
          console.log(`游戏开始，${members}名玩家，每人${cardsPerPlayer}张牌`);
          // 初始化牌堆
          initializePiles();
        }
      }
      //-----------------处理Pass消息
      if(parsedMsg.type === 'passTurn'){
        const playerId = parsedMsg.playerid;
        
        console.log(`玩家 ${playerId} 请求Pass`);
        
        // 检查玩家是否存在
        if (!clients.has(playerId)) {
          console.log(`玩家 ${playerId} 不存在`);
          return;
        }
        
        // 检查出牌权
        if (gameStarted && playerOrder[currentPlayerIndex] !== playerId) {
          console.log(`玩家 ${playerId} 没有出牌权，当前轮到 ${playerOrder[currentPlayerIndex]}`);
          
          // 发送失败消息
          const failMsg = JSON.stringify({
            type: 'passFail',
            content: `Pass失败: 现在轮到玩家 ${playerOrder[currentPlayerIndex]} 出牌`
          });
          clients.get(playerId).send(failMsg);
          return;
        }
        
        // 检查玩家手牌中是否有7
        const playerHand = playerHands.get(playerId) || [];
        const hasSeven = playerHand.some(card => card.rank === '7');
        
        if (hasSeven) {
          console.log(`玩家 ${playerId} 手中有7，不能Pass`);
          
          // 发送失败消息
          const failMsg = JSON.stringify({
            type: 'passFail',
            content: `Pass失败: 你手中有7，必须先出7`
          });
          clients.get(playerId).send(failMsg);
          return;
        }
        
        // Pass成功，轮换出牌权
        console.log(`玩家 ${playerId} Pass成功`);
        
        // 轮换出牌权到下一个玩家
        currentPlayerIndex = (currentPlayerIndex + 1) % playerOrder.length;
        const nextPlayer = playerOrder[currentPlayerIndex];
        
        // 广播Pass成功消息给所有玩家
        const passSuccessMsg = JSON.stringify({
          type: 'passSuccess',
          content: {
            passedBy: playerId,
            nextPlayer: nextPlayer,
            message: `玩家 ${playerId} 选择Pass，轮到玩家 ${nextPlayer} 出牌`
          }
        });
        
        clients.forEach((socket, deviceId) => {
          if (socket.readyState === 1) {
            socket.send(passSuccessMsg);
          }
        });
        
        // 发送成功消息给Pass玩家
        const successMsg = JSON.stringify({
          type: 'passSuccess',
          content: {
            passedBy: playerId,
            nextPlayer: nextPlayer,
            message: `Pass成功，轮到玩家 ${nextPlayer} 出牌`
          }
        });
        clients.get(playerId).send(successMsg);
        
        console.log(`出牌权转交给玩家 ${nextPlayer}`);
      }
      //-----------------处理出牌消息
      if(parsedMsg.type === 'playCard'){
        const playerId = parsedMsg.playerid;
        const card = parsedMsg.card;
        
        console.log(`玩家 ${playerId} 尝试出牌: ${card.suit}_${card.rank}`);
        
        // 检查玩家是否有这张牌
        if (!clients.has(playerId)) {
          console.log(`玩家 ${playerId} 不存在`);
          return;
        }
        
        // 检查出牌权
        if (gameStarted && playerOrder[currentPlayerIndex] !== playerId) {
          console.log(`玩家 ${playerId} 没有出牌权，当前轮到 ${playerOrder[currentPlayerIndex]}`);
          
          // 发送失败消息
          const failMsg = JSON.stringify({
            type: 'playCardFail',
            content: `出牌失败: 现在轮到玩家 ${playerOrder[currentPlayerIndex]} 出牌`
          });
          clients.get(playerId).send(failMsg);
          return;
        }
        
        // 检查玩家手牌中是否有这张牌
        const playerHand = playerHands.get(playerId) || [];
        const hasCard = playerHand.some(c => c.id === card.id);
        if (!hasCard) {
          console.log(`玩家 ${playerId} 没有这张牌`);
          
          // 发送失败消息
          const failMsg = JSON.stringify({
            type: 'playCardFail',
            content: `出牌失败: 你没有这张牌`
          });
          clients.get(playerId).send(failMsg);
          return;
        }
        
        // 尝试出牌到对应花色的牌堆
        const success = playCardToPile(card, card.suit, playerId);
        
        if (success) {
          console.log(`出牌成功: ${card.suit}_${card.rank} 到 ${card.suit}牌堆`);
          
          // 轮换出牌权
          currentPlayerIndex = (currentPlayerIndex + 1) % playerOrder.length;
          const nextPlayer = playerOrder[currentPlayerIndex];
          
          // 广播牌堆更新信息给所有玩家
          const pileUpdateMsg = JSON.stringify({
            type: 'pileUpdate',
            content: {
              pileInfo: getAllPilesInfo(),
              playedCard: card,
              playedBy: playerId,
              remainingCards: playerHands.get(playerId).length,
              currentPlayer: nextPlayer
            }
          });
          
          clients.forEach((socket, deviceId) => {
            if (socket.readyState === 1) {
              socket.send(pileUpdateMsg);
            }
          });
          
          // 发送成功消息给出牌玩家
          const successMsg = JSON.stringify({
            type: 'playCardSuccess',
            content: `出牌成功: ${card.rank}${getSuitSymbol(card.suit)}`,
            hasSeven: hasSevenInHand(playerId), // 告知玩家是否还有7
            nextPlayer: nextPlayer
          });
          clients.get(playerId).send(successMsg);
          
        } else {
          console.log(`出牌失败: ${card.suit}_${card.rank} 不符合规则`);
          
          // 检查失败原因
          let failReason = '不符合出牌规则';
          if (hasSevenInHand(playerId) && card.rank !== '7') {
            failReason = '你手中有7，必须先出7';
          }
          
          // 发送失败消息给出牌玩家
          const failMsg = JSON.stringify({
            type: 'playCardFail',
            content: `出牌失败: ${card.rank}${getSuitSymbol(card.suit)} ${failReason}`,
            hasSeven: hasSevenInHand(playerId)
          });
          clients.get(playerId).send(failMsg);
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
