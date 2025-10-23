<template>
	<view class="content">
		<image class="logo" src="/static/logo.png"></image>
		<view class="text-area">
			<text class="title">{{title}}</text>
		</view>
		<view class="status">
					<text>连接状态: {{connectionStatus}}</text>
				</view>
		<button @click="connectWebSocket" :disabled="isConnected">
					连接WebSocket
		</button>
		<button @click="sendWebSocket" :disabled="!isConnected">
			发送WebSocket消息
		</button>
		<button @click="closeWebSocket" :disabled="!isConnected">
			关闭连接
		</button>
		<button @click="cleardebug"> 清空日志 </button>
	</view>
	<view class="message-area">
				<text class="sub-title">收到的消息:</text>
				<scroll-view class="message-list" scroll-y>
					<view v-for="(msg, index) in messages" :key="index" class="message-item">
						<text>{{msg}}</text>
					</view>
				</scroll-view>
	</view>
</template>

<script>
	export default {
		
		data() {
			return {
				title: '测试websocket控制台',
				//const ws = new WebSocket("ws://localhost:8080")
				connectionStatus: '未连接',
				isConnected: false,
				socketTask: null,
				messages: [],
				reconnectTimer: null,
				reconnectCount: 0,
				maxReconnectCount: 5
			}
		},
		onLoad() {

		},
		methods: {
			cleardebug(){
				this.messages = [];
			},
			//连接websocket 
			connectWebSocket(){
				//
				console.log("连接websocket")
				if(this.reconnectTimer){
					clearTimeout(this.reconnectTimer);
					this.reconnectTimer = null;
				}
				// ----------------------------------------------------这里放着url
				const socketUrl = 'ws://192.168.233.118:3001';
				this.socketTask = uni.connectSocket({
					url:socketUrl,
					
					success: (ctx) => {
						this.connectionStatus = "连接中"
						console.log("连接成功")
						this.isConnected = true;
						this.connectionStatus = "已连接"
						console.log(JSON.stringify(ctx));
						
						
					},
					fail: (err) => {
						console.error('WebSocket连接创建失败:', err);
						this.connectionStatus = '连接失败';
						this.handleReconnect();
						}
				})
				this.socketTask.onOpen((res) => {
					console.log("连接已经打开")
					this.socketTask.onMessage((res) => {
					  try {
					    const data = JSON.parse(res.data);
						// if (data.type === 'system') {
						//       this.addMessage("单个广播" + data.content); // 显示系统消息
						//     }
					    this.addMessage( ` 服务器回复: ${data.content}`);
						

					  } catch (e) {
					    this.addMessage( ` 服务器错误回复: ${res.data}`);
					  }
					});
				})
				
				
			},
			// 发送WebSocket消息
			sendWebSocket() {
				if (this.socketTask && this.isConnected) {
					const message = {
						type: 'message',
						content: 'Hello WebSocket! ' + new Date().toLocaleTimeString(),
						timestamp: Date.now()
					};
					
					this.socketTask.send({
						data: JSON.stringify(message),
						success: () => {
							//----------在连接成功的回调中设置监听函数-------------------------
							console.log('消息发送成功');
							this.addMessage( ' 发送: ' + JSON.stringify(message));
							
							
						},
						fail: (err) => {
							console.error('消息发送失败:', err);
							this.addMessage( ' 发送失败');
						}
					});
				} else {
					uni.showToast({
						title: 'WebSocket未连接',
						icon: 'none'
					});
				}
			},
			
			handleReconnect(){
				console.log("解决重连服务");
			},
			addMessage(msg){
				this.messages.push(msg)
			},
			sendWebSocket(){
				console.log("发送消息给websocket服务");
				if (this.socketTask && this.isConnected) {
					const message = {
						type: 'message',
						content: 'Hello WebSocket! ' + new Date().toLocaleTimeString(),
						timestamp: Date.now()
						};
									
					this.socketTask.send({
						data: JSON.stringify(message),
						success: () => {
							console.log('消息发送成功');
							this.addMessage(' 发送成功: ' + JSON.stringify(message));
							},
						fail: (err) => {
							console.error('消息发送失败:', err);
							this.addMessage( ' 发送失败');
							}
						});
						} else {
						uni.showToast({
							title: 'WebSocket未连接',
								icon: 'none'
								});
								}
			},
			closeWebSocket(url){
				if (this.socketTask && this.socketTask.readyState !== 3) { // 3 = CLOSED
				    this.socketTask.close({
				      success: () => {
				        console.log('WebSocket 已关闭');
				        this.socketTask = null;
						this.isConnected = false;
				      },
				      fail: (err) => {
				        console.error('关闭 WebSocket 失败', err);
				      }
				    });
				  }
				
			}
		}
	}
</script>

<style>
	.content {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	.logo {
		height: 200rpx;
		width: 200rpx;
		margin-top: 200rpx;
		margin-left: auto;
		margin-right: auto;
		margin-bottom: 50rpx;
	}

	.text-area {
		display: flex;
		justify-content: center;
	}

	.title {
		font-size: 36rpx;
		color: #8f8f94;
	}
</style>
