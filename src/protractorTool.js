/**
 * protractorTool.js - Interactive Angle Arc Overlay & Draggable Virtual Protractor Widget
 */

import { MathEngine } from './mathEngine.js';

export class ProtractorTool {
  constructor(geoboardEngine) {
    this.engine = geoboardEngine;
    this.active = false;
    
    // Angle Measurement selection points [A, B, C]
    this.selectedAnglePegs = [];
    this.measuredAngles = []; // List of saved angle measurements: { A, B, C, deg, labelPos }

    // Virtual Protractor Widget State
    this.showVirtualProtractor = false;
    this.protractorPos = { x: 300, y: 300 };
    this.protractorRadius = 130;
    this.protractorRotation = 0; // In radians
    this.isDraggingProtractor = false;
    this.isRotatingProtractor = false;
    this.dragOffset = { x: 0, y: 0 };
  }

  toggleActive() {
    this.active = !this.active;
    if (!this.active) {
      this.selectedAnglePegs = [];
    }
    return this.active;
  }

  toggleVirtualProtractor() {
    this.showVirtualProtractor = !this.showVirtualProtractor;
    if (this.showVirtualProtractor) {
      // Center protractor on canvas
      this.protractorPos = {
        x: this.engine.width / 2,
        y: this.engine.height / 2
      };
    }
    return this.showVirtualProtractor;
  }

  handlePegClick(peg) {
    if (!this.active || !peg) return;

    // Avoid duplicate consecutive clicks
    const last = this.selectedAnglePegs[this.selectedAnglePegs.length - 1];
    if (last && last.id === peg.id) return;

    this.selectedAnglePegs.push(peg);

    if (this.selectedAnglePegs.length === 3) {
      const [A, B, C] = this.selectedAnglePegs;
      const deg = MathEngine.calculateAngleBetweenThreePoints(
        { x: A.gridX, y: A.gridY },
        { x: B.gridX, y: B.gridY },
        { x: C.gridX, y: C.gridY }
      );

      this.measuredAngles.push({
        id: 'ang_' + Date.now(),
        A, B, C,
        deg: parseFloat(deg.toFixed(1))
      });

      this.selectedAnglePegs = [];
    }
  }

  clearMeasuredAngles() {
    this.measuredAngles = [];
    this.selectedAnglePegs = [];
  }

  undo() {
    if (this.measuredAngles.length > 0) {
      this.measuredAngles.pop();
      return true;
    }
    return false;
  }

  /**
   * Handle mouse down / drag for the virtual protractor overlay
   */
  handleMouseDown(px, py) {
    if (!this.showVirtualProtractor) return false;

    const dx = px - this.protractorPos.x;
    const dy = py - this.protractorPos.y;
    const dist = Math.hypot(dx, dy);

    // Check if clicking rotation handle (outer ring)
    if (Math.abs(dist - this.protractorRadius) < 20) {
      this.isRotatingProtractor = true;
      return true;
    }

    // Check if clicking center drag area
    if (dist < this.protractorRadius) {
      this.isDraggingProtractor = true;
      this.dragOffset = { x: dx, y: dy };
      return true;
    }

    return false;
  }

  handleMouseMove(px, py) {
    if (this.isDraggingProtractor) {
      this.protractorPos.x = px - this.dragOffset.x;
      this.protractorPos.y = py - this.dragOffset.y;
      return true;
    }

    if (this.isRotatingProtractor) {
      const dx = px - this.protractorPos.x;
      const dy = py - this.protractorPos.y;
      this.protractorRotation = Math.atan2(dy, dx);
      return true;
    }

    return false;
  }

  handleMouseUp() {
    this.isDraggingProtractor = false;
    this.isRotatingProtractor = false;
  }

  /**
   * Main rendering method for angle arcs & virtual protractor overlay
   */
  render(ctx) {
    // 1. Render active 3-point angle selection preview
    if (this.selectedAnglePegs.length > 0) {
      this.renderAngleSelectionPreview(ctx);
    }

    // 2. Render all saved measured angle arcs & floating degree pills
    for (const angleObj of this.measuredAngles) {
      this.renderAngleArc(ctx, angleObj.A, angleObj.B, angleObj.C, angleObj.deg);
    }

    // 3. Render Virtual Protractor Tool Widget (if toggled)
    if (this.showVirtualProtractor) {
      this.renderVirtualProtractorWidget(ctx);
    }
  }

