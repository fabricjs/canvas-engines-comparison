import * as fabric from "fabric";
import Engine from "./engine";

// fabric.StaticCanvas.prototype.renderCanvas = function (ctx, objects) {
//   this.clearContext(this.getContext());
//   this._renderObjects(ctx, objects);
// };

const uAffine = (product, curr) =>
  curr ? fabric.util.multiplyTransformMatrices(curr, product, false) : product;

const u = (product, curr) =>
  curr ? fabric.util.multiplyTransformMatrices(curr, product, true) : product;

const multiplyTransformMatrixArray = (matrices, is2x2) =>
  matrices.reduceRight(is2x2 ? u : uAffine, fabric.iMatrix.concat());

class OptimizedRect extends fabric.Rect {
  m;
  calcOwnMatrix() {
    // return [1, 0, 0, 1, this.left, this.top];
    if (this.m) {
      return this.m;
    }
    const {
      angle,
      scaleX,
      scaleY,
      flipX,
      flipY,
      skewX,
      skewY,
      left: x,
      top: y,
    } = this;

    const m = multiplyTransformMatrixArray(
      [
        // fabric.util.createTranslateMatrix(x, y),
        angle && fabric.util.createRotateMatrix({ angle }),
        (scaleX !== 1 || scaleY !== 1 || flipX || flipY) &&
          fabric.util.createScaleMatrix(
            flipX ? -scaleX : scaleX,
            flipY ? -scaleY : scaleY
          ),
        skewX && fabric.util.createSkewXMatrix(skewX),
        skewY && fabric.util.createSkewYMatrix(skewY),
      ],
      true
    );

    m[4] = x;
    m[5] = y;
    return (this.m = m);

    // return fabric.util.composeMatrix({
    //   angle: this.angle,
    //   translateX: center.x,
    //   translateY: center.y,
    //   scaleX: this.scaleX,
    //   scaleY: this.scaleY,
    //   skewX: this.skewX,
    //   skewY: this.skewY,
    //   flipX: this.flipX,
    //   flipY: this.flipY,
    // });
  }

  /**
   *
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    const dpr = this.canvas.getRetinaScaling();
    // ctx.resetTransform();
    // ctx.scale(dpr, dpr);
    // this.transform(ctx);
    const t = this.calcTransformMatrix();
    ctx.setTransform(
      dpr * t[0],
      t[1],
      t[2],
      dpr * t[3],
      dpr * t[4],
      dpr * t[5]
    );
    ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
    ctx.fillStyle = "white";
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    // ctx.beginPath();
    // ctx.rect(-this.width / 2, -this.height / 2, this.width, this.height);
    // ctx.stroke();
    // ctx.fill();

    // ctx.beginPath();
    // ctx.rect(-this.width / 2, -this.height / 2, this.width, this.height);
    // ctx.closePath();
    // ctx.fillStyle = "white";

    // ctx.stroke();
    // ctx.fill();
  }
}

class FabricEngine extends Engine {
  constructor() {
    super();
    const canvas = document.createElement("canvas");
    this.content.appendChild(canvas);
    this.fabricCanvas = new fabric.StaticCanvas(canvas, {
      width: this.width,
      height: this.height,
      enableRetinaScaling: true,
      renderOnAddRemove: false,
    });
    window.canvas = this.fabricCanvas;
  }

  animate = () => {
    const rects = this.rects;
    for (let i = 0; i < this.count.value; i++) {
      const r = rects[i];
      r.x -= r.speed;
      r.el.left = r.x;
      delete r.el.m;
      if (r.x + r.size < 0) {
        r.x = this.width + r.size;
      }
    }
    this.fabricCanvas.requestRenderAll();
    this.meter.tick();

    this.request = requestAnimationFrame(this.animate);
  };

  render() {
    // clear the canvas
    this.fabricCanvas.clear();
    this.cancelAnimationFrame(this.request);

    // rectangle creation
    const rects = new Array(this.count);
    for (let i = 0; i < this.count.value; i++) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      const size = 10 + Math.random() * 40;
      const speed = 1 + Math.random();

      const fRect = new OptimizedRect({
        width: size,
        height: size,
        fill: "white",
        stroke: "black",
        left: x,
        top: y,
        objectCaching: false,
        originX: "center",
        originY: "center",
      });
      rects[i] = { x, y, size: size / 2, speed, el: fRect };
    }
    this.rects = rects;
    this.fabricCanvas.add(...rects.map((rect) => rect.el));

    this.request = requestAnimationFrame(this.animate);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const engine = new FabricEngine();
  engine.render();
});
