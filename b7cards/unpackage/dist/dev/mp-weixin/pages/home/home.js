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
      isYourTurn: false
      // 是否轮到当前玩家出牌
    };
  },
  onLoad() {
    this.setupWebSocketListener();
  },
  methods: {
    setupWebSocketListener() {
      if (app.globalData.socketTask && app.globalData.isConnected) {
        common_vendor.index.__f__("log", "at pages/home/home.vue:128", "监听器设置成功");
        this.canbutton = true;
        app.globalData.socketTask.onMessage((res) => {
          common_vendor.index.__f__("log", "at pages/home/home.vue:132", "Home页面收到WebSocket消息:", res);
          try {
            const messageData = JSON.parse(res.data);
            if (messageData.type == "syninformation") {
              common_vendor.index.__f__("log", "at pages/home/home.vue:138", "进入到同步数组if");
              this.playerlist = messageData.content;
            }
            if (messageData.type == "alert") {
              common_vendor.index.__f__("log", "at pages/home/home.vue:144", messageData.content);
              common_vendor.index.showToast({
                title: messageData.content,
                icon: "error",
                duration: 2e3
              });
            }
            if (messageData.type == "gameStartRes") {
              common_vendor.index.__f__("log", "at pages/home/home.vue:152", "收到游戏开始响应，手牌信息:", messageData.content);
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
              this.isYourTurn = messageData.content.isYourTurn;
              common_vendor.index.showToast({
                title: `游戏开始！获得${this.playerCards.length}张牌`,
                icon: "success",
                duration: 2e3
              });
            }
            if (messageData.type == "pileUpdate") {
              common_vendor.index.__f__("log", "at pages/home/home.vue:176", "收到牌堆更新消息:", messageData.content);
              this.gamePiles = messageData.content.pileInfo;
              if (messageData.content.currentPlayer) {
                this.currentPlayer = messageData.content.currentPlayer;
                this.isYourTurn = this.currentPlayer === app.globalData.diviceid;
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
              common_vendor.index.__f__("log", "at pages/home/home.vue:199", "出牌成功:", messageData.content);
              common_vendor.index.showToast({
                title: messageData.content,
                icon: "success",
                duration: 2e3
              });
            }
            if (messageData.type == "playCardFail") {
              common_vendor.index.__f__("log", "at pages/home/home.vue:209", "出牌失败:", messageData.content);
              common_vendor.index.showToast({
                title: messageData.content,
                icon: "error",
                duration: 2e3
              });
            }
          } catch (error) {
            common_vendor.index.__f__("error", "at pages/home/home.vue:218", "消息解析失败:", error, "原始数据:", res.data);
          }
        });
        this.isListening = true;
        common_vendor.index.__f__("log", "at pages/home/home.vue:225", "Home页面WebSocket监听器已设置");
      } else {
        common_vendor.index.__f__("log", "at pages/home/home.vue:227", "WebSocket未连接，无法设置监听器");
        setTimeout(() => {
          this.setupWebSocketListener();
        }, 2e3);
      }
    },
    SynInformation() {
      common_vendor.index.__f__("log", "at pages/home/home.vue:235", "是否成功连接" + app.globalData.isConnected);
      common_vendor.index.__f__("log", "at pages/home/home.vue:236", "socketTask:" + app.globalData.socketTask);
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
            common_vendor.index.__f__("log", "at pages/home/home.vue:250", "同步信息成功");
          },
          fail: (err) => {
            common_vendor.index.__f__("error", "at pages/home/home.vue:255", "同步用户信息失败:", err);
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
          common_vendor.index.__f__("log", "at pages/home/home.vue:277", "发送开始游戏请求");
        },
        fail: (err) => {
          common_vendor.index.__f__("error", "at pages/home/home.vue:282", "发送卡开始请求失败:", err);
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
      common_vendor.index.__f__("log", "at pages/home/home.vue:322", "出牌:", this.selectedCard);
      const message = {
        type: "playCard",
        playerid: app.globalData.diviceid,
        card: this.selectedCard
      };
      app.globalData.socketTask.send({
        data: JSON.stringify(message),
        success: () => {
          common_vendor.index.__f__("log", "at pages/home/home.vue:335", "出牌请求发送成功，等待服务器验证");
        },
        fail: (err) => {
          common_vendor.index.__f__("error", "at pages/home/home.vue:340", "出牌请求发送失败:", err);
          common_vendor.index.showToast({
            title: "出牌请求发送失败",
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
    e: $data.gameStatus === "playing" && $data.currentPlayer
  }, $data.gameStatus === "playing" && $data.currentPlayer ? common_vendor.e({
    f: $data.isYourTurn
  }, $data.isYourTurn ? {} : {
    g: common_vendor.t($data.currentPlayer)
  }, {
    h: common_vendor.n($data.isYourTurn ? "your-turn" : "other-turn")
  }) : {}, {
    i: $data.gamePiles
  }, $data.gamePiles ? {
    j: common_vendor.f($data.gamePiles, (pile, suit, i0) => {
      return common_vendor.e({
        a: common_vendor.t($options.getSuitSymbol(suit)),
        b: common_vendor.t(pile.count),
        c: pile.cards && pile.cards.length > 0
      }, pile.cards && pile.cards.length > 0 ? {
        d: common_vendor.f(pile.cards, (entry, index, i1) => {
          return common_vendor.e({
            a: common_vendor.t(entry.card.rank),
            b: common_vendor.t($options.getSuitSymbol(entry.card.suit)),
            c: index < pile.cards.length - 1
          }, index < pile.cards.length - 1 ? {} : {}, {
            d: index,
            e: common_vendor.n(entry.card.rank === "7" ? "seven-card" : "")
          });
        })
      } : {}, {
        e: pile.playedBy
      }, pile.playedBy ? {
        f: common_vendor.t(pile.playedBy)
      } : {}, {
        g: common_vendor.n("pile-" + suit),
        h: suit
      });
    })
  } : {}, {
    k: common_vendor.t($data.playerlist.length),
    l: common_vendor.f($data.playerlist, (item, index, i0) => {
      return {
        a: common_vendor.t(index + 1),
        b: common_vendor.t(item.deviceId || item),
        c: index
      };
    }),
    m: $data.playerCards.length > 0
  }, $data.playerCards.length > 0 ? common_vendor.e({
    n: common_vendor.t($data.playerCards.length),
    o: $data.selectedCard
  }, $data.selectedCard ? {
    p: common_vendor.t($data.selectedCard.rank),
    q: common_vendor.t($options.getSuitSymbol($data.selectedCard.suit)),
    r: common_vendor.n("card-" + $data.selectedCard.suit),
    s: common_vendor.o((...args) => $options.playCard && $options.playCard(...args)),
    t: common_vendor.o((...args) => $options.clearSelection && $options.clearSelection(...args))
  } : {}, {
    v: common_vendor.f($data.playerCards, (card, index, i0) => {
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
