<template>
  <view class="container">
	<button @click="SynInformation"> 同步信息 </button>
	<button> 开始游戏 </button>
    <ul>
          <li v-for="(item, index) in playerlist" :key="index">
            玩家{{ index+1 }}: {{ item }}
          </li>
    </ul>
    
  </view>
</template>

<script>
const app = getApp();
export default {
  
	data(){
		return{
			// playerstruct : {
			// 	playerid
				
			// },
			
			playerlist:[1111,102,1003,1004]
		}
	},
  onLoad(){
    this.setupWebSocketListener();
  },
  methods: {
    setupWebSocketListener() {
      if (app.globalData.socketTask && app.globalData.isConnected) {
		  console.log("监听器设置成功")
        // 设置消息监听器
        app.globalData.socketTask.onMessage((res) => {
          console.log('Home页面收到WebSocket消息:', res);
          
          try {
            // 解析JSON消息
            const messageData = JSON.parse(res.data);
            if(messageData.type == 'syninformation'){
              this.playerlist = messageData.content;
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
        }, 1000);
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
</style>