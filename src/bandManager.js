/**
 * bandManager.js - Rubber Band State, Dragging & Polygon Creation
 */

import { MathEngine } from './mathEngine.js';

export const BAND_COLORS = [
  { id: 'red', name: 'Crimson Red', stroke: '#ef4444', fill: 'rgba(239, 68, 68, 0.35)', glow: 'rgba(239, 68, 68, 0.6)' },
  { id: 'blue', name: 'Electric Blue', stroke: '#3b82f6', fill: 'rgba(59, 130, 246, 0.35)', glow: 'rgba(59, 130, 246, 0.6)' },
  { id: 'green', name: 'Emerald Green', stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.35)', glow: 'rgba(16, 185, 129, 0.6)' },
  { id: 'orange', name: 'Amber Gold', stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.35)', glow: 'rgba(245, 158, 11, 0.6)' },
  { id: 'purple', name: 'Violet Purple', stroke: '#8b5cf6', fill: 'rgba(139, 92, 246, 0.35)', glow: 'rgba(139, 92, 246, 0.6)' },
  { id: 'pink', name: 'Bright Pink', stroke: '#ec4899', fill: 'rgba(236, 72, 153, 0.35)', glow: 'rgba(236, 72, 153, 0.6)' }
];

export class BandManager {
  constructor(geoboardEngine) {
    this.engine = geoboardEngine;
    this.selectedColor = BAND_COLORS[0];
    
    this.shapes = []; // Array of saved closed polygons
    this.activePoints = []; // Pegs being clicked in current loop creation
    this.activeMousePos = null; // Live mouse position for dynamic elastic preview

    this.selectedShapeId = null;
    this.draggingVertexInfo = null; // { shapeId, vertexIndex }

    // Undo / Redo stacks
    this.history = [];
    this.historyIndex = -1;

    this.saveState();
  }

  setColor(colorId) {
    const found = BAND_COLORS.find(c => c.id === colorId);
    if (found) this.selectedColor = found;
  }

