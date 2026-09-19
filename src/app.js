/**
 * app.js - Main Geoboard Application Controller
 */

import { GeoboardEngine } from './geoboardEngine.js';
import { BandManager, BAND_COLORS } from './bandManager.js';
import { ProtractorTool } from './protractorTool.js';
import { RulerTool } from './rulerTool.js';
import { MathEngine } from './mathEngine.js';
import { PRESETS, PUZZLES } from './presets.js';

class App {
  constructor() {
    this.canvas = document.getElementById('geoboardCanvas');
    this.engine = new GeoboardEngine(this.canvas, { gridType: 'square5', showGridLines: true });
    this.bandManager = new BandManager(this.engine);
    this.protractorTool = new ProtractorTool(this.engine);
    this.rulerTool = new RulerTool(this.engine);

    this.activeMode = 'draw'; // 'draw', 'circle', 'select', 'protractor', 'ruler'
    this.hoveredPeg = null;

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
        btn.className = `color-btn w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none ${c.id === 'red' ? 'ring-2 ring-white scale-110' : 'border-transparent'}`;
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
    // Mode Buttons
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

    // Grid Switcher
    const gridTypeSelect = document.getElementById('gridTypeSelect');
    gridTypeSelect?.addEventListener('change', (e) => {
      const newGrid = e.target.value;
      this.engine.setGridType(newGrid);
      this.bandManager.clearBoard();
      this.protractorTool.clearMeasuredAngles();
      this.rulerTool.clearMeasurements();
      this.updateMathHUD();
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
      this.updateMathHUD();
    });

    document.getElementById('btnRedo')?.addEventListener('click', () => {
      this.bandManager.redo();
      this.updateMathHUD();
    });

    document.getElementById('btnClear')?.addEventListener('click', () => {
      this.bandManager.clearBoard();
      this.protractorTool.clearMeasuredAngles();
      this.updateMathHUD();
    });

    document.getElementById('btnDeleteShape')?.addEventListener('click', () => {
      this.bandManager.deleteSelectedShape();
      this.updateMathHUD();
    });

    document.getElementById('btnFinishLine')?.addEventListener('click', () => {
      this.bandManager.finishActiveLine();
      this.updateMathHUD();
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
        this.updateMathHUD();
      }
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.bandManager.cancelActiveLoop();
      } else if (e.key === 'Enter') {
        if (this.activeMode === 'draw') {
          this.bandManager.finishActiveLine();
          this.updateMathHUD();
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        this.bandManager.deleteSelectedShape();
        this.updateMathHUD();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) this.bandManager.redo();
        else this.bandManager.undo();
        this.updateMathHUD();
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
        this.bandManager.handlePegClick(nearestPeg);
        this.updateMathHUD();
      }
    } else if (this.activeMode === 'circle') {
      if (nearestPeg) {
        if (this.bandManager.activePoints.length === 0) {
          this.bandManager.activePoints.push(nearestPeg);
        } else {
          const center = this.bandManager.activePoints[0];
          this.bandManager.finishCircle(center, nearestPeg);
          this.updateMathHUD();
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

      // Check if selecting a shape
      const shape = this.bandManager.selectShapeAt(pos.x, pos.y);
      this.updateMathHUD();
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
        this.updateMathHUD();
      }
    }
  }

  onPointerUp(e) {
    this.protractorTool.handleMouseUp();
    this.rulerTool.handleMouseUp();
    if (this.bandManager.draggingVertexInfo) {
      this.bandManager.stopDraggingVertex();
      this.updateMathHUD();
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
      // Map preset relative grid pegs to actual grid pegs
      preset.pegs.forEach(p => {
        const nearest = this.engine.pegs.find(peg =>
          Math.abs(peg.gridX - p.gridX) < 0.1 && Math.abs(peg.gridY - p.gridY) < 0.1
        );
        if (nearest) {
          this.bandManager.handlePegClick(nearest);
        }
      });

      // Close shape or finish line
      if (preset.isLine && this.bandManager.activePoints.length >= 2) {
        this.bandManager.finishActiveLine();
      } else if (this.bandManager.activePoints.length >= 3) {
        this.bandManager.closeActiveLoop();
      }
    }

    this.updateMathHUD();
  }

