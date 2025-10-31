"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {};
  },
  onLoad() {
  },
  onShow() {
  },
  methods: {
    // 与AI对战
    startAIGame() {
      common_vendor.index.showToast({
        title: "AI对战功能开发中",
        icon: "none",
        duration: 2e3
      });
    },
    // 局域网模式
    startLocalGame() {
      common_vendor.index.switchTab({
        url: "/pages/home/home"
      });
    },
    // 退出游戏
    exitGame() {
      common_vendor.index.showModal({
        title: "退出游戏",
        content: "确定要退出游戏吗？",
        success: (res) => {
          if (res.confirm) {
            common_vendor.index.navigateBack({
              delta: 999
            });
          }
        }
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.o((...args) => $options.startAIGame && $options.startAIGame(...args)),
    b: common_vendor.o((...args) => $options.startLocalGame && $options.startLocalGame(...args)),
    c: common_vendor.o((...args) => $options.exitGame && $options.exitGame(...args))
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/menu/menu.js.map
