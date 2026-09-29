/**
 * app.js - Main Controller for Virtual Geoboard
 * Supports dense isometric grid, freehand Pen tool, floating bottom color palette,
 * leftmost toolbox, white theme toggle, and unified undo history.
 */

import { GeoboardEngine } from './geoboardEngine.js';
import { BandManager, BAND_COLORS } from './bandManager.js';
import { ProtractorTool } from './protractorTool.js';
import { RulerTool } from './rulerTool.js';
import { PenTool } from './penTool.js';

class App {
  constructor() {
    this.canvas = document.getElementById('geoboardCanvas');
    this.engine = new GeoboardEngine(this.canvas, { gridType: 'square15', theme: 'dark', showGridLines: true });
    this.bandManager = new BandManager(this.engine);
    this.protractorTool = new ProtractorTool(this.engine);
    this.rulerTool = new RulerTool(this.engine);
    this.penTool = new PenTool(this.engine);

    this.activeMode = 'draw'; // 'draw', 'circle', 'pen', 'protractor', 'ruler'
    this.hoveredPeg = null;
    this.dragStartPeg = null;
    this.isDrawingPen = false;

    // Unified Action History Stack for Undo
    this.actionHistory = [];

    this.initUI();
    this.bindEvents();
    this.startRenderLoop();
  }