  updateMathHUD() {
    const selectedShape = this.bandManager.getSelectedShape() ||
      (this.bandManager.shapes.length > 0 ? this.bandManager.shapes[this.bandManager.shapes.length - 1] : null);

    const hudContainer = document.getElementById('mathHUD');
    if (!hudContainer) return;

    if (!selectedShape) {
      hudContainer.innerHTML = `
        <div class="text-center py-8 text-slate-400">
          <div class="inline-flex p-3 rounded-full bg-slate-800/60 mb-3 border border-slate-700/50">
            <svg class="w-8 h-8 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 4a2 2 0 114 0v1a2 2 0 01-2 2 2 2 0 01-2-2V4zm-6 8a2 2 0 114 0v1a2 2 0 01-2 2 2 2 0 01-2-2v-1zm12 0a2 2 0 114 0v1a2 2 0 01-2 2 2 2 0 01-2-2v-1zM4 18a2 2 0 114 0v1a2 2 0 01-2 2 2 2 0 01-2-2v-1zm12 0a2 2 0 114 0v1a2 2 0 01-2 2 2 2 0 01-2-2v-1z"/></svg>
          </div>
          <p class="font-medium text-slate-300">No active shape selected</p>
          <p class="text-xs text-slate-500 mt-1">Click pegs to draw a rubber band shape, line, circle, or select an existing object.</p>
        </div>
      `;
      return;
    }

    const { analysis, color } = selectedShape;
    const isIso = this.engine.gridType === 'isometric';

    if (analysis.isCircle) {
      hudContainer.innerHTML = `
        <div class="space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-700/60">
            <div>
              <span class="text-xs uppercase tracking-wider font-semibold text-slate-400">Circle Geometry</span>
              <h3 class="text-lg font-bold text-white flex items-center gap-2">
                <span class="w-3 h-3 rounded-full inline-block" style="background-color: ${color.stroke}"></span>
                ${analysis.classification}
              </h3>
            </div>
            <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-800 text-sky-400 border border-sky-500/30">
              Radius ${analysis.radius} u
            </span>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
              <span class="text-xs font-medium text-slate-400">Circle Area (πr²)</span>
              <div class="text-2xl font-black text-sky-400 mt-0.5">
                ${analysis.area} <span class="text-xs font-normal text-slate-400">sq. units</span>
              </div>
            </div>

            <div class="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
              <span class="text-xs font-medium text-slate-400">Circumference (2πr)</span>
              <div class="text-2xl font-black text-emerald-400 mt-0.5">
                ${analysis.perimeter} <span class="text-xs font-normal text-slate-400">units</span>
              </div>
            </div>
          </div>

          <div class="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs font-mono text-slate-300">
            <div class="flex justify-between"><span>Radius (r):</span><strong class="text-sky-300">${analysis.radius} units</strong></div>
            <div class="flex justify-between"><span>Diameter (d):</span><strong class="text-indigo-300">${analysis.diameter} units</strong></div>
          </div>
        </div>
      `;
      return;
    }

    hudContainer.innerHTML = `
      <div class="space-y-4">
        <!-- Shape Header & Badge -->
        <div class="flex items-center justify-between pb-3 border-b border-slate-700/60">
          <div>
            <span class="text-xs uppercase tracking-wider font-semibold text-slate-400">Geometry Type</span>
            <h3 class="text-lg font-bold text-white flex items-center gap-2">
              <span class="w-3 h-3 rounded-full inline-block" style="background-color: ${color.stroke}"></span>
              ${analysis.classification}
            </h3>
          </div>
          <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-800 text-sky-400 border border-sky-500/30">
            ${analysis.sidesCount} Vertices
          </span>
        </div>

        <!-- Primary Metrics Cards -->
        <div class="grid grid-cols-2 gap-3">
          <!-- Area Card -->
          <div class="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 hover:border-sky-500/40 transition">
            <span class="text-xs font-medium text-slate-400">${analysis.isLine ? 'Surface Area' : 'Area'}</span>
            <div class="text-2xl font-black text-sky-400 mt-0.5">
              ${analysis.area} <span class="text-xs font-normal text-slate-400">sq. units</span>
            </div>
            ${isIso && !analysis.isLine ? `<span class="text-[10px] text-slate-400">${analysis.triangularUnits} unit triangles</span>` : ''}
          </div>

          <!-- Perimeter Card -->
          <div class="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 hover:border-emerald-500/40 transition">
            <span class="text-xs font-medium text-slate-400">${analysis.isLine ? 'Total Length' : 'Perimeter'}</span>
            <div class="text-2xl font-black text-emerald-400 mt-0.5">
              ${analysis.perimeter} <span class="text-xs font-normal text-slate-400">units</span>
            </div>
          </div>
        </div>

        <!-- Pick's Theorem Formula Breakdown (Square Grids) -->
        ${!isIso && !analysis.isLine ? `
          <div class="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-amber-500/30">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-semibold text-amber-400 uppercase tracking-wider">Pick's Theorem Solver</span>
              <span class="text-[11px] font-mono text-slate-400">A = I + B/2 - 1</span>
            </div>

            <div class="grid grid-cols-3 text-center py-2 bg-slate-950/60 rounded-lg border border-slate-800">
              <div>
                <div class="text-lg font-bold text-amber-300">${analysis.interiorPegs}</div>
                <div class="text-[10px] text-slate-400 uppercase">Interior (I)</div>
              </div>
              <div>
                <div class="text-lg font-bold text-sky-300">${analysis.boundaryPegs}</div>
                <div class="text-[10px] text-slate-400 uppercase">Boundary (B)</div>
              </div>
              <div>
                <div class="text-lg font-bold text-emerald-300">${analysis.area}</div>
                <div class="text-[10px] text-slate-400 uppercase">Computed Area</div>
              </div>
            </div>

            <p class="text-[11px] text-slate-400 mt-2.5 leading-relaxed font-mono">
              ${analysis.interiorPegs} + (${analysis.boundaryPegs} / 2) - 1 = <strong class="text-amber-300">${analysis.area}</strong>
            </p>
          </div>
        ` : ''}

        <!-- Angles List -->
        ${analysis.angles.length > 0 ? `
          <div>
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Internal Angles</span>
            <div class="flex flex-wrap gap-1.5">
              ${analysis.angles.map((ang, idx) => `
                <span class="px-2.5 py-1 text-xs font-mono font-medium rounded-md bg-slate-800 text-rose-300 border border-rose-500/20">
                  ∠${idx + 1}: ${ang}°
                </span>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
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