  renderAngleSelectionPreview(ctx) {
    const pegs = this.selectedAnglePegs;
    ctx.save();
    ctx.strokeStyle = '#f43f5e'; // Rose Pink
    ctx.lineWidth = 3;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.moveTo(pegs[0].x, pegs[0].y);
    for (let i = 1; i < pegs.length; i++) {
      ctx.lineTo(pegs[i].x, pegs[i].y);
    }
    ctx.stroke();

    for (let i = 0; i < pegs.length; i++) {
      ctx.beginPath();
      ctx.arc(pegs[i].x, pegs[i].y, 8, 0, Math.PI * 2);
      ctx.fillStyle = i === 1 ? '#f43f5e' : '#fb7185';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Draw an angle arc between vectors BA and BC with degree label badge
   */
  renderAngleArc(ctx, A, B, C, deg) {
    ctx.save();

    const startAngle = Math.atan2(A.y - B.y, A.x - B.x);
    const endAngle = Math.atan2(C.y - B.y, C.x - B.x);

    let diff = endAngle - startAngle;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    while (diff > Math.PI) diff -= 2 * Math.PI;

    const isClockwise = diff < 0;
    const arcRadius = 38;

    // Draw Arc Sector
    ctx.beginPath();
    ctx.moveTo(B.x, B.y);
    ctx.arc(B.x, B.y, arcRadius, startAngle, endAngle, isClockwise);
    ctx.closePath();

    ctx.fillStyle = 'rgba(244, 63, 94, 0.25)'; // Semi-transparent rose fill
    ctx.fill();
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Calculate mid-angle position for Floating Degree Pill Badge
    const midAngle = startAngle + diff / 2;
    const labelRadius = arcRadius + 24;
    const labelX = B.x + Math.cos(midAngle) * labelRadius;
    const labelY = B.y + Math.sin(midAngle) * labelRadius;

    // Badge Background Pill
    const labelText = `${deg}°`;
    ctx.font = 'bold 12px Inter, sans-serif';
    const textWidth = ctx.measureText(labelText).width;
    const padX = 8, padY = 4;

    ctx.beginPath();
    ctx.roundRect(
      labelX - textWidth / 2 - padX,
      labelY - 10 - padY,
      textWidth + 2 * padX,
      20 + padY,
      12
    );
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Badge Text
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, labelX, labelY);

    ctx.restore();
  }

  /**
   * Draw Draggable & Rotatable Virtual Protractor Widget
   */
  renderVirtualProtractorWidget(ctx) {
    const { x, y } = this.protractorPos;
    const R = this.protractorRadius;
    const rot = this.protractorRotation;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);

    // Semi-transparent protractor body
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI, true); // Semi-circle protractor
    ctx.lineTo(R, 0);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)'; // Dark glass style
    ctx.fill();
    ctx.strokeStyle = '#38bdf8'; // Sky blue border
    ctx.lineWidth = 2;
    ctx.stroke();

    // Center crosshair hole
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.stroke();

    // Draw degree tick marks & labels from 0 to 180 degrees
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#94a3b8';
    ctx.font = '9px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let deg = 0; deg <= 180; deg += 5) {
      const rad = -(deg * Math.PI / 180);
      const isMajor = deg % 10 === 0;
      const isHeader = deg % 30 === 0;
      const tickLen = isHeader ? 14 : (isMajor ? 10 : 6);

      const x1 = Math.cos(rad) * R;
      const y1 = Math.sin(rad) * R;
      const x2 = Math.cos(rad) * (R - tickLen);
      const y2 = Math.sin(rad) * (R - tickLen);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = isMajor ? 1.5 : 1;
      ctx.stroke();

      if (isHeader) {
        const tx = Math.cos(rad) * (R - 24);
        const ty = Math.sin(rad) * (R - 24);
        ctx.fillText(deg.toString(), tx, ty);
      }
    }

    // Outer Rotation Handle Ring
    ctx.beginPath();
    ctx.arc(0, 0, R + 4, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.setLineDash([4, 4]);
    ctx.stroke();

    ctx.restore();
  }
}
