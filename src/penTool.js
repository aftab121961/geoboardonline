/**
 * penTool.js - Freehand Pen Drawing & Annotation Tool for Virtual Geoboard
 */

export class PenTool {
  constructor(geoboardEngine) {
    this.engine = geoboardEngine;
    this.active = false;
    this.strokes = []; // Array of saved strokes: { id, points, color, width }
    this.currentStroke = null;
  }

  toggleActive() {
    this.active = !this.active;
    if (!this.active) {
      this.currentStroke = null;
    }
    return this.active;
  }

  startStroke(x, y, colorHex = '#ef4444', width = 3) {
    this.currentStroke = {
      id: 'pen_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      points: [{ x, y }],
      color: colorHex,
      width: width
    };
  }

  addPoint(x, y) {
    if (!this.currentStroke) return;
    const pts = this.currentStroke.points;
    const last = pts[pts.length - 1];

    // Minimum distance threshold to avoid redundant points
    if (Math.hypot(x - last.x, y - last.y) > 2) {
      pts.push({ x, y });
    }
  }

  endStroke() {
    if (this.currentStroke && this.currentStroke.points.length > 1) {
      this.strokes.push(this.currentStroke);
      this.currentStroke = null;
      return true; // Successfully added stroke
    }
    this.currentStroke = null;
    return false;
  }

  undo() {
    if (this.strokes.length > 0) {
      this.strokes.pop();
      return true;
    }
    return false;
  }

  clear() {
    this.strokes = [];
    this.currentStroke = null;
  }

  render(ctx) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. Render all saved strokes
    for (const stroke of this.strokes) {
      this.drawStroke(ctx, stroke);
    }

    // 2. Render active stroke in progress
    if (this.currentStroke && this.currentStroke.points.length > 0) {
      this.drawStroke(ctx, this.currentStroke);
    }

    ctx.restore();
  }

  drawStroke(ctx, stroke) {
    const pts = stroke.points;
    if (pts.length < 1) return;

    ctx.beginPath();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.shadowColor = stroke.color;
    ctx.shadowBlur = 4;

    if (pts.length === 1) {
      ctx.arc(pts[0].x, pts[0].y, stroke.width / 2, 0, Math.PI * 2);
      ctx.fillStyle = stroke.color;
      ctx.fill();
      return;
    }

    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();
  }
}
