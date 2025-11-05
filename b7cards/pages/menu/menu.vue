<template>
  <view class="menu-container">
    <!-- 游戏标题 -->
    <view class="game-title">
      <text class="title-text">7卡接龙</text>
      <text class="subtitle">7 Card Solitaire</text>
    </view>
    
    <!-- 菜单选项 -->
    <view class="menu-options">
      <view class="menu-item" @click="startAIGame">
        <view class="menu-icon">🤖</view>
        <text class="menu-text">与AI对战</text>
      </view>
      
      <view class="menu-item" @click="startLocalGame">
        <view class="menu-icon">🌐</view>
        <text class="menu-text">局域网模式</text>
      </view>
      
      <view class="menu-item" @click="exitGame">
        <view class="menu-icon">🚪</view>
        <text class="menu-text">退出游戏</text>
      </view>
    </view>
    
    <!-- 版本信息 -->
    <view class="version-info">
      <text class="version-text">v1.0.0</text>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      
    }
  },
  onLoad() {
    // 菜单页面不需要隐藏TabBar，因为菜单页面本身不是TabBar页面
  },
  onShow() {
    // 菜单页面不需要隐藏TabBar
  },
  methods: {
    // 与AI对战
    startAIGame() {
      uni.showToast({
        title: 'AI对战功能开发中',
        icon: 'none',
        duration: 2000
      });
    },
    
    // 局域网模式
    startLocalGame() {
      // 切换到游戏页面，显示底部导航栏
      uni.switchTab({
        url: '/pages/home/home'
      });
    },
    
    // 退出游戏
    exitGame() {
      uni.showModal({
        title: '退出游戏',
        content: '确定要退出游戏吗？',
        success: (res) => {
          if (res.confirm) {
            // 简化退出逻辑，使用uni的退出方法
            uni.navigateBack({
              delta: 999
            });
          }
        }
      });
    }
  }
}
</script>

<style>
.menu-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #ff8c00 0%, #ff6b35 100%);
  padding: 40px 20px;
}

/* 游戏标题样式 */
.game-title {
  text-align: center;
  margin-bottom: 60px;
}

.title-text {
  display: block;
  font-size: 48px;
  font-weight: bold;
  color: white;
  text-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  margin-bottom: 8px;
  font-family: 'Courier New', monospace;
}

.subtitle {
  display: block;
  font-size: 18px;
  color: rgba(255, 255, 255, 0.8);
  font-family: 'Courier New', monospace;
}

/* 菜单选项样式 */
.menu-options {
  width: 100%;
  max-width: 300px;
  margin-bottom: 40px;
}

.menu-item {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 20px 24px;
  margin-bottom: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  cursor: pointer;
}

.menu-item:active {
  transform: translateY(2px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.menu-icon {
  font-size: 28px;
  margin-right: 16px;
  width: 40px;
  text-align: center;
}

.menu-text {
  font-size: 20px;
  font-weight: bold;
  color: #333;
  font-family: 'Courier New', monospace;
}

/* 版本信息样式 */
.version-info {
  position: absolute;
  bottom: 20px;
  text-align: center;
  width: 100%;
}

.version-text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  font-family: 'Courier New', monospace;
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
  .menu-container {
    padding: 20px 16px;
  }
  
  .title-text {
    font-size: 36px;
  }
  
  .menu-text {
    font-size: 18px;
  }
  
  .menu-item {
    padding: 16px 20px;
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
</style>