  initUI() {
    // Populate Color Palette
    const paletteContainer = document.getElementById('colorPalette');
    if (paletteContainer) {
      paletteContainer.innerHTML = '';
      BAND_COLORS.forEach(c => {
        const btn = document.createElement('button');
        btn.className = `color-btn w-7 h-7 rounded-full border-2 transition-transform hover:scale-115 focus:outline-none ${c.id === 'red' ? 'ring-2 ring-white scale-110' : 'border-transparent'}`;
        btn.style.backgroundColor = c.stroke;
        btn.title = c.name;
        btn.dataset.colorId = c.id;
        btn.addEventListener('click', () => {
          document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('ring-2', 'ring-white', 'scale-110'));
          btn.classList.add('ring-2', 'ring-white', 'scale-110');
          this.bandManager.setColor(c.id);
        });
        paletteContainer.appendChild(btn);
      });
    }
  }

  bindEvents() {
    // Mode Icon Buttons
    const btnDraw = document.getElementById('modeDraw');
    const btnCircle = document.getElementById('modeCircle');
    const btnPen = document.getElementById('modePen');
    const btnProtractor = document.getElementById('modeProtractor');
    const btnRuler = document.getElementById('modeRuler');
    const btnVirtualProtractor = document.getElementById('btnVirtualProtractor');
    const btnVirtualRuler = document.getElementById('btnVirtualRuler');

    const updateModeUI = () => {
      [btnDraw, btnCircle, btnPen, btnProtractor, btnRuler].forEach(btn => btn?.classList.remove('active-mode'));
      if (this.activeMode === 'draw') btnDraw?.classList.add('active-mode');
      if (this.activeMode === 'circle') btnCircle?.classList.add('active-mode');
      if (this.activeMode === 'pen') btnPen?.classList.add('active-mode');
      if (this.activeMode === 'protractor') btnProtractor?.classList.add('active-mode');
      if (this.activeMode === 'ruler') btnRuler?.classList.add('active-mode');
    };

    btnDraw?.addEventListener('click', () => {
      this.activeMode = 'draw';
      this.bandManager.cancelActiveLoop();
      if (this.protractorTool.active) this.protractorTool.toggleActive();
      if (this.rulerTool.active) this.rulerTool.toggleActive();
      if (this.penTool.active) this.penTool.toggleActive();
      updateModeUI();
    });

    btnCircle?.addEventListener('click', () => {
      this.activeMode = 'circle';
      this.bandManager.cancelActiveLoop();
      if (this.protractorTool.active) this.protractorTool.toggleActive();
      if (this.rulerTool.active) this.rulerTool.toggleActive();
      if (this.penTool.active) this.penTool.toggleActive();
      updateModeUI();
    });

    btnPen?.addEventListener('click', () => {
      this.activeMode = 'pen';
      this.bandManager.cancelActiveLoop();
      if (this.protractorTool.active) this.protractorTool.toggleActive();
      if (this.rulerTool.active) this.rulerTool.toggleActive();
      if (!this.penTool.active) this.penTool.toggleActive();
      updateModeUI();
    });

    btnProtractor?.addEventListener('click', () => {
      this.activeMode = 'protractor';
      this.bandManager.cancelActiveLoop();
      if (!this.protractorTool.active) this.protractorTool.toggleActive();
      if (this.rulerTool.active) this.rulerTool.toggleActive();
      if (this.penTool.active) this.penTool.toggleActive();
      updateModeUI();
    });

    btnRuler?.addEventListener('click', () => {
      this.activeMode = 'ruler';
      this.bandManager.cancelActiveLoop();
      if (this.protractorTool.active) this.protractorTool.toggleActive();
      if (!this.rulerTool.active) this.rulerTool.toggleActive();
      if (this.penTool.active) this.penTool.toggleActive();
      updateModeUI();
    });

    btnVirtualProtractor?.addEventListener('click', () => {
      const active = this.protractorTool.toggleVirtualProtractor();
      btnVirtualProtractor.classList.toggle('bg-sky-600', active);
      btnVirtualProtractor.classList.toggle('text-white', active);
    });

    btnVirtualRuler?.addEventListener('click', () => {
      const active = this.rulerTool.toggleVirtualRuler();
      btnVirtualRuler.classList.toggle('bg-amber-600', active);
      btnVirtualRuler.classList.toggle('text-white', active);
    });

    // White / Dark Theme Toggle
    const btnThemeToggle = document.getElementById('btnThemeToggle');
    const themeToggleText = document.getElementById('themeToggleText');
    btnThemeToggle?.addEventListener('click', () => {
      const htmlEl = document.documentElement;
      const isCurrentlyDark = htmlEl.classList.contains('dark');
      if (isCurrentlyDark) {
        htmlEl.classList.remove('dark');
        htmlEl.classList.add('light');
        this.engine.setTheme('light');
        if (themeToggleText) themeToggleText.textContent = 'Dark Theme';
      } else {
        htmlEl.classList.remove('light');
        htmlEl.classList.add('dark');
        this.engine.setTheme('dark');
        if (themeToggleText) themeToggleText.textContent = 'White Theme';
      }
    });

    // Grid Switcher
    const gridTypeSelect = document.getElementById('gridTypeSelect');
    gridTypeSelect?.addEventListener('change', (e) => {
      const newGrid = e.target.value;
      this.engine.setGridType(newGrid);
      this.bandManager.clearBoard();
      this.protractorTool.clearMeasuredAngles();
      this.rulerTool.clearMeasurements();
      this.penTool.clear();
      this.actionHistory = [];
    });

    // Option Toggles
    const toggleGridLines = document.getElementById('toggleGridLines');
    toggleGridLines?.addEventListener('change', (e) => {
      this.engine.setShowGridLines(e.target.checked);
    });

    // Action Buttons & UNIFIED UNDO SYSTEM
    document.getElementById('btnUndo')?.addEventListener('click', () => {
      this.executeUndo();
    });

    document.getElementById('btnRedo')?.addEventListener('click', () => {
      this.bandManager.redo();
    });

    document.getElementById('btnClear')?.addEventListener('click', () => {
      this.bandManager.clearBoard();
      this.protractorTool.clearMeasuredAngles();
      this.rulerTool.clearMeasurements();
      this.penTool.clear();
      this.actionHistory = [];
    });

    document.getElementById('btnDeleteShape')?.addEventListener('click', () => {
      this.bandManager.deleteSelectedShape();
    });

    document.getElementById('btnExport')?.addEventListener('click', () => this.exportImage());

    // Canvas Pointer Events
    this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    this.canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', (e) => this.onPointerUp(e));
  }

  executeUndo() {
    if (this.actionHistory.length > 0) {
      const lastAction = this.actionHistory.pop();
      if (lastAction.type === 'ruler') {
        this.rulerTool.undo();
      } else if (lastAction.type === 'protractor') {
        this.protractorTool.undo();
      } else if (lastAction.type === 'pen') {
        this.penTool.undo();
      } else if (lastAction.type === 'band') {
        this.bandManager.undo();
      }
      return;
    }

    // Fallback if actionHistory is empty
    if (this.rulerTool.undo()) return;
    if (this.penTool.undo()) return;
    if (this.protractorTool.undo()) return;
    this.bandManager.undo();
  }

  getCanvasCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  onPointerDown(e) {
    const pos = this.getCanvasCoords(e);
    const nearestPeg = this.engine.getNearestPeg(pos.x, pos.y);

    // 1. Check Virtual Protractor / Virtual Ruler widget interaction
    if (this.protractorTool.handleMouseDown(pos.x, pos.y)) return;
    if (this.rulerTool.handleMouseDown(pos.x, pos.y)) return;

    if (this.activeMode === 'draw') {
      if (nearestPeg) {
        this.dragStartPeg = nearestPeg;
        const initialShapes = this.bandManager.shapes.length;
        this.bandManager.handlePegClick(nearestPeg, false);
        if (this.bandManager.shapes.length > initialShapes) {
          this.actionHistory.push({ type: 'band' });
        }
      }
    } else if (this.activeMode === 'circle') {
      if (nearestPeg) {
        if (this.bandManager.activePoints.length === 0) {
          this.bandManager.activePoints.push(nearestPeg);
        } else {
          const center = this.bandManager.activePoints[0];
          this.bandManager.finishCircle(center, nearestPeg);
          this.actionHistory.push({ type: 'band' });
        }
      }
    } else if (this.activeMode === 'pen') {
      this.isDrawingPen = true;
      this.penTool.startStroke(pos.x, pos.y, this.bandManager.selectedColor.stroke, 3);
    } else if (this.activeMode === 'protractor') {
      if (nearestPeg) {
        const prevCount = this.protractorTool.measuredAngles.length;
        this.protractorTool.handlePegClick(nearestPeg);
        if (this.protractorTool.measuredAngles.length > prevCount) {
          this.actionHistory.push({ type: 'protractor' });
        }
      }
    } else if (this.activeMode === 'ruler') {
      if (nearestPeg) {
        const prevCount = this.rulerTool.savedMeasurements.length;
        this.rulerTool.handlePegClick(nearestPeg);
        if (this.rulerTool.savedMeasurements.length > prevCount) {
          this.actionHistory.push({ type: 'ruler' });
        }
      }
    }
  }

  onPointerMove(e) {
    const pos = this.getCanvasCoords(e);
    this.hoveredPeg = this.engine.getNearestPeg(pos.x, pos.y);

    // Virtual widgets move
    if (this.protractorTool.handleMouseMove(pos.x, pos.y)) return;
    if (this.rulerTool.handleMouseMove(pos.x, pos.y)) return;

    // Pen tool drawing
    if (this.activeMode === 'pen' && this.isDrawingPen) {
      this.penTool.addPoint(pos.x, pos.y);
      return;
    }

    // Live elastic preview in draw / circle mode
    if (this.activeMode === 'draw' || this.activeMode === 'circle') {
      this.bandManager.activeMousePos = pos;
    }
  }

  onPointerUp(e) {
    const pos = this.getCanvasCoords(e);
    const upPeg = this.engine.getNearestPeg(pos.x, pos.y);

    if (this.activeMode === 'pen' && this.isDrawingPen) {
      this.isDrawingPen = false;
      if (this.penTool.endStroke()) {
        this.actionHistory.push({ type: 'pen' });
      }
    }

    // AUTOMATIC RUBBER BAND LINE CREATION ON PEG RELEASE
    if (this.activeMode === 'draw' && this.dragStartPeg && upPeg) {
      if (upPeg.id !== this.dragStartPeg.id) {
        const initialShapes = this.bandManager.shapes.length;
        this.bandManager.handlePegClick(upPeg, true);
        if (this.bandManager.shapes.length > initialShapes) {
          this.actionHistory.push({ type: 'band' });
        }
      }
    }

    this.dragStartPeg = null;
    this.protractorTool.handleMouseUp();
    this.rulerTool.handleMouseUp();
  }

  exportImage() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.canvas.width;
    tempCanvas.height = this.canvas.height;
    const ctx = tempCanvas.getContext('2d');

    // Copy canvas contents
    ctx.drawImage(this.canvas, 0, 0);

    const link = document.createElement('a');
    link.download = `virtual_geoboard_${Date.now()}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
  }

  startRenderLoop() {
    const loop = () => {
      // 1. Render peg grid background
      const activePeg = this.bandManager.activePoints[this.bandManager.activePoints.length - 1] || null;
      this.engine.renderGrid(activePeg, this.hoveredPeg);

      // 2. Render freehand Pen tool strokes
      this.penTool.render(this.engine.ctx);

      // 3. Render rubber band polygons, lines, circles & active elastic preview
      this.bandManager.renderBands(this.engine.ctx);
      if (this.bandManager.activePoints.length > 0) {
        this.bandManager.renderActiveBandPreview(this.engine.ctx, this.activeMode === 'circle');
      }

      // 4. Render protractor angle arcs & virtual protractor tool
      this.protractorTool.render(this.engine.ctx);

      // 5. Render ruler measurements & virtual ruler tool
      this.rulerTool.render(this.engine.ctx);

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.geoboardApp = new App();
});
