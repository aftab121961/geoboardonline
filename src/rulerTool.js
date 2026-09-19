/**
 * rulerTool.js - Interactive Ruler Measurement Tool & Draggable Virtual Classroom Ruler
 */

export class RulerTool {
  constructor(geoboardEngine) {
    this.engine = geoboardEngine;
    this.active = false;
    
    this.startPeg = null;
    this.endPeg = null;
    this.currentMousePos = null;
    this.savedMeasurements = []; // List of fixed ruler measurements: { p1, p2, dist }

    // Virtual Ruler Widget State
    this.showVirtualRuler = false;
    this.rulerPos = { x: 250, y: 150 };
    this.rulerLength = 260; // In pixels
    this.rulerHeight = 44;
    this.rulerRotation = 0; // In radians
    this.isDraggingRuler = false;
    this.isRotatingRuler = false;
    this.dragOffset = { x: 0, y: 0 };
  }

  toggleActive() {
    this.active = !this.active;
    if (!this.active) {
      this.startPeg = null;
      this.endPeg = null;
    }
    return this.active;
  }

  toggleVirtualRuler() {
    this.showVirtualRuler = !this.showVirtualRuler;
    if (this.showVirtualRuler) {
      this.rulerPos = {
        x: this.engine.width / 2 - 130,
        y: this.engine.height / 2 - 22
      };
    }
    return this.showVirtualRuler;
  }

  handlePegClick(peg) {
    if (!this.active || !peg) return;

    if (!this.startPeg) {
      this.startPeg = peg;
    } else {
      if (this.startPeg.id !== peg.id) {
        this.endPeg = peg;
        const gridDist = Math.hypot(
          this.endPeg.gridX - this.startPeg.gridX,
          this.endPeg.gridY - this.startPeg.gridY
        );

        this.savedMeasurements.push({
          id: 'rul_' + Date.now(),
          p1: this.startPeg,
          p2: this.endPeg,
          dist: parseFloat(gridDist.toFixed(2))
        });
      }
      this.startPeg = null;
      this.endPeg = null;
    }
  }

  clearMeasurements() {
    this.savedMeasurements = [];
    this.startPeg = null;
    this.endPeg = null;
  }

  // --- VIRTUAL RULER INTERACTION ---
  handleMouseDown(px, py) {
    if (!this.showVirtualRuler) return false;

    // Transform click coords into ruler local rotated space
    const rx = px - (this.rulerPos.x + this.rulerLength / 2);
    const ry = py - (this.rulerPos.y + this.rulerHeight / 2);

    const cos = Math.cos(-this.rulerRotation);
    const sin = Math.sin(-this.rulerRotation);
    const localX = rx * cos - ry * sin;
    const localY = rx * sin + ry * cos;

    const halfW = this.rulerLength / 2;
    const halfH = this.rulerHeight / 2;

    // Check rotation handle on right edge
    if (Math.abs(localX - halfW) < 15 && Math.abs(localY) < halfH) {
      this.isRotatingRuler = true;
      return true;
    }

    // Check main body drag area
    if (Math.abs(localX) <= halfW && Math.abs(localY) <= halfH) {
      this.isDraggingRuler = true;
      this.dragOffset = { x: px - this.rulerPos.x, y: py - this.rulerPos.y };
      return true;
    }

    return false;
  }

  handleMouseMove(px, py) {
    if (this.isDraggingRuler) {
      this.rulerPos.x = px - this.dragOffset.x;
      this.rulerPos.y = py - this.dragOffset.y;
      return true;
    }

    if (this.isRotatingRuler) {
      const centerX = this.rulerPos.x + this.rulerLength / 2;
      const centerY = this.rulerPos.y + this.rulerHeight / 2;
      this.rulerRotation = Math.atan2(py - centerY, px - centerX);
      return true;
    }

    if (this.active && this.startPeg) {
      this.currentMousePos = { x: px, y: py };
    }

    return false;
  }

  handleMouseUp() {
    this.isDraggingRuler = false;
    this.isRotatingRuler = false;
  }

