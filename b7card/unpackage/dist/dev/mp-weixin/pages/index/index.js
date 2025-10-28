"use strict";
const common_vendor = require("../../common/vendor.js");
const common_assets = require("../../common/assets.js");
const app = getApp();
const _sfc_main = {
  data() {
    return {
      title: "测试websocket控制台",
      //const ws = new WebSocket("ws://localhost:8080")
      connectionStatus: "未连接",
      isConnected: false,
      socketTask: null,
      messages: [],
      reconnectTimer: null,
      reconnectCount: 0,
      maxReconnectCount: 5,
      myDeviceId: null
    };
  },
  onLoad() {
  },
  methods: {
    cleardebug() {
      this.messages = [];
    },
    //连接websocket 
    connectWebSocket() {
      common_vendor.index.__f__("log", "at pages/index/index.vue:60", "连接websocket");
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      const deviceId = common_vendor.index.getSystemInfoSync().deviceId || generateDeviceId();
      const socketUrl = "ws://192.168.233.118:3001?deviceId=" + deviceId;
      common_vendor.index.__f__("log", "at pages/index/index.vue:68", "当前设备持有url" + socketUrl);
      this.socketTask = common_vendor.index.connectSocket({
        url: socketUrl,
        success: (ctx) => {
          this.connectionStatus = "连接中";
          common_vendor.index.__f__("log", "at pages/index/index.vue:74", "连接成功");
          this.isConnected = true;
          this.connectionStatus = "已连接";
          common_vendor.index.__f__("log", "at pages/index/index.vue:79", JSON.stringify(ctx));
        },
        fail: (err) => {
          common_vendor.index.__f__("error", "at pages/index/index.vue:84", "WebSocket连接创建失败:", err);
          this.connectionStatus = "连接失败";
          this.handleReconnect();
        }
      });
      this.socketTask.onOpen((res) => {
        common_vendor.index.__f__("log", "at pages/index/index.vue:90", "连接已经打开");
        app.globalData.isConnected = true;
        app.globalData.socketTask = this.socketTask;
        this.socketTask.onMessage((res2) => {
          try {
            const data = JSON.parse(res2.data);
            if (data.type === "system" && data.deviceId) {
              this.myDeviceId = data.deviceId;
              app.globalData.diviceid = this.myDeviceId;
              common_vendor.index.__f__("log", "at pages/index/index.vue:102", "成功分配到id" + deviceId);
            }
            if (data.type === "message") {
              let prefix = "";
              if (data.deviceId === this.myDeviceId) {
                prefix = "[我] ";
              } else {
                prefix = `[设备${data.deviceId}] `;
              }
              this.addMessage(prefix + data.content);
            }
          } catch (e) {
            common_vendor.index.__f__("log", "at pages/index/index.vue:118", e);
            this.addMessage(` 服务器错误回复: ${res2.data}`);
          }
        });
      });
    },
    // 发送WebSocket消息
    sendWebSocket() {
      if (this.socketTask && this.isConnected) {
        const message = {
          type: "message",
          content: "Hello WebSocket! " + (/* @__PURE__ */ new Date()).toLocaleTimeString(),
          timestamp: Date.now()
        };
        this.socketTask.send({
          data: JSON.stringify(message),
          success: () => {
            common_vendor.index.__f__("log", "at pages/index/index.vue:139", "消息发送成功");
            this.addMessage(" 发送: " + JSON.stringify(message));
          },
          fail: (err) => {
            common_vendor.index.__f__("error", "at pages/index/index.vue:145", "消息发送失败:", err);
            this.addMessage(" 发送失败");
          }
        });
      } else {
        common_vendor.index.showToast({
          title: "WebSocket未连接",
          icon: "none"
        });
      }
    },
    handleReconnect() {
      common_vendor.index.__f__("log", "at pages/index/index.vue:158", "解决重连服务");
    },
    addMessage(msg) {
      this.messages.push(msg);
    },
    // sendWebSocket(){
    // 	uni.__f__('log','at pages/index/index.vue:164',"发送消息给websocket服务");
    // 	if (this.socketTask && this.isConnected) {
    // 		const message = {
    // 			type: 'message',
    // 			content: 'Hello WebSocket! ' + new Date().toLocaleTimeString(),
    // 			timestamp: Date.now()
    // 			};
    // 		this.socketTask.send({
    // 			data: JSON.stringify(message),
    // 			success: () => {
    // 				uni.__f__('log','at pages/index/index.vue:175','消息发送成功');
    // 				this.addMessage(' 发送成功: ' + JSON.stringify(message));
    // 				},
    // 			fail: (err) => {
    // 				uni.__f__('error','at pages/index/index.vue:179','消息发送失败:', err);
    // 				this.addMessage( ' 发送失败');
    // 				}
    // 			});
    // 			} else {
    // 			uni.showToast({
    // 				title: 'WebSocket未连接',
    // 					icon: 'none'
    // 					});
    // 					}
    // },
    closeWebSocket(url) {
      if (this.socketTask) {
        this.socketTask.close({
          code: 1e3,
          // 正常关闭代码
          reason: JSON.stringify({
            // 将消息封装为 JSON 字符串
            type: "close",
            reason: "user_request",
            deviceId: this.myDeviceId
          }),
          success: () => {
            common_vendor.index.__f__("log", "at pages/index/index.vue:204", "连接已关闭");
            this.socketTask = null;
            this.isConnected = false;
            this.addMessage("连接已关闭");
          },
          fail: (err) => {
            common_vendor.index.__f__("error", "at pages/index/index.vue:210", "关闭连接失败", err);
            this.addMessage("关闭连接失败: " + err.errMsg);
          }
        });
      }
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_assets._imports_0,
    b: common_vendor.t($data.title),
    c: common_vendor.t($data.myDeviceId),
    d: common_vendor.t($data.connectionStatus),
    e: common_vendor.o((...args) => $options.connectWebSocket && $options.connectWebSocket(...args)),
    f: $data.isConnected,
    g: common_vendor.o((...args) => $options.sendWebSocket && $options.sendWebSocket(...args)),
    h: !$data.isConnected,
    i: common_vendor.o((...args) => $options.closeWebSocket && $options.closeWebSocket(...args)),
    j: !$data.isConnected,
    k: common_vendor.o((...args) => $options.cleardebug && $options.cleardebug(...args)),
    l: common_vendor.f($data.messages, (msg, index, i0) => {
      return {
        a: common_vendor.t(msg),
        b: index
      };
    })
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/index/index.js.map
