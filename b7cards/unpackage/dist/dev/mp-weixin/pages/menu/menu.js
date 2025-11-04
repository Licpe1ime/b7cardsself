"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "menu",
  setup(__props) {
    const startAIGame = () => {
      common_vendor.index.showToast({
        title: "AI对战功能开发中",
        icon: "none",
        duration: 2e3
      });
    };
    const startLocalGame = () => {
      common_vendor.index.switchTab({
        url: "/pages/home/home"
      });
    };
    const exitGame = () => {
      common_vendor.index.showModal({
        title: "退出游戏",
        content: "确定要退出游戏吗？",
        success: (result) => {
          if (result.confirm) {
            common_vendor.wx$1.exitMiniProgram();
          }
        }
      });
    };
    return (_ctx, _cache) => {
      return {
        a: common_vendor.o(startAIGame),
        b: common_vendor.o(startLocalGame),
        c: common_vendor.o(exitGame)
      };
    };
  }
});
wx.createPage(_sfc_main);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/menu/menu.js.map