  // --- UNDO / REDO ---
  saveState() {
    // Truncate future redos
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    // Deep clone shapes state
    const snapshot = JSON.parse(JSON.stringify(this.shapes));
    this.history.push(snapshot);
    this.historyIndex = this.history.length - 1;
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.shapes = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
      this.selectedShapeId = null;
      return true;
    }
    return false;
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.shapes = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
      this.selectedShapeId = null;
      return true;
    }
    return false;
  }

  clearBoard() {
    if (this.shapes.length > 0 || this.activePoints.length > 0) {
      this.shapes = [];
      this.activePoints = [];
      this.selectedShapeId = null;
      this.saveState();
    }
  }

  // --- CREATION FLOW ---
  handlePegClick(peg) {
    if (!peg) return;

    if (this.activePoints.length === 0) {
      // Start a new shape band
      this.activePoints.push(peg);
    } else {
      const firstPeg = this.activePoints[0];
      const lastPeg = this.activePoints[this.activePoints.length - 1];

      // If clicked starting peg and we have at least 3 vertices -> CLOSE LOOP!
      if (peg.id === firstPeg.id && this.activePoints.length >= 3) {
        this.closeActiveLoop();
        return;
      }

      // Avoid consecutive duplicate clicks on same peg
      if (peg.id !== lastPeg.id) {
        this.activePoints.push(peg);
      }
    }
  }

  closeActiveLoop() {
    if (this.activePoints.length < 3) return;

    const isIso = this.engine.gridType === 'isometric';
    const gridPoints = this.activePoints.map(p => ({ x: p.gridX, y: p.gridY }));
    const analysis = MathEngine.analyzePolygon(gridPoints, isIso, true);

    const newShape = {
      id: 'shape_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      color: { ...this.selectedColor },
      pegs: [...this.activePoints],
      isClosed: true,
      analysis
    };

    this.shapes.push(newShape);
    this.selectedShapeId = newShape.id;
    this.activePoints = [];
    this.activeMousePos = null;

    this.saveState();
  }

  finishActiveLine() {
    if (this.activePoints.length < 2) return;

    // Check if the user clicked starting peg to close loop
    const first = this.activePoints[0];
    const last = this.activePoints[this.activePoints.length - 1];
    const isClosed = (this.activePoints.length >= 3 && first.id === last.id);

    if (isClosed) {
      this.activePoints.pop(); // Remove duplicate starting peg
      this.closeActiveLoop();
      return;
    }

    const isIso = this.engine.gridType === 'isometric';
    const gridPoints = this.activePoints.map(p => ({ x: p.gridX, y: p.gridY }));
    const analysis = MathEngine.analyzePolygon(gridPoints, isIso, false);

    const newShape = {
      id: 'shape_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      color: { ...this.selectedColor },
      pegs: [...this.activePoints],
      isClosed: false,
      isCircle: false,
      analysis
    };

    this.shapes.push(newShape);
    this.selectedShapeId = newShape.id;
    this.activePoints = [];
    this.activeMousePos = null;

    this.saveState();
  }

  finishCircle(centerPeg, radiusPeg) {
    if (!centerPeg || !radiusPeg || centerPeg.id === radiusPeg.id) return;

    const analysis = MathEngine.analyzeCircle(centerPeg, radiusPeg);

    const newShape = {
      id: 'circle_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      color: { ...this.selectedColor },
      pegs: [centerPeg, radiusPeg], // [0] = Center, [1] = Radius peg
      isClosed: true,
      isCircle: true,
      analysis
    };

    this.shapes.push(newShape);
    this.selectedShapeId = newShape.id;
    this.activePoints = [];
    this.activeMousePos = null;

    this.saveState();
  }

  cancelActiveLoop() {
    this.activePoints = [];
    this.activeMousePos = null;
  }

  // --- SELECTION & DRAGGING ---
  getSelectedShape() {
    return this.shapes.find(s => s.id === this.selectedShapeId) || null;
  }

  selectShapeAt(px, py) {
    // Check if clicked near any shape's vertex or inside polygon/circle
    for (let i = this.shapes.length - 1; i >= 0; i--) {
      const shape = this.shapes[i];
      // Check vertex proximity
      for (const peg of shape.pegs) {
        if (Math.hypot(peg.x - px, peg.y - py) < 20) {
          this.selectedShapeId = shape.id;
          return shape;
        }
      }
      if (shape.isCircle) {
        const center = shape.pegs[0];
        const radPeg = shape.pegs[1];
        const rPx = Math.hypot(radPeg.x - center.x, radPeg.y - center.y);
        const distFromCenter = Math.hypot(px - center.x, py - center.y);
        if (distFromCenter <= rPx + 10) {
          this.selectedShapeId = shape.id;
          return shape;
        }
      } else {
        // Check inside polygon or on boundary line
        const points = shape.pegs.map(p => ({ x: p.x, y: p.y }));
        if (shape.isClosed && MathEngine.isPointInsidePolygon(px, py, points)) {
          this.selectedShapeId = shape.id;
          return shape;
        }
        if (MathEngine.isPointOnBoundary(px, py, points, 15)) {
          this.selectedShapeId = shape.id;
          return shape;
        }
      }
    }
    this.selectedShapeId = null;
    return null;
  }

  startDraggingVertex(shapeId, vertexIndex) {
    this.draggingVertexInfo = { shapeId, vertexIndex };
  }

  updateDraggedVertex(targetPeg) {
    if (!this.draggingVertexInfo || !targetPeg) return;

    const shape = this.shapes.find(s => s.id === this.draggingVertexInfo.shapeId);
    if (!shape) return;

    shape.pegs[this.draggingVertexInfo.vertexIndex] = targetPeg;

    // Recalculate geometry
    if (shape.isCircle) {
      shape.analysis = MathEngine.analyzeCircle(shape.pegs[0], shape.pegs[1]);
    } else {
      const isIso = this.engine.gridType === 'isometric';
      const gridPoints = shape.pegs.map(p => ({ x: p.gridX, y: p.gridY }));
      shape.analysis = MathEngine.analyzePolygon(gridPoints, isIso, shape.isClosed);
    }
  }

  stopDraggingVertex() {
    if (this.draggingVertexInfo) {
      this.draggingVertexInfo = null;
      this.saveState();
    }
  }

  deleteSelectedShape() {
    if (this.selectedShapeId) {
      this.shapes = this.shapes.filter(s => s.id !== this.selectedShapeId);
      this.selectedShapeId = null;
      this.saveState();
    }
  }

  /**
   * Render all closed polygons & open line segments, plus active rubber band preview
   */
  renderBands(ctx) {
    // 1. Render all saved shapes (polygons, lines, circles)
    for (const shape of this.shapes) {
      this.renderShape(ctx, shape, shape.id === this.selectedShapeId);
    }

    // 2. Render active rubber band preview being created
    if (this.activePoints.length > 0) {
      this.renderActiveBandPreview(ctx);
    }
  }

  /**
   * Draw a shape (Closed Polygon, Open Line Segment, or Circle)
   */
  renderShape(ctx, shape, isSelected) {
    const pegs = shape.pegs;
    if (pegs.length < 2) return;

    ctx.save();

    if (shape.isCircle) {
      const center = pegs[0];
      const radiusPeg = pegs[1];
      const radiusPx = Math.hypot(radiusPeg.x - center.x, radiusPeg.y - center.y);

      ctx.beginPath();
      ctx.arc(center.x, center.y, radiusPx, 0, Math.PI * 2);
      ctx.fillStyle = shape.color.fill;
      ctx.fill();

      ctx.strokeStyle = shape.color.stroke;
      ctx.lineWidth = isSelected ? 4 : 3;
      ctx.shadowColor = shape.color.glow;
      ctx.shadowBlur = isSelected ? 12 : 6;
      ctx.stroke();

      // Radius line indicator
      ctx.beginPath();
      ctx.moveTo(center.x, center.y);
      ctx.lineTo(radiusPeg.x, radiusPeg.y);
      ctx.strokeStyle = shape.color.stroke;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();

      // Center dot & Radius handle
      ctx.setLineDash([]);
      [center, radiusPeg].forEach((p, idx) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, isSelected ? 7 : 5, 0, Math.PI * 2);
        ctx.fillStyle = idx === 0 ? '#38bdf8' : '#ffffff';
        ctx.fill();
        ctx.strokeStyle = shape.color.stroke;
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      ctx.restore();
      return;
    }

    ctx.beginPath();
    ctx.moveTo(pegs[0].x, pegs[0].y);
    for (let i = 1; i < pegs.length; i++) {
      ctx.lineTo(pegs[i].x, pegs[i].y);
    }

    if (shape.isClosed) {
      ctx.closePath();
      ctx.fillStyle = shape.color.fill;
      ctx.fill();
    }

    // Polygon / Line Outer Stroke
    ctx.strokeStyle = shape.color.stroke;
    ctx.lineWidth = isSelected ? 4 : 3;
    ctx.shadowColor = shape.color.glow;
    ctx.shadowBlur = isSelected ? 12 : 6;
    ctx.stroke();

    // Draw vertex handle indicators
    for (let i = 0; i < pegs.length; i++) {
      const peg = pegs[i];
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, isSelected ? 7 : 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 4;
      ctx.fill();
      ctx.strokeStyle = shape.color.stroke;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Draw elastic rubber band preview while clicking pegs
   */
  renderActiveBandPreview(ctx, isCircleMode = false) {
    const points = this.activePoints;
    const color = this.selectedColor;

    if (points.length === 0) return;

    ctx.save();

    if (isCircleMode && points.length === 1) {
      const center = points[0];
      const target = (this.activeMousePos && this.engine.getNearestPeg(this.activeMousePos.x, this.activeMousePos.y)) || this.activeMousePos;

      if (target) {
        const radiusPx = Math.hypot(target.x - center.x, target.y - center.y);
        ctx.beginPath();
        ctx.arc(center.x, center.y, radiusPx, 0, Math.PI * 2);
        ctx.strokeStyle = color.stroke;
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.shadowColor = color.glow;
        ctx.shadowBlur = 8;
        ctx.stroke();

        // Radius guide line
        ctx.beginPath();
        ctx.moveTo(center.x, center.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(center.x, center.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.strokeStyle = color.stroke;
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();

      ctx.restore();
      return;
    }

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }

    // Connect to current live mouse pointer or nearest peg preview
    if (this.activeMousePos) {
      const target = this.engine.getNearestPeg(this.activeMousePos.x, this.activeMousePos.y) || this.activeMousePos;
      ctx.lineTo(target.x, target.y);
    }

    ctx.strokeStyle = color.stroke;
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]); // Dashed active elastic band line
    ctx.shadowColor = color.glow;
    ctx.shadowBlur = 8;
    ctx.stroke();

    // Highlight active vertices
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, i === 0 ? 8 : 6, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? '#38bdf8' : '#ffffff'; // Highlight start peg cyan
      ctx.strokeStyle = color.stroke;
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }
}
