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
      gameStatus: "waiting",
      // waiting, playing, ended
      gamePiles: {
        hearts: { suit: "hearts", count: 0, topCard: null, playedBy: null, cards: [] },
        spades: { suit: "spades", count: 0, topCard: null, playedBy: null, cards: [] },
        diamonds: { suit: "diamonds", count: 0, topCard: null, playedBy: null, cards: [] },
        clubs: { suit: "clubs", count: 0, topCard: null, playedBy: null, cards: [] }
      },
      currentPlayer: null,
      // 当前出牌玩家
      isYourTurn: false,
      // 是否轮到当前玩家出牌
      canPass: false,
      // 是否可以pass
      passHint: ""
      // pass提示信息
    };
  },
  onLoad() {
    this.setupWebSocketListener();
  },
  methods: {
    // 返回菜单
    goBack() {
      common_vendor.index.navigateTo({
        url: "/pages/menu/menu"
      });
    },
    setupWebSocketListener() {
      if (app.globalData.socketTask && app.globalData.isConnected) {
        common_vendor.index.__f__("log", "at pages/home/home.vue:155", "监听器设置成功");
        this.canbutton = true;
        app.globalData.socketTask.onMessage((res) => {
          common_vendor.index.__f__("log", "at pages/home/home.vue:159", "Home页面收到WebSocket消息:", res);
          try {
            const messageData = JSON.parse(res.data);
            if (messageData.type == "syninformation") {
              common_vendor.index.__f__("log", "at pages/home/home.vue:165", "进入到同步数组if");
              this.playerlist = messageData.content;
            }
            if (messageData.type == "alert") {
              common_vendor.index.__f__("log", "at pages/home/home.vue:171", messageData.content);
              common_vendor.index.showToast({
                title: messageData.content,
                icon: "error",
                duration: 2e3
              });
            }
            if (messageData.type == "gameStartRes") {
              common_vendor.index.__f__("log", "at pages/home/home.vue:179", "收到游戏开始响应，手牌信息:", messageData.content);
              this.playerCards = messageData.content.playerCards || [];
              this.gameStatus = "playing";
              this.selectedCard = null;
              this.gamePiles = {
                hearts: { suit: "hearts", count: 0, topCard: null, playedBy: null, cards: [] },
                spades: { suit: "spades", count: 0, topCard: null, playedBy: null, cards: [] },
                diamonds: { suit: "diamonds", count: 0, topCard: null, playedBy: null, cards: [] },
                clubs: { suit: "clubs", count: 0, topCard: null, playedBy: null, cards: [] }
              };
              this.currentPlayer = messageData.content.currentPlayer;
              this.isYourTurn = this.currentPlayer === app.globalData.diviceid;
              this.checkCanPass();
              common_vendor.index.showToast({
                title: `游戏开始！获得${this.playerCards.length}张牌`,
                icon: "success",
                duration: 2e3
              });
            }
            if (messageData.type == "pileUpdate") {
              common_vendor.index.__f__("log", "at pages/home/home.vue:206", "收到牌堆更新消息:", messageData.content);
              this.gamePiles = messageData.content.pileInfo;
              if (messageData.content.currentPlayer) {
                this.currentPlayer = messageData.content.currentPlayer;
                this.isYourTurn = this.currentPlayer === app.globalData.diviceid;
                this.checkCanPass();
              }
              if (messageData.content.remainingCards !== void 0) {
                if (messageData.content.playedBy === app.globalData.diviceid) {
                  this.playerCards = this.playerCards.filter(
                    (card) => card.id !== messageData.content.playedCard.id
                  );
                  this.selectedCard = null;
                }
              }
            }
            if (messageData.type == "playCardSuccess") {
              common_vendor.index.__f__("log", "at pages/home/home.vue:231", "出牌成功:", messageData.content);
              common_vendor.index.showToast({
                title: messageData.content,
                icon: "success",
                duration: 2e3
              });
            }
            if (messageData.type == "playCardFail") {
              common_vendor.index.__f__("log", "at pages/home/home.vue:241", "出牌失败:", messageData.content);
              common_vendor.index.showToast({
                title: messageData.content,
                icon: "error",
                duration: 2e3
              });
            }
            if (messageData.type == "passSuccess") {
              common_vendor.index.__f__("log", "at pages/home/home.vue:251", "Pass成功:", messageData.content);
              if (messageData.content.nextPlayer) {
                this.currentPlayer = messageData.content.nextPlayer;
                this.isYourTurn = this.currentPlayer === app.globalData.diviceid;
                this.checkCanPass();
              }
              common_vendor.index.showToast({
                title: messageData.content.message,
                icon: "success",
                duration: 2e3
              });
            }
            if (messageData.type == "passFail") {
              common_vendor.index.__f__("log", "at pages/home/home.vue:270", "Pass失败:", messageData.content);
              common_vendor.index.showToast({
                title: messageData.content,
                icon: "error",
                duration: 2e3
              });
            }
          } catch (error) {
            common_vendor.index.__f__("error", "at pages/home/home.vue:279", "消息解析失败:", error, "原始数据:", res.data);
          }
        });
        this.isListening = true;
        common_vendor.index.__f__("log", "at pages/home/home.vue:286", "Home页面WebSocket监听器已设置");
      } else {
        common_vendor.index.__f__("log", "at pages/home/home.vue:288", "WebSocket未连接，无法设置监听器");
        setTimeout(() => {
          this.setupWebSocketListener();
        }, 2e3);
      }
    },
    SynInformation() {
      common_vendor.index.__f__("log", "at pages/home/home.vue:296", "是否成功连接" + app.globalData.isConnected);
      common_vendor.index.__f__("log", "at pages/home/home.vue:297", "socketTask:" + app.globalData.socketTask);
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
            common_vendor.index.__f__("log", "at pages/home/home.vue:311", "同步信息成功");
          },
          fail: (err) => {
            common_vendor.index.__f__("error", "at pages/home/home.vue:316", "同步用户信息失败:", err);
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
          common_vendor.index.__f__("log", "at pages/home/home.vue:338", "发送开始游戏请求");
        },
        fail: (err) => {
          common_vendor.index.__f__("error", "at pages/home/home.vue:343", "发送卡开始请求失败:", err);
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
      common_vendor.index.__f__("log", "at pages/home/home.vue:383", "出牌:", this.selectedCard);
      const message = {
        type: "playCard",
        playerid: app.globalData.diviceid,
        card: this.selectedCard
      };
      app.globalData.socketTask.send({
        data: JSON.stringify(message),
        success: () => {
          common_vendor.index.__f__("log", "at pages/home/home.vue:396", "出牌请求发送成功，等待服务器验证");
        },
        fail: (err) => {
          common_vendor.index.__f__("error", "at pages/home/home.vue:401", "出牌请求发送失败:", err);
          common_vendor.index.showToast({
            title: "出牌请求发送失败",
            icon: "none",
            duration: 2e3
          });
        }
      });
    },
    // Pass操作
    passTurn() {
      if (!this.isYourTurn) {
        common_vendor.index.showToast({
          title: "现在不是你的回合",
          icon: "none",
          duration: 2e3
        });
        return;
      }
      common_vendor.index.__f__("log", "at pages/home/home.vue:422", "玩家选择Pass");
      const message = {
        type: "passTurn",
        playerid: app.globalData.diviceid
      };
      app.globalData.socketTask.send({
        data: JSON.stringify(message),
        success: () => {
          common_vendor.index.__f__("log", "at pages/home/home.vue:433", "Pass请求发送成功");
        },
        fail: (err) => {
          common_vendor.index.__f__("error", "at pages/home/home.vue:436", "Pass请求发送失败:", err);
          common_vendor.index.showToast({
            title: "Pass请求发送失败",
            icon: "none",
            duration: 2e3
          });
        }
      });
    },
    // 检查是否可以Pass
    checkCanPass() {
      if (!this.isYourTurn || this.gameStatus !== "playing") {
        this.canPass = false;
        this.passHint = "";
        return;
      }
      this.canPass = true;
      this.passHint = "可以Pass";
    }
    // 简化前端判断，所有规则判断交给后端
    // goToTest() {
    //   uni.navigateTo({
    //     url: '/pages/index/index'
    //   });
    // }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.o((...args) => $options.goBack && $options.goBack(...args)),
    b: common_vendor.o((...args) => $options.SynInformation && $options.SynInformation(...args)),
    c: !$data.canbutton,
    d: common_vendor.o((...args) => $options.gameStart && $options.gameStart(...args)),
    e: !$data.isConnected && !$data.canbutton,
    f: $data.gameStatus === "playing" && $data.currentPlayer
  }, $data.gameStatus === "playing" && $data.currentPlayer ? common_vendor.e({
    g: $data.isYourTurn
  }, $data.isYourTurn ? {} : {
    h: common_vendor.t($data.currentPlayer)
  }, {
    i: common_vendor.n($data.isYourTurn ? "your-turn" : "other-turn")
  }) : {}, {
    j: $data.gamePiles
  }, $data.gamePiles ? {
    k: common_vendor.f($data.gamePiles, (pile, suit, i0) => {
      return common_vendor.e({
        a: pile.cards && pile.cards.length > 0
      }, pile.cards && pile.cards.length > 0 ? common_vendor.e({
        b: common_vendor.t($options.getSuitSymbol(suit)),
        c: common_vendor.t(pile.count),
        d: common_vendor.f(pile.cards, (entry, index, i1) => {
          return {
            a: common_vendor.t(entry.card.rank),
            b: common_vendor.t($options.getSuitSymbol(entry.card.suit)),
            c: index,
            d: common_vendor.n("card-" + entry.card.suit),
            e: common_vendor.n(entry.card.rank === "7" ? "seven-card" : ""),
            f: index > 0 ? "-20px" : "0"
          };
        }),
        e: pile.playedBy
      }, pile.playedBy ? {
        f: common_vendor.t(pile.playedBy)
      } : {}) : {}, {
        g: suit
      });
    })
  } : {}, {
    l: common_vendor.t($data.playerlist.length),
    m: common_vendor.f($data.playerlist, (item, index, i0) => {
      return {
        a: common_vendor.t(index + 1),
        b: common_vendor.t(item.deviceId || item),
        c: index
      };
    }),
    n: $data.playerCards.length > 0
  }, $data.playerCards.length > 0 ? common_vendor.e({
    o: common_vendor.t($data.playerCards.length),
    p: $data.selectedCard
  }, $data.selectedCard ? common_vendor.e({
    q: common_vendor.t($data.selectedCard.rank),
    r: common_vendor.t($options.getSuitSymbol($data.selectedCard.suit)),
    s: common_vendor.n("card-" + $data.selectedCard.suit),
    t: common_vendor.o((...args) => $options.playCard && $options.playCard(...args)),
    v: common_vendor.o((...args) => $options.clearSelection && $options.clearSelection(...args)),
    w: $data.isYourTurn && $data.gameStatus === "playing"
  }, $data.isYourTurn && $data.gameStatus === "playing" ? common_vendor.e({
    x: common_vendor.o((...args) => $options.passTurn && $options.passTurn(...args)),
    y: !$data.canPass,
    z: !$data.canPass
  }, !$data.canPass ? {
    A: common_vendor.t($data.passHint)
  } : {}) : {}) : {}, {
    B: common_vendor.f($data.playerCards, (card, index, i0) => {
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
