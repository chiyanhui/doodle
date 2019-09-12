var Doodle = (function () {

  let activeDoodle = null;

  const consts = {
    DRAW: 1,
    ERASER: 2,
    TEXT: 3,
    NONE: 0,
    RESIZE: 1,
    DELETE: 2,
    MOVE: 3,
  };
  const cursors = {
    [consts.NONE]: '',
    [consts.RESIZE]: 'crosshair',
    [consts.DELETE]: 'not-allowed',
    [consts.MOVE]: 'move',
  };

  function Doodle(config) {
    if (!(this instanceof Doodle)) {
      return new Doodle(config);
    }
    this.config = Object.assign({
      width: 400,
      height: 300,
      background: null,
      cssBackground: true,
      drawOut: false,
      showEraser: false,
      hasPadding: false,
      hasBorder: false,
    }, config);
    this.data = {
      opration: null,
      path: null,
      history: [],
      redo: [],
      draw: {
        size: 2,
        color: '#000000',
      },
      text: {
        size: 30,
        color: '#000000',
        x: this.config.width / 2,
        y: this.config.height / 2,
        rotate: 0,
      },
      eraser: {
        size: 20,
      },
      mode: consts.DRAW,
      _background: null,
      points: {
        start: null,
        prev: null,
        out: null,
      }
    };
    this._finished = false;
    this.mousedown = false;
    this.onTextFinish = null;
    this.onModeChange = null;
    this.onHistoryChange = null;

    const doodle = this;
    const canvas = this.canvas = document.createElement('canvas');
    const hideCanvas = this.hideCanvas = document.createElement('canvas');
    canvas.width = hideCanvas.width = this.config.width;
    canvas.height = hideCanvas.height = this.config.height;
    this.ctx = canvas.getContext('2d');
    this.hideCtx = hideCanvas.getContext('2d');
    this.styleDeclaration = getComputedStyle(canvas);
    if (this.config.background) {
      if (this.config.cssBackground) {
        canvas.style.backgroundImage = `url(${this.config.background.src})`;
        canvas.style.backgroundSize = '100% 100%';
        canvas.style.backgroundOrigin = 'content-box';
        canvas.style.backgroundRepeat = 'no-repeat';
      } else {
        this.data._background = this.config.background;
        this.drawBackground();
      }
    }

    function onStart(e) {
      e.preventDefault();
      activeDoodle = doodle;
      doodle.mousedown = true;
      const data = doodle.data, ctx = doodle.hideCtx;
      const point = doodle.getInCoord(e);
      data.points.start = data.points.prev = point;
      data.path = [point.x, point.y];
      ctx.save();
      if (data.mode === consts.DRAW) {
        data.opration = Object.assign({
          mode: data.mode,
        }, data.draw);
        ctx.lineCap = 'round';
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineWidth = data.draw.size;
        ctx.strokeStyle = data.draw.color;
      } else if (data.mode === consts.ERASER) {
        data.opration = Object.assign({
          mode: data.mode,
        }, data.eraser);
        ctx.lineCap = 'round';
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = data.eraser.size;
      } else if (data.mode === consts.TEXT && data.opration) {
        const tData = data.opration;
        tData.handle = doodle.textHandle(point);
        tData.prevSize = tData.size;
        tData.prevWidth = tData.width;
      }
    }
    function onMove(e) {
      e.stopPropagation();
      const data = doodle.data, point = doodle.getInCoord(e);
      if (doodle.mousedown) {
        if (data.mode === consts.DRAW) {
          doodle.nextPoint(point);
        } else if (data.mode === consts.ERASER) {
          doodle.nextPoint(point);
          if (doodle.config.showEraser) {
            doodle.drawEraser(point);
          }
        } else if (data.mode === consts.TEXT && data.opration) {
          const tData = data.opration;
          if (tData.handle === consts.MOVE) {
            doodle.textMove(point);
          } else if (tData.handle === consts.RESIZE) {
            doodle.textRotate(point);
          }
        }
      } else if (data.mode === consts.ERASER && doodle.config.showEraser) {
        doodle.render();
        doodle.drawEraser(point);
      } else if (data.mode === consts.TEXT && data.opration) {
        canvas.style.cursor = cursors[doodle.textHandle(point)];
      }
    }
    function onEnd(e) {
      if (doodle.mousedown) {
        doodle.mousedown = false;
        if (doodle === activeDoodle) {
          activeDoodle = null;
        }
        const data = doodle.data, point = doodle.getInCoord(e);
        if (data.mode === consts.DRAW || data.mode === consts.ERASER) {
          doodle.nextPoint(point);
          doodle._stopPath();
        } else if (data.mode === consts.TEXT && data.opration) {
          const tData = data.opration;
          if (tData.handle === consts.DELETE && doodle.textHandle(point) === consts.DELETE) {
            data.opration = null;
            doodle.render();
            doodle.historyUpdate();
            if (typeof doodle.onTextFinish === 'function') {
              doodle.onTextFinish('DELETE');
            }
          } else if (tData.handle === consts.NONE && getDistance(data.points.start, point) < 20) {
            doodle._finishText('CLICK');
          }
        }
        doodle.hideCtx.restore();
      }
    }
    function onLeave(e) {
      const data = doodle.data;
      if (doodle.mousedown) {
        if (data.mode === consts.DRAW || data.mode === consts.ERASER) {
          if (doodle.config.drawOut) {
            doodle.nextPoint(doodle.getInCoord(e));
          }
        }
      } else if (data.mode === consts.ERASER && doodle.config.showEraser) {
        doodle.render();
      }
    }
    function onEnter(e) {
      const data = doodle.data;
      const point = doodle.getInCoord(e);
      if (doodle.mousedown) {
        if (data.mode === consts.DRAW || data.mode === consts.ERASER) {
          data.path.push(-32768, -32768);
          if (doodle.config.drawOut) {
            const prev = doodle.getOutCoord(data.points.out);
            data.points.prev = prev;
            data.path.push(prev.x, prev.y);
            doodle.nextPoint(point);
          }
          data.points.prev = point;
        }
      }
    }

    this.eventHandlers = [
      ['contextmenu', preventDefault],
      ['mousedown', onStart],
      ['mousemove', onMove],
      ['mouseup', onEnd],
      ['mouseleave', onLeave],
      ['mouseenter', onEnter],
    ];
    this.eventHandlers.forEach(item => {
      canvas.addEventListener(item[0], item[1]);
    });
  }

  function preventDefault(e) {
    e.preventDefault();
  }
  function outMove(e) {
    const doodle = activeDoodle;
    if (!doodle || !doodle.mousedown) {
      return;
    }
    const data = doodle.data;
    if (data.mode === consts.DRAW || data.mode === consts.ERASER) {
      if (doodle.config.drawOut) {
        data.points.out = { clientX: e.clientX, clientY: e.clientY };
      }
    } else if (data.mode === consts.TEXT && data.opration) {
      const tData = data.opration, point = doodle.getOutCoord(e);
      if (tData.handle === consts.MOVE) {
        doodle.textMove(point);
      } else if (tData.handle === consts.RESIZE) {
        doodle.textRotate(point);
      }
    }
  }
  function outEnd(e) {
    const doodle = activeDoodle;
    if (!doodle || !doodle.mousedown) {
      return;
    }
    activeDoodle = null;
    doodle.mousedown = false;
    const data = doodle.data;
    if (data.mode === consts.DRAW || data.mode === consts.ERASER) {
      doodle._stopPath();
    }
    doodle.hideCtx.restore();
  }
  window.addEventListener('mousemove', outMove);
  window.addEventListener('mouseup', outEnd);

  function drawLine(ctx, p1, p2) {
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }
  function drawPath(ctx, path) {
    var i = 2, len = path.length, x = path[0], y = path[1];
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (; i < len; i += 2) {
      x = path[i], y = path[i + 1];
      if (x === -32768 && y === -32768) {
        i += 2;
        ctx.moveTo(path[i], path[i + 1]);
      } else {
        ctx.lineTo(x, y);
        ctx.moveTo(x, y);
      }
    }
    ctx.stroke();
  }
  function getNewPosition(point, rotate) {
    var x = point.x * Math.cos(rotate) + point.y * Math.sin(rotate);
    var y = point.y * Math.cos(rotate) - point.x * Math.sin(rotate);
    return { x: x, y: y };
  }
  function getDistance(p1, p2) {
    return getLength(p1.x - p2.x, p1.y - p2.y);
  }
  function getLength(x, y) {
    return Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
  }
  function inRect(p, center, halfWidth, halfHeight) {
    return (Math.abs(p.x - center.x) < halfWidth && Math.abs(p.y - center.y) < halfHeight);
  }
  function getRotate(x, y) {
    if (x || y) {
      var atan = Math.atan(y / x);
      if (x < 0) {
        atan += Math.PI;
      }
      if (atan < 0) {
        atan += Math.PI * 2;
      }
      return atan;
    } else {
      return 0;
    }
  }
  function drawText(ctx, text, size, color, x, y, rotate) {
    const position = getNewPosition({ x, y }, rotate);
    ctx.rotate(rotate);
    ctx.font = size + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(text, position.x, position.y);
  }

  const proto = {
    textMode() {
      if (this._finished) {
        return;
      }
      if (this.config.showEraser && this.data.mode === consts.ERASER) {
        this.canvas.style.cursor = '';
      }
      this.data.mode = consts.TEXT;
    },
    eraserMode() {
      if (this._finished) {
        return;
      }
      if (this.config.showEraser) {
        this.canvas.style.cursor = 'none';
      }
      this.finishText();
      this.data.mode = consts.ERASER;
    },
    drawMode() {
      if (this._finished) {
        return;
      }
      if (this.config.showEraser && this.data.mode === consts.ERASER || this.data.mode === consts.TEXT) {
        this.canvas.style.cursor = '';
      }
      this.finishText();
      this.data.mode = consts.DRAW;
    },
    setDrawColor(color) {
      this.data.draw.color = color;
    },
    setDrawSize(size) {
      this.data.draw.size = size;
    },
    setEraserSize(size) {
      this.data.eraser.size = size;
    },
    setTextColor(color, updateNow) {
      this.data.text.color = color;
      if (updateNow) {
        const tData = this.data.opration;
        if (tData && tData.mode === consts.TEXT) {
          tData.color = color;
          this.textUpdate();
        }
      }
    },
    setTextSize(size) {
      this.data.text.size = size;
    },
    setColor(color, updateNow) {
      this.setDrawColor(color);
      this.setTextColor(color, updateNow);
    },
    addText(text, config) {
      if (this.data.mode !== consts.TEXT) {
        return false;
      }
      this.finishText();
      const opration = Object.assign({}, this.data.text, config, {
        text,
        mode: consts.TEXT,
      });
      this.data.opration = opration;
      const width = this.drawText(opration, true);
      opration.width = width;
      this.drawTextController();
      this.data.redo.length = 0;
      this.historyUpdate();
      return true;
    },
    finishText() {
      const tData = this.data.opration;
      if (tData && tData.mode === consts.TEXT) {
        this._finishText('CALL');
        return true;
      }
      return false;
    },
    undo() {
      if (this._finished) {
        return;
      }
      const lastOpration = this.data.opration || this.data.history.pop();
      if (lastOpration) {
        this.data.redo.push(lastOpration);
        this.drawHistory();
        this.render();
        if (lastOpration.mode === consts.TEXT && !lastOpration.fixed) {
          this.data.opration = null;
          if (typeof this.onTextFinish === 'function') {
            this.onTextFinish('UNDO');
          }
        }
        this.historyUpdate();
        return this.data.history.length;
      }
      return -1;
    },
    redo() {
      if (this._finished) {
        return;
      }
      const nextOpration = this.data.redo.pop();
      if (nextOpration) {
        if (nextOpration.mode === consts.TEXT && !nextOpration.fixed) {
          this.data.opration = nextOpration;
          this.drawHistory();
          this.textMode();
          this.textUpdate();
          if (this.data.mode !== consts.TEXT && typeof this.onModeChange === 'function') {
            this.onModeChange('TEXT');
          }
        } else {
          this.data.history.push(nextOpration);
          this.drawHistory();
          this.render();
        }
        this.historyUpdate();
        return this.data.redo.length;
      }
      return -1;
    },
    _finishText(reason) {
      const data = this.data,
        tData = data.opration;
      tData.fixed = true;
      delete tData.prevSize;
      delete tData.prevWidth;
      data.opration = null;
      data.history.push(tData);
      this.drawText(tData, false, this.hideCtx);
      this.render();
      if (typeof this.onTextFinish === 'function') {
        this.onTextFinish(reason);
      }
    },
    historyUpdate() {
      if (typeof this.onHistoryChange === 'function') {
        this.onHistoryChange(this.data.history.length + (this.data.opration ? 1: 0), this.data.redo.length);
      }
    },
    textUpdate() {
      this.render();
      this.drawText(this.data.opration);
      this.drawTextController();
    },
    textRotate(point) {
      const data = this.data, tData = data.opration, points = data.points;
      tData.rotate = getRotate(point.x - tData.x, point.y - tData.y) - getRotate(tData.prevWidth, tData.prevSize * 1.5);
      const ratio = getDistance(tData, point) / getDistance(tData, points.start);
      tData.size = tData.prevSize * ratio;
      tData.width = tData.prevWidth * ratio;
      points.prev = point;
      this.textUpdate();
    },
    textMove(point) {
      const data = this.data, tData = data.opration, points = data.points;
      tData.x += point.x - points.prev.x;
      tData.y += point.y - points.prev.y;
      points.prev = point;
      this.textUpdate();
    },
    textHandle(point) {
      const tData = this.data.opration;
      const position = getNewPosition(point, tData.rotate);
      const center = getNewPosition(tData, tData.rotate);
      if (inRect(position, { x: center.x + tData.width / 2, y: center.y + tData.size * 0.75 }, 10, 10)) {
        return consts.RESIZE;
      } else if (getDistance(position, { x: center.x - tData.width / 2, y: center.y - tData.size * 0.75 }) < 10) {
        return consts.DELETE;
      } else if (inRect(position, center, tData.width / 2, tData.size * 0.75)) {
        return consts.MOVE;
      } else {
        return consts.NONE;
      }
    },
    drawText(tData, measure, ctx) {
      let width;
      ctx = ctx || this.ctx;
      ctx.save();
      drawText(ctx, tData.text, tData.size, tData.color, tData.x, tData.y, tData.rotate);
      if (measure) {
        width = ctx.measureText('a' + tData.text + 'a').width;
      }
      ctx.restore();
      return width;
    },
    drawTextController() {
      const tData = this.data.opration, ctx = this.ctx;
      const position = getNewPosition({ x: tData.x, y: tData.y }, tData.rotate);
      ctx.save();
      ctx.rotate(tData.rotate);
      ctx.strokeStyle = '#0079ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(position.x - tData.width / 2, position.y - tData.size * 0.75, tData.width, tData.size * 1.5);
      ctx.fillStyle = 'red';
      ctx.beginPath();
      ctx.arc(position.x - tData.width / 2, position.y - tData.size * 0.75, 10, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = '#b2ccff';
      ctx.fillRect(position.x + tData.width / 2 - 10, position.y + tData.size * 0.75 - 10, 20, 20);
      ctx.restore();
    },
    _stopPath() {
      const data = this.data,
        opration = data.opration;
      opration.path = new Int16Array(data.path);
      data.opration = data.path = null;
      data.history.push(opration);
      data.redo.length = 0;
      this.historyUpdate();
    },
    nextPoint(point) {
      this.data.path.push(point.x, point.y);
      drawLine(this.hideCtx, this.data.points.prev, point);
      this.render();
      this.data.points.prev = point;
    },
    getOutCoord(e) {
      const clientRect = this.canvas.getBoundingClientRect();
      let x = e.clientX - clientRect.left,
        y = e.clientY - clientRect.top;
      if (this.config.hasPadding) {
        x -= parseFloat(this.styleDeclaration.paddingLeft);
        y -= parseFloat(this.styleDeclaration.paddingTop);
      }
      if (this.config.hasBorder) {
        x -= parseFloat(this.styleDeclaration.borderLeftWidth);
        y -= parseFloat(this.styleDeclaration.borderTopWidth);
      }
      return { x, y };
    },
    getInCoord(e) {
      let x = e.offsetX, y = e.offsetY;
      if (this.config.hasPadding) {
        x -= parseFloat(this.styleDeclaration.paddingLeft);
        y -= parseFloat(this.styleDeclaration.paddingTop);
      }
      return { x, y };
    },
    drawEraser(point) {
      const ctx = this.ctx, x = point.x, y = point.y;
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, this.data.eraser.size / 2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    },
    render() {
      this.ctx.clearRect(0, 0, this.config.width, this.config.height);
      this.drawBackground();
      this.drawImage(this.ctx, this.hideCanvas);
    },
    drawBackground() {
      if (this.data._background) {
        this.drawImage(this.ctx, this.data._background);
      }
    },
    drawImage(ctx, img) {
      ctx.drawImage(img, 0, 0, this.config.width, this.config.height);
    },
    drawHistory(ctx) {
      ctx = ctx || this.hideCtx;
      const history = this.data.history;
      ctx.save();
      ctx.clearRect(0, 0, this.config.width, this.config.height);
      ctx.lineCap = 'round';
      history.forEach(opration => {
        if (opration.mode === consts.ERASER) {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.lineWidth = opration.size;
          drawPath(ctx, opration.path);
        } else if (opration.mode === consts.DRAW) {
          ctx.globalCompositeOperation = 'source-over';
          ctx.lineWidth = opration.size;
          ctx.strokeStyle = opration.color;
          drawPath(ctx, opration.path);
        } else if (opration.mode === consts.TEXT) {
          ctx.globalCompositeOperation = 'source-over';
          this.drawText(opration, false, this.hideCtx);
        }
      });
      ctx.restore();
    },
    finish() {
      if (this._finished) {
        return false;
      }
      this.eventHandlers.forEach(item => {
        this.canvas.removeEventListener(item[0], item[1]);
      });
      this.drawMode();
      this.ctx.clearRect(0, 0, this.config.width, this.config.height);
      if (this.config.background) {
        this.drawImage(this.ctx, this.config.background);
      }
      this.drawImage(this.ctx, this.hideCanvas);
      this._finished = true;
      this.data.history = [];
      this.data.redo = [];
      this.historyUpdate();
      return true;
    }
  };

  Object.assign(Doodle.prototype, proto);

  return Doodle;
})();
