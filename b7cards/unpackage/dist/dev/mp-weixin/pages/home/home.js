"use strict";
const common_vendor = require("../../common/vendor.js");
const app = getApp();
const _sfc_main = {
  data() {
    return {
      canbutton: false,
      isConnected: false,
      playerlist: [],
      playerCards: [],
      selectedCard: null,
      // 选中的单张牌
      gameStatus: "waiting"
      // waiting, playing, ended
    };
  },
  onLoad() {
    this.setupWebSocketListener();
  },
  methods: {
    setupWebSocketListener() {
      if (app.globalData.socketTask && app.globalData.isConnected) {
        common_vendor.index.__f__("log", "at pages/home/home.vue:77", "监听器设置成功");
        this.canbutton = true;
        app.globalData.socketTask.onMessage((res) => {
          common_vendor.index.__f__("log", "at pages/home/home.vue:81", "Home页面收到WebSocket消息:", res);
          try {
            const messageData = JSON.parse(res.data);
            if (messageData.type == "syninformation") {
              common_vendor.index.__f__("log", "at pages/home/home.vue:87", "进入到同步数组if");
              this.playerlist = messageData.content;
            }
            if (messageData.type == "alert") {
              common_vendor.index.__f__("log", "at pages/home/home.vue:93", messageData.content);
              common_vendor.index.showToast({
                title: messageData.content,
                icon: "error",
                duration: 2e3
              });
            }
            if (messageData.type == "gameStartRes") {
              common_vendor.index.__f__("log", "at pages/home/home.vue:101", "收到游戏开始响应，手牌信息:", messageData.content);
              this.playerCards = messageData.content.playerCards || [];
              this.gameStatus = "playing";
              this.selectedCard = null;
              common_vendor.index.showToast({
                title: `游戏开始！获得${this.playerCards.length}张牌`,
                icon: "success",
                duration: 2e3
              });
            }
          } catch (error) {
            common_vendor.index.__f__("error", "at pages/home/home.vue:113", "消息解析失败:", error, "原始数据:", res.data);
          }
        });
        this.isListening = true;
        common_vendor.index.__f__("log", "at pages/home/home.vue:120", "Home页面WebSocket监听器已设置");
      } else {
        common_vendor.index.__f__("log", "at pages/home/home.vue:122", "WebSocket未连接，无法设置监听器");
        setTimeout(() => {
          this.setupWebSocketListener();
        }, 2e3);
      }
    },
    SynInformation() {
      common_vendor.index.__f__("log", "at pages/home/home.vue:130", "是否成功连接" + app.globalData.isConnected);
      common_vendor.index.__f__("log", "at pages/home/home.vue:131", "socketTask:" + app.globalData.socketTask);
      if (app.globalData.isConnected && app.globalData.socketTask) {
        const message = {
          type: "system",
          reqmethoud: "syninformation",
          playerid: app.globalData.diviceid
        };
        app.globalData.socketTask.send({
          data: JSON.stringify(message),
          success: () => {
            this.isConnected = true;
            common_vendor.index.__f__("log", "at pages/home/home.vue:145", "同步信息成功");
          },
          fail: (err) => {
            common_vendor.index.__f__("error", "at pages/home/home.vue:150", "同步用户信息失败:", err);
          }
        });
      } else {
        common_vendor.index.showToast({
          title: "WebSocket未连接",
          icon: "none"
        });
      }
    },
    gameStart() {
      const message = {
        type: "gameStart",
        reqmethoud: "user",
        playerid: app.globalData.diviceid
      };
      app.globalData.socketTask.send({
        data: JSON.stringify(message),
        success: () => {
          this.isConnected = true;
          common_vendor.index.__f__("log", "at pages/home/home.vue:172", "发送开始游戏请求");
        },
        fail: (err) => {
          common_vendor.index.__f__("error", "at pages/home/home.vue:177", "发送卡开始请求失败:", err);
        }
      });
    },
    getSuitSymbol(suit) {
      switch (suit) {
        case "hearts":
          return "♥";
        case "spades":
          return "♠";
        case "clubs":
          return "♣";
        case "diamonds":
          return "♦";
        default:
          return suit;
      }
    },
    // 选择单张牌
    selectCard(card) {
      if (this.selectedCard && this.selectedCard.id === card.id) {
        this.selectedCard = null;
      } else {
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
        common_vendor.index.showToast({
          title: "请先选择要出的牌",
          icon: "none",
          duration: 2e3
        });
        return;
      }
      common_vendor.index.__f__("log", "at pages/home/home.vue:217", "出牌:", this.selectedCard);
      const message = {
        type: "playCard",
        playerid: app.globalData.diviceid,
        card: this.selectedCard
      };
      app.globalData.socketTask.send({
        data: JSON.stringify(message),
        success: () => {
          common_vendor.index.__f__("log", "at pages/home/home.vue:229", "出牌成功");
          this.playerCards = this.playerCards.filter(
            (card) => card.id !== this.selectedCard.id
          );
          this.selectedCard = null;
          if (this.playerCards.length === 0) {
            this.gameStatus = "ended";
            common_vendor.index.showToast({
              title: "恭喜你获胜！",
              icon: "success",
              duration: 3e3
            });
          }
        },
        fail: (err) => {
          common_vendor.index.__f__("error", "at pages/home/home.vue:247", "出牌失败:", err);
          common_vendor.index.showToast({
            title: "出牌失败",
            icon: "none",
            duration: 2e3
          });
        }
      });
    }
    // goToTest() {
    //   uni.navigateTo({
    //     url: '/pages/index/index'
    //   });
    // }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.o((...args) => $options.SynInformation && $options.SynInformation(...args)),
    b: !$data.canbutton,
    c: common_vendor.o((...args) => $options.gameStart && $options.gameStart(...args)),
    d: !$data.isConnected && !$data.canbutton,
    e: common_vendor.t($data.playerlist.length),
    f: common_vendor.f($data.playerlist, (item, index, i0) => {
      return {
        a: common_vendor.t(index + 1),
        b: common_vendor.t(item.deviceId || item),
        c: index
      };
    }),
    g: $data.playerCards.length > 0
  }, $data.playerCards.length > 0 ? common_vendor.e({
    h: common_vendor.t($data.playerCards.length),
    i: $data.selectedCard
  }, $data.selectedCard ? {
    j: common_vendor.t($data.selectedCard.rank),
    k: common_vendor.t($options.getSuitSymbol($data.selectedCard.suit)),
    l: common_vendor.n("card-" + $data.selectedCard.suit),
    m: common_vendor.o((...args) => $options.playCard && $options.playCard(...args)),
    n: common_vendor.o((...args) => $options.clearSelection && $options.clearSelection(...args))
  } : {}, {
    o: common_vendor.f($data.playerCards, (card, index, i0) => {
      return common_vendor.e({
        a: common_vendor.t(card.rank),
        b: common_vendor.t($options.getSuitSymbol(card.suit)),
        c: $data.selectedCard && $data.selectedCard.id === card.id
      }, $data.selectedCard && $data.selectedCard.id === card.id ? {} : {}, {
        d: common_vendor.n("card-" + card.suit),
        e: common_vendor.n($data.selectedCard && $data.selectedCard.id === card.id ? "selected" : ""),
        f: common_vendor.o(($event) => $options.selectCard(card), index),
        g: index
      });
    })
  }) : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/home/home.js.map
