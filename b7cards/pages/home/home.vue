<template>
  <view class="container">
    <!-- 返回按钮 -->
    <view class="back-button" @click="goBack">
      <text class="back-text">← 返回菜单</text>
    </view>
    
	<button @click="SynInformation" :disabled = "!canbutton"> 同步信息 </button>
	<button @click="gameStart" :disabled = "!isConnected && !canbutton"> 开始游戏 </button>
    
    <!-- 出牌权显示 -->
    <view class="turn-section" v-if="gameStatus === 'playing' && currentPlayer">
      <view :class="['turn-indicator', isYourTurn ? 'your-turn' : 'other-turn']">
        <text v-if="isYourTurn" class="turn-text">🎮 轮到您出牌</text>
        <text v-else class="turn-text">⏳ 轮到玩家 {{ currentPlayer }} 出牌</text>
      </view>
    </view>
    
    <!-- 牌堆显示 - 只在有牌时显示 -->
    <view class="piles-section" v-if="gamePiles">
      <h3>牌堆</h3>
      <view class="piles-container">
        <view v-for="(pile, suit) in gamePiles" :key="suit">
          <!-- 只在有牌时显示牌堆 -->
          <view v-if="pile.cards && pile.cards.length > 0" class="pile-item">
            <view class="pile">
              <!-- 牌堆标题 - 显示花色和牌数 -->
              <view class="pile-header">
                <text class="pile-suit">{{ getSuitSymbol(suit) }}</text>
                <text class="pile-count">{{ pile.count }}张</text>
              </view>
              
              <!-- 牌堆序列 - 横向展开，每张牌完整显示 -->
              <view class="pile-cards">
                <view class="pile-sequence">
                  <view 
                    v-for="(entry, index) in pile.cards" 
                    :key="index"
                    :class="['pile-card', 'card-' + entry.card.suit, entry.card.rank === '7' ? 'seven-card' : '']"
                    :style="{ marginLeft: index > 0 ? '-20px' : '0' }"
                  >
                    <text class="card-rank">{{ entry.card.rank }}</text>
                    <text class="card-suit">{{ getSuitSymbol(entry.card.suit) }}</text>
                  </view>
                </view>
              </view>
              
              <text v-if="pile.playedBy" class="pile-player">
                最后出牌: {{ pile.playedBy }}
              </text>
            </view>
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
      
      <!-- 花色筛选按钮 -->
      <view class="filter-section">
        <view class="filter-buttons">
          <button 
            :class="['filter-btn', filterSuit === null ? 'filter-active' : '']"
            @click="setFilterSuit(null)"
          >
            全部
          </button>
          <button 
            :class="['filter-btn', 'filter-hearts', filterSuit === 'hearts' ? 'filter-active' : '']"
            @click="setFilterSuit('hearts')"
          >
            ♥ 红心
          </button>
          <button 
            :class="['filter-btn', 'filter-spades', filterSuit === 'spades' ? 'filter-active' : '']"
            @click="setFilterSuit('spades')"
          >
            ♠ 黑桃
          </button>
          <button 
            :class="['filter-btn', 'filter-diamonds', filterSuit === 'diamonds' ? 'filter-active' : '']"
            @click="setFilterSuit('diamonds')"
          >
            ♦ 方块
          </button>
          <button 
            :class="['filter-btn', 'filter-clubs', filterSuit === 'clubs' ? 'filter-active' : '']"
            @click="setFilterSuit('clubs')"
          >
            ♣ 梅花
          </button>
        </view>
        <text v-if="filterSuit" class="filter-info">
          当前筛选: {{ getSuitName(filterSuit) }} ({{ filteredCards.length }}张)
        </text>
      </view>
      

      
      <!-- 所有手牌 -->
      <view class="cards-container">
        <view v-for="(card, index) in filteredCards" :key="index" class="card-item">
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
    
    <!-- 底部悬浮操作栏 -->
    <view class="bottom-action-bar" v-if="selectedCard && gameStatus === 'playing'">
      <view class="action-bar-content">
        <!-- 已选牌显示 -->
        <view class="selected-card-display">
          <view :class="['selected-card', 'card-' + selectedCard.suit]">
            <text class="card-rank">{{ selectedCard.rank }}</text>
            <text class="card-suit">{{ getSuitSymbol(selectedCard.suit) }}</text>
          </view>
          <text class="selected-text">已选牌</text>
        </view>
        
        <!-- 操作按钮 -->
        <view class="action-buttons">
          <button @click="playCard" class="action-btn play-btn">出牌</button>
          <button @click="clearSelection" class="action-btn clear-btn">取消</button>
          <button 
            v-if="isYourTurn" 
            @click="passTurn" 
            class="action-btn pass-btn" 
            :disabled="!canPass"
          >
            Pass
          </button>
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
			passHint: '', // pass提示信息
			filterSuit: null // 当前筛选的花色，null表示显示所有
		}
	},
  onLoad(){
    this.setupWebSocketListener();
  },
  computed: {
    // 筛选后的手牌
    filteredCards() {
      if (!this.filterSuit) {
        return this.playerCards;
      }
      return this.playerCards.filter(card => card.suit === this.filterSuit);
    }
  },
  methods: {
    // 返回菜单
    goBack() {
      uni.navigateTo({
        url: '/pages/menu/menu'
      });
    },
    
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
				this.isYourTurn = this.currentPlayer === app.globalData.diviceid;
				//this.isYourTurn = messageData.content.isYourTurn;
				// 检查是否可以Pass
				this.checkCanPass();
				
				uni.showToast({
					title: `游戏开始！获得${this.playerCards.length}张牌`,
					icon: 'success',
					duration: 2000
				});
			}
			//------------------------------------------以上经过校对没有问题/待检验
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
    
    // 获取花色中文名称
    getSuitName(suit) {
      switch(suit) {
        case 'hearts': return '红心';
        case 'spades': return '黑桃';
        case 'clubs': return '梅花';
        case 'diamonds': return '方块';
        default: return suit;
      }
    },
    
    // 设置筛选花色
    setFilterSuit(suit) {
      this.filterSuit = suit;
      console.log('筛选花色:', suit);
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
      // 简化规则：所有玩家都可以Pass
      this.canPass = true;
      this.passHint = '可以Pass';
    },
    
    // 简化前端判断，所有规则判断交给后端
    // goToTest() {
    //   uni.navigateTo({
    //     url: '/pages/index/index'
    //   });
    // }
  }
}
</script>

