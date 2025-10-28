<template>
  <view class="container">
	<button @click="SynInformation" :disabled = "!canbutton"> 同步信息 </button>
	<button @click="gameStart" :disabled = "!isConnected && !canbutton"> 开始游戏 </button>
    
    <!-- 出牌权显示 -->
    <view class="turn-section" v-if="gameStatus === 'playing' && currentPlayer">
      <view :class="['turn-indicator', isYourTurn ? 'your-turn' : 'other-turn']">
        <text v-if="isYourTurn" class="turn-text">🎮 轮到您出牌</text>
        <text v-else class="turn-text">⏳ 轮到玩家 {{ currentPlayer }} 出牌</text>
      </view>
    </view>
    
    <!-- 牌堆显示 -->
    <view class="piles-section" v-if="gamePiles">
      <h3>牌堆</h3>
      <view class="piles-container">
        <view v-for="(pile, suit) in gamePiles" :key="suit" class="pile-item">
          <view :class="['pile', 'pile-' + suit]">
            <text class="pile-suit">{{ getSuitSymbol(suit) }}</text>
            <text class="pile-count">{{ pile.count }}张</text>
            
            <!-- 显示完整的牌堆序列 -->
            <view class="pile-cards" v-if="pile.cards && pile.cards.length > 0">
              <view class="pile-sequence">
                <text class="pile-sequence-label">牌堆序列:</text>
                <view class="card-sequence">
                  <text 
                    v-for="(entry, index) in pile.cards" 
                    :key="index"
                    :class="['sequence-card', entry.card.rank === '7' ? 'seven-card' : '']"
                  >
                    {{ entry.card.rank }}{{ getSuitSymbol(entry.card.suit) }}
                    <span v-if="index < pile.cards.length - 1">→</span>
                  </text>
                </view>
              </view>
            </view>
            
            <text v-else class="pile-empty">空</text>
            <text v-if="pile.playedBy" class="pile-player">
              最后出牌: {{ pile.playedBy }}
            </text>
          </view>
        </view>
      </view>
    </view>
    
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
      
      <!-- 选中的牌 -->
      <view class="selected-section" v-if="selectedCard">
        <h4>已选牌</h4>
        <view class="selected-cards">
          <view class="card-item">
            <view :class="['card', 'card-' + selectedCard.suit, 'selected']">
              <text class="card-rank">{{ selectedCard.rank }}</text>
              <text class="card-suit">{{ getSuitSymbol(selectedCard.suit) }}</text>
            </view>
          </view>
        </view>
        <view class="action-buttons">
          <button @click="playCard" class="play-btn">出牌</button>
          <button @click="clearSelection" class="clear-btn">取消选择</button>
        </view>
        
        <!-- Pass按钮 -->
        <view class="pass-section" v-if="isYourTurn && gameStatus === 'playing'">
          <button @click="passTurn" class="pass-btn" :disabled="!canPass">
            Pass
          </button>
          <text v-if="!canPass" class="pass-hint">
            {{ passHint }}
          </text>
        </view>
      </view>
      
      <!-- 所有手牌 -->
      <view class="cards-container">
        <view v-for="(card, index) in playerCards" :key="index" class="card-item">
          <view 
            :class="['card', 'card-' + card.suit, selectedCard && selectedCard.id === card.id ? 'selected' : '']"
            @click="selectCard(card)"
          >
            <text class="card-rank">{{ card.rank }}</text>
            <text class="card-suit">{{ getSuitSymbol(card.suit) }}</text>
            <text v-if="selectedCard && selectedCard.id === card.id" class="selected-mark">✓</text>
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
			playerCards: [],
			selectedCard: null, // 选中的单张牌
			gameStatus: 'waiting', // waiting, playing, ended
			gamePiles: {
				hearts: { suit: 'hearts', count: 0, topCard: null, playedBy: null, cards: [] },
				spades: { suit: 'spades', count: 0, topCard: null, playedBy: null, cards: [] },
				diamonds: { suit: 'diamonds', count: 0, topCard: null, playedBy: null, cards: [] },
				clubs: { suit: 'clubs', count: 0, topCard: null, playedBy: null, cards: [] }
			},
			currentPlayer: null, // 当前出牌玩家
			isYourTurn: false, // 是否轮到当前玩家出牌
			canPass: false, // 是否可以pass
			passHint: '' // pass提示信息
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
				this.gameStatus = 'playing';
				this.selectedCard = null;
				// 初始化牌堆
				this.gamePiles = {
					hearts: { suit: 'hearts', count: 0, topCard: null, playedBy: null, cards: [] },
					spades: { suit: 'spades', count: 0, topCard: null, playedBy: null, cards: [] },
					diamonds: { suit: 'diamonds', count: 0, topCard: null, playedBy: null, cards: [] },
					clubs: { suit: 'clubs', count: 0, topCard: null, playedBy: null, cards: [] }
				};
				// 设置当前出牌玩家
				this.currentPlayer = messageData.content.currentPlayer;
				this.isYourTurn = messageData.content.isYourTurn;
				// 检查是否可以Pass
				this.checkCanPass();
				
				uni.showToast({
					title: `游戏开始！获得${this.playerCards.length}张牌`,
					icon: 'success',
					duration: 2000
				});
			}
			
			// 处理牌堆更新消息
			if(messageData.type == "pileUpdate"){
				console.log("收到牌堆更新消息:", messageData.content);
				this.gamePiles = messageData.content.pileInfo;
				
				// 更新当前出牌玩家
				if(messageData.content.currentPlayer) {
					this.currentPlayer = messageData.content.currentPlayer;
					this.isYourTurn = this.currentPlayer === app.globalData.diviceid;
					// 检查是否可以Pass
					this.checkCanPass();
				}
				
				// 更新玩家手牌数量
				if(messageData.content.remainingCards !== undefined) {
					// 如果是当前玩家的出牌，更新手牌
					if(messageData.content.playedBy === app.globalData.diviceid) {
						this.playerCards = this.playerCards.filter(card => 
							card.id !== messageData.content.playedCard.id
						);
						this.selectedCard = null;
					}
				}
			}
			
			// 处理出牌成功消息
			if(messageData.type == "playCardSuccess"){
				console.log("出牌成功:", messageData.content);
				uni.showToast({
					title: messageData.content,
					icon: 'success',
					duration: 2000
				});
			}
			
			// 处理出牌失败消息
			if(messageData.type == "playCardFail"){
				console.log("出牌失败:", messageData.content);
				uni.showToast({
					title: messageData.content,
					icon: 'error',
					duration: 2000
				});
			}
			
			// 处理Pass成功消息
			if(messageData.type == "passSuccess"){
				console.log("Pass成功:", messageData.content);
				
				// 更新当前出牌玩家
				if(messageData.content.nextPlayer) {
					this.currentPlayer = messageData.content.nextPlayer;
					this.isYourTurn = this.currentPlayer === app.globalData.diviceid;
					// 检查是否可以Pass
					this.checkCanPass();
				}
				
				uni.showToast({
					title: messageData.content.message,
					icon: 'success',
					duration: 2000
				});
			}
			
			// 处理Pass失败消息
			if(messageData.type == "passFail"){
				console.log("Pass失败:", messageData.content);
				uni.showToast({
					title: messageData.content,
					icon: 'error',
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
    },
    // 选择单张牌
    selectCard(card) {
      if (this.selectedCard && this.selectedCard.id === card.id) {
        // 如果点击的是已选中的牌，则取消选择
        this.selectedCard = null;
      } else {
        // 选择新的牌
        this.selectedCard = card;
      }
    },
    // 取消选择
    clearSelection() {
      this.selectedCard = null;
    },
    // 出牌
    playCard() {
      if (!this.selectedCard) {
        uni.showToast({
          title: '请先选择要出的牌',
          icon: 'none',
          duration: 2000
        });
        return;
      }
      
      console.log('出牌:', this.selectedCard);
      
      // 发送出牌消息到服务器
      const message = {
        type: 'playCard',
        playerid: app.globalData.diviceid,
        card: this.selectedCard,
		
      };
      
      app.globalData.socketTask.send({
        data: JSON.stringify(message),
        success: () => {
          console.log('出牌请求发送成功，等待服务器验证');
          // 不再立即移除手牌，等待服务器确认
          // 手牌移除和牌堆更新将在收到服务器确认消息后处理
        },
        fail: (err) => {
          console.error('出牌请求发送失败:', err);
          uni.showToast({
            title: '出牌请求发送失败',
            icon: 'none',
            duration: 2000
          });
        }
      });
    },
    
    // Pass操作
    passTurn() {
      if (!this.isYourTurn) {
        uni.showToast({
          title: '现在不是你的回合',
          icon: 'none',
          duration: 2000
        });
        return;
      }
      
      console.log('玩家选择Pass');
      
      // 发送Pass消息到服务器
      const message = {
        type: 'passTurn',
        playerid: app.globalData.diviceid
      };
      
      app.globalData.socketTask.send({
        data: JSON.stringify(message),
        success: () => {
          console.log('Pass请求发送成功');
        },
        fail: (err) => {
          console.error('Pass请求发送失败:', err);
          uni.showToast({
            title: 'Pass请求发送失败',
            icon: 'none',
            duration: 2000
          });
        }
      });
    },
    
    // 检查是否可以Pass
    checkCanPass() {
      if (!this.isYourTurn || this.gameStatus !== 'playing') {
        this.canPass = false;
        this.passHint = '';
        return;
      }
      
      // 检查是否有7在手牌中
      const hasSeven = this.playerCards.some(card => card.rank === '7');
      
      // 检查是否有可以出的牌
      const canPlayAnyCard = this.checkCanPlayAnyCard();
      
      if (hasSeven) {
        // 有7在手牌中，不能Pass
        this.canPass = false;
        this.passHint = '手中有7，必须先出7';
      } else if (canPlayAnyCard) {
        // 有可以出的牌，可以Pass但提示
        this.canPass = true;
        this.passHint = '有牌可出，确定要Pass吗？';
      } else {
        // 没有可以出的牌，可以Pass
        this.canPass = true;
        this.passHint = '没有可以出的牌';
      }
    },
    
    // 检查是否有可以出的牌
    checkCanPlayAnyCard() {
      for (const card of this.playerCards) {
        // 检查是否可以出到对应花色的牌堆
        if (this.canPlayCardToPile(card)) {
          return true;
        }
      }
      return false;
    },
    
    // 检查单张牌是否可以出到牌堆
    canPlayCardToPile(card) {
      const pile = this.gamePiles[card.suit];
      
      if (!pile) return false;
      
      // 如果牌堆为空，只能出7
      if (pile.count === 0) {
        return card.rank === '7';
      }
      
      // 获取牌堆的队尾和队头
      const tailCard = pile.cards[pile.cards.length - 1]?.card;
      const headCard = pile.cards[0]?.card;
      
      if (!tailCard || !headCard) return false;
      
      const cardValue = this.getCardValue(card.rank);
      const tailCardValue = this.getCardValue(tailCard.rank);
      const headCardValue = this.getCardValue(headCard.rank);
      
      // 检查是否可以接在队尾（向上接龙）或队头（向下接龙）
      const canPlayToTail = Math.abs(cardValue - tailCardValue) === 1;
      const canPlayToHead = Math.abs(cardValue - headCardValue) === 1;
      
      return canPlayToTail || canPlayToHead;
    },
    
    // 获取牌面值
    getCardValue(rank) {
      switch(rank) {
        case 'A': return 1;
        case 'J': return 11;
        case 'Q': return 12;
        case 'K': return 13;
        default: return parseInt(rank);
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
  cursor: pointer;
  transition: all 0.2s ease;
}

.card.selected {
  border: 2px solid #007AFF;
  background-color: #f0f8ff;
  transform: translateY(-5px);
  box-shadow: 0 4px 8px rgba(0,122,255,0.3);
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

.selected-mark {
  position: absolute;
  top: 2px;
  right: 2px;
  color: #007AFF;
  font-weight: bold;
  font-size: 12px;
}

.selected-section {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #e8f4fd;
  border-radius: 8px;
  border: 1px solid #007AFF;
}

.selected-section h4 {
  margin-bottom: 10px;
  color: #007AFF;
}

.selected-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 15px;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.play-btn {
  background-color: #007AFF;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
}

.clear-btn {
  background-color: #ff6b6b;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
}

/* Pass按钮样式 */
.pass-section {
  margin-top: 15px;
  padding: 15px;
  background-color: #fff3cd;
  border-radius: 8px;
  border: 1px solid #ffeaa7;
  text-align: center;
}

.pass-btn {
  background-color: #ffc107;
  color: #856404;
  border: none;
  padding: 10px 20px;
  border-radius: 25px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(255, 193, 7, 0.3);
}

.pass-btn:disabled {
  background-color: #e0e0e0;
  color: #9e9e9e;
  cursor: not-allowed;
  box-shadow: none;
}

.pass-btn:not(:disabled):hover {
  background-color: #ffb300;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(255, 193, 7, 0.4);
}

.pass-hint {
  display: block;
  margin-top: 8px;
  font-size: 12px;
  color: #856404;
  font-style: italic;
}

/* 出牌权显示样式 */
.turn-section {
  margin: 20px 0;
  padding: 15px;
  border-radius: 8px;
  text-align: center;
}

.turn-indicator {
  padding: 12px 20px;
  border-radius: 25px;
  font-size: 16px;
  font-weight: bold;
  transition: all 0.3s ease;
}

.your-turn {
  background-color: #4CAF50;
  color: white;
  box-shadow: 0 4px 8px rgba(76, 175, 80, 0.3);
  animation: pulse 2s infinite;
}

.other-turn {
  background-color: #ff9800;
  color: white;
  box-shadow: 0 2px 4px rgba(255, 152, 0, 0.3);
}

.turn-text {
  font-size: 16px;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

/* 牌堆样式 */
.piles-section {
  margin: 20px 0;
  padding: 15px;
  background-color: #f0f8ff;
  border-radius: 8px;
  border: 1px solid #007AFF;
}

.piles-section h3 {
  margin-bottom: 15px;
  color: #007AFF;
}

.piles-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

.pile-item {
  display: flex;
  justify-content: center;
}

.pile {
  width: 120px;
  height: 100px;
  border: 2px solid #ccc;
  border-radius: 8px;
  background-color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: all 0.3s ease;
}

.pile-hearts {
  border-color: #e74c3c;
  background-color: #ffeaea;
}

.pile-diamonds {
  border-color: #e74c3c;
  background-color: #ffeaea;
}

.pile-spades {
  border-color: #2c3e50;
  background-color: #f0f0f0;
}

.pile-clubs {
  border-color: #2c3e50;
  background-color: #f0f0f0;
}

.pile-suit {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 5px;
}

.pile-count {
  font-size: 12px;
  color: #666;
  margin-bottom: 3px;
}

.pile-top-card {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 3px;
}

.pile-empty {
  font-size: 12px;
  color: #999;
  font-style: italic;
}

.pile-player {
  font-size: 10px;
  color: #888;
  text-align: center;
}

/* 牌堆序列样式 */
.pile-cards {
  margin-top: 8px;
  width: 100%;
}

.pile-sequence {
  text-align: center;
}

.pile-sequence-label {
  font-size: 10px;
  color: #666;
  display: block;
  margin-bottom: 3px;
}

.card-sequence {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2px;
  font-size: 10px;
}

.sequence-card {
  background-color: rgba(255, 255, 255, 0.8);
  padding: 1px 3px;
  border-radius: 2px;
  border: 1px solid #ddd;
}

.seven-card {
  background-color: #ffeb3b;
  font-weight: bold;
  border-color: #ff9800;
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