  /**
   * Main render loop for ruler measurements & virtual ruler widget
   */
  render(ctx) {
    // 1. Render active ruler measurement preview
    if (this.active && this.startPeg) {
      const target = (this.currentMousePos && this.engine.getNearestPeg(this.currentMousePos.x, this.currentMousePos.y)) || this.currentMousePos;
      if (target) {
        this.renderRulerLine(ctx, this.startPeg, target, true);
      }
    }

    // 2. Render all saved fixed measurements
    for (const item of this.savedMeasurements) {
      this.renderRulerLine(ctx, item.p1, item.p2, false, item.dist);
    }

    // 3. Render Virtual Draggable Ruler Widget
    if (this.showVirtualRuler) {
      this.renderVirtualRulerWidget(ctx);
    }
  }

  /**
   * Render a visual ruler line segment with ticks & distance label pill
   */
  renderRulerLine(ctx, p1, p2, isPreview = false, explicitDist = null) {
    ctx.save();

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const pixelLen = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    const gridDist = explicitDist !== null ? explicitDist : parseFloat((pixelLen / (this.engine.width / 5)).toFixed(2));

    // Draw main measurement line
    ctx.strokeStyle = isPreview ? '#eab308' : '#eab308'; // Amber Gold
    ctx.lineWidth = 3;
    if (isPreview) ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    // Draw perpendicular cap ticks at endpoints
    const capLen = 10;
    ctx.setLineDash([]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p1.x - Math.sin(angle) * capLen, p1.y + Math.cos(angle) * capLen);
    ctx.lineTo(p1.x + Math.sin(angle) * capLen, p1.y - Math.cos(angle) * capLen);

    ctx.moveTo(p2.x - Math.sin(angle) * capLen, p2.y + Math.cos(angle) * capLen);
    ctx.lineTo(p2.x + Math.sin(angle) * capLen, p2.y - Math.cos(angle) * capLen);
    ctx.stroke();

    // Draw Floating Distance Pill Badge
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    const labelText = `L = ${gridDist} units`;
    ctx.font = 'bold 12px Inter, sans-serif';
    const textWidth = ctx.measureText(labelText).width;
    const padX = 8, padY = 4;

    ctx.beginPath();
    ctx.roundRect(
      midX - textWidth / 2 - padX,
      midY - 12 - padY - 10,
      textWidth + 2 * padX,
      20 + padY,
      10
    );
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, midX, midY - 10);

    ctx.restore();
  }

  /**
   * Render Draggable & Rotatable Virtual Classroom Ruler Widget
   */
  renderVirtualRulerWidget(ctx) {
    const { x, y } = this.rulerPos;
    const W = this.rulerLength;
    const H = this.rulerHeight;
    const rot = this.rulerRotation;

    ctx.save();
    ctx.translate(x + W / 2, y + H / 2);
    ctx.rotate(rot);
    ctx.translate(-W / 2, -H / 2);

    // Ruler Body Glassmorphism
    ctx.beginPath();
    ctx.roundRect(0, 0, W, H, 8);
    ctx.fillStyle = 'rgba(245, 158, 11, 0.25)'; // Amber glass
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Ruler Tick Marks (Units & Sub-ticks)
    ctx.fillStyle = '#fef08a';
    ctx.strokeStyle = '#fcd34d';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';

    const numUnits = 10;
    const step = W / numUnits;

    for (let i = 0; i <= numUnits; i++) {
      const tx = i * step;
      // Unit Tick
      ctx.beginPath();
      ctx.moveTo(tx, 0);
      ctx.lineTo(tx, 14);
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillText(i.toString(), tx, 26);

      // Sub-ticks
      if (i < numUnits) {
        ctx.beginPath();
        ctx.moveTo(tx + step / 2, 0);
        ctx.lineTo(tx + step / 2, 9);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Rotation handle icon on right edge
    ctx.beginPath();
    ctx.arc(W - 8, H / 2, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();

    ctx.restore();
  }
}
