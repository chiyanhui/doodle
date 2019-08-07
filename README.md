# pastec-demo

JavaScript canvas 涂鸦

## 在线示例
- <https://chiyanhui.github.io/doodle/index.html>

## 使用方法
```javascript
let doodle = new Doodle({
  width: previewImg.width, // 画布宽度
  height: previewImg.height, // 画布高度
  background: image, // HTMLImageElement, 背景, 可省略
  cssBackground: true, // 默认true, 在涂鸦时用css背景而不是ctx.drawImage
  drawOut: false, // 默认false, 在画笔移出/移入canvas时画到边界
  showEraser: false, // 默认false, 在橡皮擦模式时在画布显示一个圆, 隐藏鼠标指针
  hasPadding: false, // 默认false, canvas是否有padding
  hasBorder: false, // 默认false, canvas是否有border
});

container.appendChild(doodle.canvas); // 将画布添加到dom元素显示

doodle.drawMode(); // 画笔模式
doodle.eraserMode(); // 橡皮擦模式
doodle.textMode(); // 文字模式

doodle.setDrawColor('#ff0000'); // 设置画笔颜色
doodle.setDrawSize(2); // 设置画笔粗细
doodle.setEraserSize(20); // 设置橡皮粗细
doodle.setTextColor('#ff00ff', true); // 设置默认文字颜色, 以及是否修改正在编辑的文字颜色
doodle.setTextSize(30); // 设置默认文字大小
doodle.setColor('red', false); // 同时设置画笔和文字颜色, 以及是否修改正在编辑的文字颜色

// 添加文字, 可设置和默认设置不同的配置, 配置参数可省略
doodle.addText('Hello world!', {
  size: 40,
  color: '#fff',
  x: 300,
  y: 100,
  rotate: Math.PI / 6,
});

doodle.finishText(); // 文字结束编辑

doodle.undo(); // 撤销操作
doodle.redo(); // 重做操作

doodle.finish(); // 涂鸦结束, canvas不能再编辑

// 文字结束编辑时触发
doodle.onTextFinish = function(reason) {
  if (reason === 'CLICK') {
    // 鼠标点击canvas中文字外区域
  } else if (reason === 'UNDO') {
    // 撤销操作
  } else if (reason === 'call') {
    // 调用了 doodle.finishText(), 包括内部调用, 如切换模式、添加新文字
  }
};

// 当非用户主动切换模式而模式改变时调用
doodle.onModeChange = function(mode) {
  if (mode === 'TEXT') {
    // 因为重做操作, 恢复了没有结束编辑的文字
  }
};

// 当历史记录(撤销/重做)长度可能发生变化时调用
doodle.onHistoryChange = function(undoLength, redoLength) {
  if (undoLength < 0) {
    // 不能继续撤销
  }
  if (redoLength < 0) {
    // 不能继续重做
  }
};

```