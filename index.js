var editBtn = document.querySelector('#editBtn'),
  previewImg = document.querySelector('#previewImg'),
  container = document.querySelector('#container'),
  imageEdit = document.querySelector('#imageEdit'),
  colorList = document.querySelector('#colorList'),
  eraser = document.querySelector('#eraser'),
  text = document.querySelector('#text'),
  addText = document.querySelector('#addText'),
  undo = document.querySelector('#undo'),
  redo = document.querySelector('#redo'),
  finish = document.querySelector('#finish'),
  colors = ['#cc0000', '#ff8000', '#ffbf00', '#6cbf00', '#80d4ff', '#0095ff', '#75008c', '#222222', '#ffffff'],
  color = '#cc0000',
  myDoodle = null,
  editing = false,
  downloadLink = null;

editBtn.addEventListener('click', function () {
  editing = !editing;
  if (editing) {
    this.innerHTML = '取消';
    myDoodle = new Doodle({
      width: previewImg.width,
      height: previewImg.height,
      background: previewImg,
      cssBackground: false,
      drawOut: true,
      showEraser: true,
    });
    myDoodle.setColor(color, true);
    previewImg.style.display = 'none';
    imageEdit.style.display = 'block';
    container.insertBefore(myDoodle.canvas, imageEdit);
    eraser.checked = false;
    myDoodle.onTextFinish = onTextFinish;
    myDoodle.onModeChange = onModeChange;
    myDoodle.onHistoryChange = onHistoryChange;
    undo.classList.add('disable');
    redo.classList.add('disable');
  } else {
    this.innerHTML = '编辑';
    previewImg.style.display = 'block';
    imageEdit.style.display = 'none';
    container.removeChild(myDoodle.canvas);
    myDoodle = null;
  }
});

function onTextFinish(reason) {
  if (reason === 'CLICK' || reason === 'UNDO' || reason === 'DELETE') {
    this.drawMode();
  }
}
function onModeChange(mode) {
  if (mode === 'TEXT') {
    eraser.checked = false;
  }
}
function onHistoryChange(undoLength, redoLength) {
  if (undoLength) {
    undo.classList.remove('disable');
  } else {
    undo.classList.add('disable');
  }
  if (redoLength) {
    redo.classList.remove('disable');
  } else {
    redo.classList.add('disable');
  }
}

colors.forEach(color => {
  const item = document.createElement('i');
  item.style.background = color;
  colorList.appendChild(item);
});
colorList.addEventListener('click', function(e) {
  if (e.target.tagName === 'I') {
    const index = elemIndex(e.target);
    color = colors[index];
    document.querySelector('#color').style.background = color;
    myDoodle.setColor(color, true);
  }
});
function elemIndex(elem) {
  return Array.prototype.indexOf.call(elem.parentNode.childNodes, elem);
}

addText.addEventListener('click', function() {
  if (text.value) {
    eraser.checked = false;
    myDoodle.textMode();
    myDoodle.addText(text.value);
    text.value = '';
  }
});

eraser.addEventListener('change', function() {
  if (this.checked) {
    myDoodle.eraserMode();
  } else {
    myDoodle.drawMode();
  }
});

undo.addEventListener('click', function() {
  myDoodle.undo();
});

redo.addEventListener('click', function() {
  myDoodle.redo();
});

finish.addEventListener('click', function() {
  if (myDoodle.finish()) {
    let a = document.createElement('a');
    a.download = 'doodle';
    downloadLink = a;
    myDoodle.canvas.toBlob(blob => {
      a.href = URL.createObjectURL(blob);
      a.click();
    }, 'image/png');
  } else {
    downloadLink.click();
  }
});
