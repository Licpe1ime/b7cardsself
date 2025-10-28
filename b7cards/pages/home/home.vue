<template>
  <view class="container">
	<button @click="SynInformation" :disabled = "!canbutton"> 同步信息 </button>
	<button @click="gameStart" :disabled = "!isConnected && !canbutton"> 开始游戏 </button>
    
    <!-- 玩家列表 -->
    <view class="player-section">
      <h3>在线玩家 ({{ playerlist.length }})</h3>
      <ul>
        <li v-for="(item, index) in playerlist" :key="index">
          玩家{{ index+1 }}: {{ item.deviceId || item }}
        </li>
      </ul>
    </view>
    
    <!-- 玩家手牌 -->
    <view class="cards-section" v-if="playerCards.length > 0">
      <h3>你的手牌 ({{ playerCards.length }}张)</h3>
      <view class="cards-container">
        <view v-for="(card, index) in playerCards" :key="index" class="card-item">
          <view :class="['card', 'card-' + card.suit]">
            <text class="card-rank">{{ card.rank }}</text>
            <text class="card-suit">{{ getSuitSymbol(card.suit) }}</text>
          </view>
        </view>
      </view>
    </view>
    
  </view>
</template>

<script>


const app = getApp();
export default {
  
	data(){
		return{
			canbutton : false,
			isConnected : false ,
			playerlist:[],
			playerCards: []
		}
	},
  onLoad(){
    this.setupWebSocketListener();
  },
  methods: {
    setupWebSocketListener() {
      if (app.globalData.socketTask && app.globalData.isConnected) {
		  console.log("监听器设置成功")
		  this.canbutton = true;
        // 设置消息监听器
        app.globalData.socketTask.onMessage((res) => {
          console.log('Home页面收到WebSocket消息:', res);
          
          try {
            // 解析JSON消息
            const messageData = JSON.parse(res.data);
            if(messageData.type == 'syninformation'){
				console.log("进入到同步数组if")
              this.playerlist = messageData.content;
            }
         //----------分割每一条消息处理
		 //处理开始游戏后的消息处理
			if(messageData.type == 'alert'){
				console.log(messageData.content)
				uni.showToast({
					title:messageData.content,
					icon:'error',
					duration:2000
				})
			}
			if(messageData.type == "gameStartRes"){
				console.log("收到游戏开始响应，手牌信息:", messageData.content);
				this.playerCards = messageData.content.playerCards || [];
				uni.showToast({
					title: `游戏开始！获得${this.playerCards.length}张牌`,
					icon: 'success',
					duration: 2000
				});
			}
		 
		  } catch (error) {
            console.error('消息解析失败:', error, '原始数据:', res.data);
            // 处理非JSON格式消息
            
          }
        });
        
        this.isListening = true;
        console.log('Home页面WebSocket监听器已设置');
      } else {
        console.log('WebSocket未连接，无法设置监听器');
        // 可以设置定时器重试
        setTimeout(() => {
          this.setupWebSocketListener();
        }, 2000);
      }
    },
    SynInformation(){
		console.log("是否成功连接" + app.globalData.isConnected);
		console.log("socketTask:" + app.globalData.socketTask);
      if (app.globalData.isConnected && app.globalData.socketTask) {
					const message = {
						type: 'system',
						reqmethoud : 'syninformation',
						playerid : app.globalData.diviceid,
            
					};
					
					app.globalData.socketTask.send({
						data: JSON.stringify(message),
						success: () => {
							//----------在连接成功的回调中设置监听函数-------------------------
							this.isConnected = true
							console.log('同步信息成功');
							
							
						},
						fail: (err) => {
							console.error('同步用户信息失败:', err);
							
						}
					});
				} else {
					uni.showToast({
						title: 'WebSocket未连接',
						icon: 'none'
					});
				}
    },
    gameStart(){
		const message = {
			type: 'gameStart',
			reqmethoud : 'user',
			playerid : app.globalData.diviceid,
		            };
			app.globalData.socketTask.send({
				data: JSON.stringify(message),
				success: () => {
					//----------在连接成功的回调中设置监听函数-------------------------
					this.isConnected = true
					console.log('发送开始游戏请求');
					
					
				},
				fail: (err) => {
					console.error('发送卡开始请求失败:', err);
							
				}
			});
		
	},
    getSuitSymbol(suit) {
      switch(suit) {
        case 'hearts': return '♥';
        case 'spades': return '♠';
        case 'clubs': return '♣';
        case 'diamonds': return '♦';
        default: return suit;
      }
    }
    // goToTest() {
    //   uni.navigateTo({
    //     url: '/pages/index/index'
    //   });
    // }
  }
}
</script>

<style>
.container {
  padding: 20px;
}
.title {
  font-size: 24px;
  font-weight: bold;
}

.player-section {
  margin: 20px 0;
  padding: 15px;
  background-color: #f5f5f5;
  border-radius: 8px;
}

.player-section h3 {
  margin-bottom: 10px;
  color: #333;
}

.cards-section {
  margin: 20px 0;
  padding: 15px;
  background-color: #f9f9f9;
  border-radius: 8px;
}

.cards-section h3 {
  margin-bottom: 15px;
  color: #333;
}

.cards-container {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.card-item {
  width: 60px;
  height: 80px;
}

.card {
  width: 100%;
  height: 100%;
  border: 1px solid #ccc;
  border-radius: 5px;
  background-color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  position: relative;
}

.card-hearts {
  color: #e74c3c;
  border-color: #e74c3c;
}

.card-diamonds {
  color: #e74c3c;
  border-color: #e74c3c;
}

.card-spades {
  color: #2c3e50;
  border-color: #2c3e50;
}

.card-clubs {
  color: #2c3e50;
  border-color: #2c3e50;
}

.card-rank {
  font-size: 16px;
  font-weight: bold;
}

.card-suit {
  font-size: 20px;
  margin-top: 5px;
}

ul {
  list-style-type: none;
  padding: 0;
}

li {
  padding: 5px 0;
  border-bottom: 1px solid #eee;
}
</style>