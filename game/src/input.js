// Aurora Harvest — keyboard + mouse input. Tracks held keys, edge-triggered
// presses (consumed once per frame) and the pointer's game-space x. The
// pointer steers the keeper directly; the keys steer it with acceleration.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();
    this.mouseX = null;
    this.mouseActive = false;
    this.clicked = false;
    this._onKeyDown = (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (!e.repeat) this.pressed.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
      this.keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    };
    this._onKeyUp = (e) => {
      this.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    };
    this._onMove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 1280;
      this.mouseX = x;
      this.mouseActive = true;
    };
    this._onDown = (e) => {
      this._onMove(e);
      this.clicked = true;
    };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    canvas.addEventListener('pointermove', this._onMove);
    canvas.addEventListener('pointerdown', this._onDown);
  }

  held(...names) {
    return names.some((n) => this.keys.has(n));
  }

  wasPressed(...names) {
    return names.some((n) => this.pressed.has(n));
  }

  consumeClick() {
    const c = this.clicked;
    this.clicked = false;
    return c;
  }

  // Call once per frame after the game has read the edges.
  endFrame() {
    this.pressed.clear();
  }
}
