// 文件名：copy-game-json.js
const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, 'game.json');
const destDir = path.resolve(__dirname, 'unpackage/dist/dev/mp-weixin');
const dest = path.resolve(destDir, 'game.json');

if (fs.existsSync(src)) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
  console.log('✅ game.json 已自动拷贝到：', dest);
} else {
  console.warn('⚠️ 未找到 game.json（源路径：' + src + '），请确认它已放在项目根目录');
}