<style>
/* 橙白配色像素风格 */
.container {
  padding: 16px;
  background: linear-gradient(135deg, #fff5e6 0%, #fff 100%);
  min-height: 100vh;
  font-family: 'Courier New', monospace;
}

/* 按钮样式 - 像素风格 */
button {
  background: #ff8c00;
  color: white;
  border: 2px solid #e67300;
  padding: 12px 24px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 0 #cc6600;
  margin: 8px 4px;
  font-family: 'Courier New', monospace;
}

button:disabled {
  background: #ccc;
  border-color: #999;
  box-shadow: 0 4px 0 #999;
  cursor: not-allowed;
  opacity: 0.6;
}

button:not(:disabled):active {
  transform: translateY(4px);
  box-shadow: 0 0 0 #cc6600;
}

/* 玩家列表样式 */
.player-section {
  margin: 16px 0;
  padding: 16px;
  background: white;
  border-radius: 8px;
  border: 2px solid #ff8c00;
  box-shadow: 0 4px 0 #e67300;
}

.player-section h3 {
  margin-bottom: 12px;
  color: #ff8c00;
  font-size: 18px;
  text-align: center;
  border-bottom: 2px solid #ff8c00;
  padding-bottom: 8px;
}

/* 手牌区域样式 */
.cards-section {
  margin: 16px 0;
  padding: 16px;
  background: white;
  border-radius: 8px;
  border: 2px solid #ff8c00;
  box-shadow: 0 4px 0 #e67300;
}

.cards-section h3 {
  margin-bottom: 16px;
  color: #ff8c00;
  font-size: 18px;
  text-align: center;
  border-bottom: 2px solid #ff8c00;
  padding-bottom: 8px;
}

/* 筛选区域样式 */
.filter-section {
  margin-bottom: 16px;
  padding: 12px;
  background: #fff5e6;
  border-radius: 8px;
  border: 2px solid #ff8c00;
  text-align: center;
}

.filter-buttons {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.filter-btn {
  background: #fff;
  color: #333;
  border: 2px solid #ccc;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 0 #999;
  font-family: 'Courier New', monospace;
}

.filter-btn:active {
  transform: translateY(2px);
  box-shadow: 0 0 0 #999;
}

.filter-active {
  background: #ff8c00;
  color: white;
  border-color: #e67300;
  box-shadow: 0 2px 0 #cc6600;
}

.filter-hearts {
  color: #e74c3c;
  border-color: #e74c3c;
}

.filter-spades {
  color: #2c3e50;
  border-color: #2c3e50;
}

.filter-diamonds {
  color: #e74c3c;
  border-color: #e74c3c;
}

.filter-clubs {
  color: #2c3e50;
  border-color: #2c3e50;
}

.filter-info {
  display: block;
  font-size: 12px;
  color: #ff8c00;
  font-style: italic;
}

.cards-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.card-item {
  width: 64px;
  height: 88px;
}

/* 卡牌样式 - 像素风格 */
.card {
  width: 100%;
  height: 100%;
  border: 2px solid #333;
  border-radius: 6px;
  background: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 0 #666;
}

.card.selected {
  border: 3px solid #ff8c00;
  background: #fff5e6;
  transform: translateY(-4px);
  box-shadow: 0 6px 0 #e67300;
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
  font-size: 18px;
  font-weight: bold;
}

.card-suit {
  font-size: 24px;
  margin-top: 4px;
}

.selected-mark {
  position: absolute;
  top: 4px;
  right: 4px;
  color: #ff8c00;
  font-weight: bold;
  font-size: 14px;
}



/* 出牌权显示样式 */
.turn-section {
  margin: 16px 0;
  padding: 16px;
  border-radius: 8px;
  text-align: center;
  background: white;
  border: 2px solid #ff8c00;
  box-shadow: 0 4px 0 #e67300;
}

.turn-indicator {
  padding: 12px 20px;
  border-radius: 6px;
  font-size: 16px;
  font-weight: bold;
  transition: all 0.3s ease;
}

.your-turn {
  background: #ff8c00;
  color: white;
  box-shadow: 0 4px 0 #e67300;
  animation: pixelPulse 1s infinite;
}

.other-turn {
  background: #ffb366;
  color: #333;
  box-shadow: 0 4px 0 #e67300;
}

.turn-text {
  font-size: 16px;
}

@keyframes pixelPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

/* 牌堆样式 - 只在有牌时显示 */
.piles-section {
  margin: 16px 0;
  padding: 16px;
  background: white;
  border-radius: 8px;
  border: 2px solid #ff8c00;
  box-shadow: 0 4px 0 #e67300;
}

.piles-section h3 {
  margin-bottom: 16px;
  color: #ff8c00;
  font-size: 18px;
  text-align: center;
  border-bottom: 2px solid #ff8c00;
  padding-bottom: 8px;
}

.piles-container {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  gap: 20px;
  overflow-x: auto;
  padding: 8px 0;
  min-height: 120px;
}

.pile-item {
  flex-shrink: 0;
}

.pile {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
}

.pile-hearts {
  border-color: #e74c3c;
  background: #ffeaea;
}

.pile-diamonds {
  border-color: #e74c3c;
  background: #ffeaea;
}

.pile-spades {
  border-color: #2c3e50;
  background: #f0f0f0;
}

.pile-clubs {
  border-color: #2c3e50;
  background: #f0f0f0;
}

.pile-suit {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 4px;
}

.pile-count {
  font-size: 12px;
  color: #666;
  margin-bottom: 2px;
}

.pile-top-card {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 2px;
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

/* 牌堆标题样式 */
.pile-header {
  text-align: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
}

.pile-suit {
  font-size: 20px;
  font-weight: bold;
  margin-right: 8px;
}

.pile-count {
  font-size: 12px;
  color: #666;
}

/* 牌堆序列样式 - 斗地主式横向叠放 */
.pile-cards {
  width: 100%;
  min-height: 80px;
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
}

.pile-sequence {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  min-height: 80px;
  position: relative;
}

/* 牌堆中的单张牌样式 */
.pile-card {
  width: 50px;
  height: 70px;
  border: 2px solid #333;
  border-radius: 4px;
  background: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  position: relative;
  z-index: 1;
  transition: all 0.3s ease;
}

.pile-card-hearts {
  color: #e74c3c;
  border-color: #e74c3c;
}

.pile-card-diamonds {
  color: #e74c3c;
  border-color: #e74c3c;
}

.pile-card-spades {
  color: #2c3e50;
  border-color: #2c3e50;
}

.pile-card-clubs {
  color: #2c3e50;
  border-color: #2c3e50;
}

.pile-card .card-rank {
  font-size: 14px;
  font-weight: bold;
}

.pile-card .card-suit {
  font-size: 18px;
  margin-top: 2px;
}

.pile-card.seven-card {
  background: #ffeb3b;
  font-weight: bold;
  border-color: #ff8c00;
  box-shadow: 0 4px 8px rgba(255, 140, 0, 0.3);
  z-index: 10;
}

/* 空牌堆样式 */
.pile-empty {
  font-size: 14px;
  color: #999;
  font-style: italic;
  text-align: center;
  margin-top: 30px;
}

/* 最后出牌者信息 */
.pile-player {
  font-size: 10px;
  color: #888;
  text-align: center;
  margin-top: 8px;
}

/* 列表样式 */
ul {
  list-style-type: none;
  padding: 0;
}

li {
  padding: 6px 0;
  border-bottom: 1px solid #eee;
  text-align: center;
}

/* 返回按钮样式 */
.back-button {
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(255, 255, 255, 0.9);
  border: 2px solid #ff8c00;
  border-radius: 6px;
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  z-index: 10;
}

.back-button:active {
  transform: translateY(1px);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.back-text {
  font-size: 14px;
  font-weight: bold;
  color: #ff8c00;
  font-family: 'Courier New', monospace;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .container {
    padding: 12px;
  }
  
  .piles-container {
    grid-template-columns: 1fr;
  }
  
  .card-item {
    width: 56px;
    height: 80px;
  }
  
  .back-button {
    top: 10px;
    left: 10px;
    padding: 6px 12px;
  }
  
  .back-text {
    font-size: 12px;
  }
}

/* 底部悬浮操作栏样式 */
.bottom-action-bar {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 400px;
  background: rgba(255, 255, 255, 0.95);
  border: 3px solid #ff8c00;
  border-radius: 12px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  z-index: 1000;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateX(-50%) translateY(100px);
    opacity: 0;
  }
  to {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
}

.action-bar-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
}

.selected-card-display {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selected-card {
  width: 50px;
  height: 70px;
  border: 2px solid #333;
  border-radius: 6px;
  background: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4px 0 #666;
  position: relative;
}

.selected-card-hearts {
  color: #e74c3c;
  border-color: #e74c3c;
}

.selected-card-diamonds {
  color: #e74c3c;
  border-color: #e74c3c;
}

.selected-card-spades {
  color: #2c3e50;
  border-color: #2c3e50;
}

.selected-card-clubs {
  color: #2c3e50;
  border-color: #2c3e50;
}

.selected-card .card-rank {
  font-size: 16px;
  font-weight: bold;
}

.selected-card .card-suit {
  font-size: 20px;
  margin-top: 2px;
}

.selected-text {
  font-size: 14px;
  font-weight: bold;
  color: #ff8c00;
  font-family: 'Courier New', monospace;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 10px 20px;
  border: 2px solid;
  border-radius: 6px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 0;
  font-family: 'Courier New', monospace;
  min-width: 70px;
}

.action-btn:disabled {
  background: #ccc;
  border-color: #999;
  box-shadow: 0 4px 0 #999;
  cursor: not-allowed;
  opacity: 0.6;
}

.action-btn:not(:disabled):active {
  transform: translateY(4px);
  box-shadow: 0 0 0;
}

.play-btn {
  background: #4CAF50;
  color: white;
  border-color: #45a049;
  box-shadow: 0 4px 0 #3d8b40;
}

.clear-btn {
  background: #ff6b6b;
  color: white;
  border-color: #ff5252;
  box-shadow: 0 4px 0 #ff3838;
}

.pass-btn {
  background: #ff8c00;
  color: white;
  border-color: #e67300;
  box-shadow: 0 4px 0 #cc6600;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .bottom-action-bar {
    width: 95%;
    bottom: 10px;
  }
  
  .action-bar-content {
    padding: 12px 16px;
  }
  
  .action-btn {
    padding: 8px 16px;
    font-size: 12px;
    min-width: 60px;
  }
  
  .selected-card {
    width: 45px;
    height: 63px;
  }
  
  .selected-card .card-rank {
    font-size: 14px;
  }
  
  .selected-card .card-suit {
    font-size: 18px;
  }
  
  .selected-text {
    font-size: 12px;
  }
}

/* 底部悬浮操作栏样式 */
.bottom-action-bar {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 400px;
  background: rgba(255, 255, 255, 0.95);
  border: 3px solid #ff8c00;
  border-radius: 12px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  z-index: 1000;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateX(-50%) translateY(100px);
    opacity: 0;
  }
  to {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
}

.action-bar-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
}

.selected-card-display {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selected-card {
  width: 50px;
  height: 70px;
  border: 2px solid #333;
  border-radius: 6px;
  background: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4px 0 #666;
  position: relative;
}

.selected-card-hearts {
  color: #e74c3c;
  border-color: #e74c3c;
}

.selected-card-diamonds {
  color: #e74c3c;
  border-color: #e74c3c;
}

.selected-card-spades {
  color: #2c3e50;
  border-color: #2c3e50;
}

.selected-card-clubs {
  color: #2c3e50;
  border-color: #2c3e50;
}

.selected-card .card-rank {
  font-size: 16px;
  font-weight: bold;
}

.selected-card .card-suit {
  font-size: 20px;
  margin-top: 2px;
}

.selected-text {
  font-size: 14px;
  font-weight: bold;
  color: #ff8c00;
  font-family: 'Courier New', monospace;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 10px 20px;
  border: 2px solid;
  border-radius: 6px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 0;
  font-family: 'Courier New', monospace;
  min-width: 70px;
}

.action-btn:disabled {
  background: #ccc;
  border-color: #999;
  box-shadow: 0 4px 0 #999;
  cursor: not-allowed;
  opacity: 0.6;
}

.action-btn:not(:disabled):active {
  transform: translateY(4px);
  box-shadow: 0 0 0;
}

.play-btn {
  background: #4CAF50;
  color: white;
  border-color: #45a049;
  box-shadow: 0 4px 0 #3d8b40;
}

.clear-btn {
  background: #ff6b6b;
  color: white;
  border-color: #ff5252;
  box-shadow: 0 4px 0 #ff3838;
}

.pass-btn {
  background: #ff8c00;
  color: white;
  border-color: #e67300;
  box-shadow: 0 4px 0 #cc6600;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .bottom-action-bar {
    width: 95%;
    bottom: 10px;
  }
  
  .action-bar-content {
    padding: 12px 16px;
  }
  
  .action-btn {
    padding: 8px 16px;
    font-size: 12px;
    min-width: 60px;
  }
  
  .selected-card {
    width: 45px;
    height: 63px;
  }
  
  .selected-card .card-rank {
    font-size: 14px;
  }
  
  .selected-card .card-suit {
    font-size: 18px;
  }
  
  .selected-text {
    font-size: 12px;
  }
}
</style>