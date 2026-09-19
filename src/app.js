/**
 * app.js - Main Geoboard Application Controller
 * High-performance UI controller with automatic rubber band line creation,
 * white theme toggle, compact icon tools, 100x100 grid support, and zero keyboard dependencies.
 */

import { GeoboardEngine } from './geoboardEngine.js';
import { BandManager, BAND_COLORS } from './bandManager.js';
import { ProtractorTool } from './protractorTool.js';
import { RulerTool } from './rulerTool.js';
import { PRESETS } from './presets.js';

class App {
  constructor() {
    this.canvas = document.getElementById('geoboardCanvas');
    this.engine = new GeoboardEngine(this.canvas, { gridType: 'square5', theme: 'dark', showGridLines: true });
    this.bandManager = new BandManager(this.engine);
    this.protractorTool = new ProtractorTool(this.engine);
    this.rulerTool = new RulerTool(this.engine);

    this.activeMode = 'draw'; // 'draw', 'circle', 'select', 'protractor', 'ruler'
    this.hoveredPeg = null;
    this.dragStartPeg = null;

    this.initUI();
    this.bindEvents();
    this.startRenderLoop();

    // Load initial unit square preset to welcome user
    this.loadPreset('unit_square');
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

    // Populate Presets Select
    const presetSelect = document.getElementById('presetSelect');
    if (presetSelect) {
      presetSelect.innerHTML = '<option value="">-- Load Shape Preset --</option>';
      PRESETS.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.name} (${p.gridType === 'isometric' ? 'Iso' : 'Square'})`;
        presetSelect.appendChild(opt);
      });
      presetSelect.addEventListener('change', (e) => {
        if (e.target.value) {
          this.loadPreset(e.target.value);
          e.target.value = '';
        }
      });
    }
  }

  bindEvents() {
    // Mode Icon Buttons
    const btnDraw = document.getElementById('modeDraw');
    const btnCircle = document.getElementById('modeCircle');
    const btnSelect = document.getElementById('modeSelect');
    const btnProtractor = document.getElementById('modeProtractor');
    const btnRuler = document.getElementById('modeRuler');
    const btnVirtualProtractor = document.getElementById('btnVirtualProtractor');
    const btnVirtualRuler = document.getElementById('btnVirtualRuler');

    const updateModeUI = () => {
      [btnDraw, btnCircle, btnSelect, btnProtractor, btnRuler].forEach(btn => btn?.classList.remove('active-mode'));
      if (this.activeMode === 'draw') btnDraw?.classList.add('active-mode');
      if (this.activeMode === 'circle') btnCircle?.classList.add('active-mode');
      if (this.activeMode === 'select') btnSelect?.classList.add('active-mode');
      if (this.activeMode === 'protractor') btnProtractor?.classList.add('active-mode');
      if (this.activeMode === 'ruler') btnRuler?.classList.add('active-mode');
    };

    btnDraw?.addEventListener('click', () => {
      this.activeMode = 'draw';
      this.bandManager.cancelActiveLoop();
      if (this.protractorTool.active) this.protractorTool.toggleActive();
      if (this.rulerTool.active) this.rulerTool.toggleActive();
      updateModeUI();
    });

    btnCircle?.addEventListener('click', () => {
      this.activeMode = 'circle';
      this.bandManager.cancelActiveLoop();
      if (this.protractorTool.active) this.protractorTool.toggleActive();
      if (this.rulerTool.active) this.rulerTool.toggleActive();
      updateModeUI();
    });

    btnSelect?.addEventListener('click', () => {
      this.activeMode = 'select';
      this.bandManager.cancelActiveLoop();
      if (this.protractorTool.active) this.protractorTool.toggleActive();
      if (this.rulerTool.active) this.rulerTool.toggleActive();
      updateModeUI();
    });

    btnProtractor?.addEventListener('click', () => {
      this.activeMode = 'protractor';
      this.bandManager.cancelActiveLoop();
      if (!this.protractorTool.active) this.protractorTool.toggleActive();
      if (this.rulerTool.active) this.rulerTool.toggleActive();
      updateModeUI();
    });

    btnRuler?.addEventListener('click', () => {
      this.activeMode = 'ruler';
      this.bandManager.cancelActiveLoop();
      if (this.protractorTool.active) this.protractorTool.toggleActive();
      if (!this.rulerTool.active) this.rulerTool.toggleActive();
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

    // Light / White Theme Toggle
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

    // Grid Switcher (includes 100x100)
    const gridTypeSelect = document.getElementById('gridTypeSelect');
    gridTypeSelect?.addEventListener('change', (e) => {
      const newGrid = e.target.value;
      this.engine.setGridType(newGrid);
      this.bandManager.clearBoard();
      this.protractorTool.clearMeasuredAngles();
      this.rulerTool.clearMeasurements();
    });

    // Option Toggles
    const toggleGridLines = document.getElementById('toggleGridLines');
    toggleGridLines?.addEventListener('change', (e) => {
      this.engine.setShowGridLines(e.target.checked);
    });

    const togglePegLabels = document.getElementById('togglePegLabels');
    togglePegLabels?.addEventListener('change', (e) => {
      this.engine.setShowPegLabels(e.target.checked);
    });

    // Action Buttons
    document.getElementById('btnUndo')?.addEventListener('click', () => {
      this.bandManager.undo();
    });

    document.getElementById('btnRedo')?.addEventListener('click', () => {
      this.bandManager.redo();
    });

    document.getElementById('btnClear')?.addEventListener('click', () => {
      this.bandManager.clearBoard();
      this.protractorTool.clearMeasuredAngles();
    });

    document.getElementById('btnDeleteShape')?.addEventListener('click', () => {
      this.bandManager.deleteSelectedShape();
    });

    document.getElementById('btnFinishLine')?.addEventListener('click', () => {
      this.bandManager.finishActiveLine();
    });

    document.getElementById('btnExport')?.addEventListener('click', () => this.exportImage());

    // Canvas Pointer Events
    this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    this.canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', (e) => this.onPointerUp(e));

    // Double click to finish line or auto-close loop
    this.canvas.addEventListener('dblclick', () => {
      if (this.activeMode === 'draw') {
        this.bandManager.finishActiveLine();
      }
    });
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
        this.bandManager.handlePegClick(nearestPeg, false);
      }
    } else if (this.activeMode === 'circle') {
      if (nearestPeg) {
        if (this.bandManager.activePoints.length === 0) {
          this.bandManager.activePoints.push(nearestPeg);
        } else {
          const center = this.bandManager.activePoints[0];
          this.bandManager.finishCircle(center, nearestPeg);
        }
      }
    } else if (this.activeMode === 'select') {
      // Check if clicking existing shape vertex to drag
      const selectedShape = this.bandManager.getSelectedShape();
      if (selectedShape) {
        for (let i = 0; i < selectedShape.pegs.length; i++) {
          const peg = selectedShape.pegs[i];
          if (Math.hypot(peg.x - pos.x, peg.y - pos.y) < 20) {
            this.bandManager.startDraggingVertex(selectedShape.id, i);
            return;
          }
        }
      }

      // Select shape
      this.bandManager.selectShapeAt(pos.x, pos.y);
    } else if (this.activeMode === 'protractor') {
      if (nearestPeg) {
        this.protractorTool.handlePegClick(nearestPeg);
      }
    } else if (this.activeMode === 'ruler') {
      if (nearestPeg) {
        this.rulerTool.handlePegClick(nearestPeg);
      }
    }
  }

  onPointerMove(e) {
    const pos = this.getCanvasCoords(e);
    this.hoveredPeg = this.engine.getNearestPeg(pos.x, pos.y);

    // Virtual widgets move
    if (this.protractorTool.handleMouseMove(pos.x, pos.y)) return;
    if (this.rulerTool.handleMouseMove(pos.x, pos.y)) return;

    // Live elastic preview in draw / circle mode
    if (this.activeMode === 'draw' || this.activeMode === 'circle') {
      this.bandManager.activeMousePos = pos;
    }

    // Dragging vertex in select mode
    if (this.activeMode === 'select' && this.bandManager.draggingVertexInfo) {
      if (this.hoveredPeg) {
        this.bandManager.updateDraggedVertex(this.hoveredPeg);
      }
    }
  }

  onPointerUp(e) {
    const pos = this.getCanvasCoords(e);
    const upPeg = this.engine.getNearestPeg(pos.x, pos.y);

    // AUTOMATIC RUBBER BAND LINE CREATION ON PEG RELEASE:
    // If user dragged from dragStartPeg and released on upPeg -> automatically complete line!
    if (this.activeMode === 'draw' && this.dragStartPeg && upPeg) {
      if (upPeg.id !== this.dragStartPeg.id) {
        this.bandManager.handlePegClick(upPeg, true);
      }
    }

    this.dragStartPeg = null;
    this.protractorTool.handleMouseUp();
    this.rulerTool.handleMouseUp();
    if (this.bandManager.draggingVertexInfo) {
      this.bandManager.stopDraggingVertex();
    }
  }

  loadPreset(presetId) {
    const preset = PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    // Set grid type
    this.engine.setGridType(preset.gridType);
    const gridTypeSelect = document.getElementById('gridTypeSelect');
    if (gridTypeSelect) gridTypeSelect.value = preset.gridType;

    // Clear board & load preset pegs
    this.bandManager.clearBoard();
    this.bandManager.setColor(preset.colorId || 'red');

    if (preset.isCircle) {
      const center = this.engine.pegs.find(peg => Math.abs(peg.gridX - preset.pegs[0].gridX) < 0.1 && Math.abs(peg.gridY - preset.pegs[0].gridY) < 0.1);
      const radPeg = this.engine.pegs.find(peg => Math.abs(peg.gridX - preset.pegs[1].gridX) < 0.1 && Math.abs(peg.gridY - preset.pegs[1].gridY) < 0.1);
      if (center && radPeg) {
        this.bandManager.finishCircle(center, radPeg);
      }
    } else {
      preset.pegs.forEach(p => {
        const nearest = this.engine.pegs.find(peg =>
          Math.abs(peg.gridX - p.gridX) < 0.1 && Math.abs(peg.gridY - p.gridY) < 0.1
        );
        if (nearest) {
          this.bandManager.handlePegClick(nearest, false);
        }
      });

      if (preset.isLine && this.bandManager.activePoints.length >= 2) {
        this.bandManager.finishActiveLine();
      } else if (this.bandManager.activePoints.length >= 3) {
        this.bandManager.closeActiveLoop();
      }
    }
  }

  exportImage() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.canvas.width;
    tempCanvas.height = this.canvas.height;
    const ctx = tempCanvas.getContext('2d');

    // Copy canvas contents
    ctx.drawImage(this.canvas, 0, 0);

    const link = document.createElement('a');
    link.download = `geoboard_${Date.now()}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
  }

  startRenderLoop() {
    const loop = () => {
      // 1. Render peg grid background
      const activePeg = this.bandManager.activePoints[this.bandManager.activePoints.length - 1] || null;
      this.engine.renderGrid(activePeg, this.hoveredPeg);

      // 2. Render rubber band polygons, lines, circles & active elastic preview
      this.bandManager.renderBands(this.engine.ctx);
      if (this.bandManager.activePoints.length > 0) {
        this.bandManager.renderActiveBandPreview(this.engine.ctx, this.activeMode === 'circle');
      }

      // 3. Render protractor angle arcs & virtual protractor tool
      this.protractorTool.render(this.engine.ctx);

      // 4. Render ruler measurements & virtual ruler tool
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
