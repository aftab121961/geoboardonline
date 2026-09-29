/**
 * geoboardEngine.js - Interactive Peg Grid Rendering Engine & Magnet Snapping
 * Supports 5x5, 10x10, Dense Isometric (16x20), and Circular Grids in Dark & Light Themes
 */

export class GeoboardEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.gridType = options.gridType || 'square15'; // 'square5', 'square15', 'isometric', 'circular'
    this.theme = options.theme || 'dark'; // 'dark' | 'light'
    this.showGridLines = options.showGridLines !== undefined ? options.showGridLines : true;

    this.pegs = [];
    this.padding = 40;
    this.snapRadius = 30; // Default pixel radius for magnet snap

    // Responsive setup
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  setGridType(type) {
    this.gridType = type;
    this.rebuildPegs();
  }

  setTheme(theme) {
    this.theme = theme;
  }

  setShowGridLines(show) {
    this.showGridLines = show;
  }

  resizeCanvas() {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Canvas size
    const size = Math.min(rect.width, rect.height, 900) - 20;
    this.width = Math.max(size, 320);
    this.height = Math.max(size, 320);

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);

    this.rebuildPegs();
  }

  /**
   * Recompute peg positions based on current grid type and canvas dimensions
   */
  rebuildPegs() {
    this.pegs = [];
    const width = this.width;
    const height = this.height;
    const pad = this.padding;

    const usableW = width - 2 * pad;
    const usableH = height - 2 * pad;

    if (this.gridType === 'square5' || this.gridType === 'square15') {
      const cols = this.gridType === 'square15' ? 15 : 5;
      const rows = cols;

      const stepX = usableW / (cols - 1);
      const stepY = usableH / (rows - 1);

      this.stepX = stepX;
      this.stepY = stepY;
      this.gridCols = cols;
      this.gridRows = rows;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          this.pegs.push({
            id: `p_${c}_${r}`,
            gridX: c,
            gridY: r,
            x: pad + c * stepX,
            y: pad + r * stepY,
            label: `${c},${r}`
          });
        }
      }
    } else if (this.gridType === 'isometric') {
      // 3D Isometric Grid: 1 unit vertical peg distance, 2 unit horizontal peg distance
      const rows = 16;
      const stepY = usableH / (rows - 1); // 1 vertical unit spacing
      const stepX = 2 * stepY; // 2 horizontal units spacing

      const cols = Math.floor(usableW / stepX) + 1;
      const startX = (width - (cols - 1) * stepX) / 2;

      for (let r = 0; r < rows; r++) {
        const offset = (r % 2 === 1) ? stepY : 0; // 1 unit offset on alternating rows
        const colsInRow = (r % 2 === 1) ? cols - 1 : cols;
        for (let c = 0; c < colsInRow; c++) {
          const px = startX + offset + c * stepX;
          const py = pad + r * stepY;
          this.pegs.push({
            id: `p_iso_${c}_${r}`,
            gridX: c + (r % 2 === 1 ? 0.5 : 0),
            gridY: r,
            x: px,
            y: py,
            label: `${r},${c}`
          });
        }
      }
    } else if (this.gridType === 'circular') {
      // Concentric Circular Grid layout
      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.min(usableW, usableH) / 2;
      const numRings = 4;
      const ringStep = maxRadius / numRings;

      // Center Peg (0, 0)
      this.pegs.push({
        id: 'p_circ_center',
        gridX: 0,
        gridY: 0,
        x: centerX,
        y: centerY,
        ring: 0,
        angleDeg: 0,
        label: '(0,0)'
      });

      // Concentric Rings
      const pegsPerRing = [6, 12, 18, 24];
      for (let r = 1; r <= numRings; r++) {
        const count = pegsPerRing[r - 1];
        const radiusPx = r * ringStep;
        for (let i = 0; i < count; i++) {
          const angleDeg = (i * 360) / count;
          const rad = (angleDeg * Math.PI) / 180;
          const px = centerX + Math.cos(rad) * radiusPx;
          const py = centerY + Math.sin(rad) * radiusPx;

          this.pegs.push({
            id: `p_circ_${r}_${i}`,
            gridX: parseFloat((r * Math.cos(rad)).toFixed(2)),
            gridY: parseFloat((r * Math.sin(rad)).toFixed(2)),
            x: px,
            y: py,
            ring: r,
            radiusUnits: r,
            angleDeg: Math.round(angleDeg),
            label: `R${r}, ${Math.round(angleDeg)}°`
          });
        }
      }
    }
  }

  /**
   * Find nearest peg to pixel coordinates (x, y)
   */
  getNearestPeg(px, py, maxDist) {
    const effectiveMaxDist = maxDist !== undefined ? maxDist : (
      this.gridType === 'isometric' ? 22 : (this.gridType === 'square15' ? 18 : this.snapRadius)
    );
    let closest = null;
    let minDist = effectiveMaxDist;

    for (let i = 0; i < this.pegs.length; i++) {
      const peg = this.pegs[i];
      const dist = Math.hypot(peg.x - px, peg.y - py);
      if (dist < minDist) {
        minDist = dist;
        closest = peg;
      }
    }
    return closest;
  }

  /**
   * Render the background grid, grid lines, and pegs
   */
  renderGrid(activePeg = null, hoveredPeg = null) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const isLight = this.theme === 'light';

    // 1. Draw board background texture
    const bgGradient = ctx.createRadialGradient(
      this.width / 2, this.height / 2, 50,
      this.width / 2, this.height / 2, this.width * 0.7
    );

    if (isLight) {
      bgGradient.addColorStop(0, '#ffffff');
      bgGradient.addColorStop(1, '#f1f5f9');
    } else {
      bgGradient.addColorStop(0, '#1e293b');
      bgGradient.addColorStop(1, '#0f172a');
    }

    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Draw Board Border / Frame
    ctx.strokeStyle = isLight ? '#cbd5e1' : '#334155';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, this.width - 20, this.height - 20);

    // 3. Draw Grid Lines (if enabled)
    if (this.showGridLines) {
      ctx.beginPath();
      ctx.strokeStyle = isLight ? 'rgba(100, 116, 139, 0.25)' : 'rgba(148, 163, 184, 0.18)';
      ctx.lineWidth = 1.5;

      if (this.gridType === 'square5' || this.gridType === 'square15') {
        const cols = this.gridCols;
        const rows = this.gridRows;

        // Vertical lines
        for (let c = 0; c < cols; c++) {
          const topPeg = this.pegs[c];
          const bottomPeg = this.pegs[c + (rows - 1) * cols];
          if (topPeg && bottomPeg) {
            ctx.moveTo(topPeg.x, topPeg.y);
            ctx.lineTo(bottomPeg.x, bottomPeg.y);
          }
        }
        // Horizontal lines
        for (let r = 0; r < rows; r++) {
          const leftPeg = this.pegs[r * cols];
          const rightPeg = this.pegs[r * cols + (cols - 1)];
          if (leftPeg && rightPeg) {
            ctx.moveTo(leftPeg.x, leftPeg.y);
            ctx.lineTo(rightPeg.x, rightPeg.y);
          }
        }
      } else if (this.gridType === 'isometric') {
        const rows = 16;
        const stepY = (this.height - 2 * this.padding) / (rows - 1);
        const targetDiagDist = Math.SQRT2 * stepY;
        const targetDirectDist = 2 * stepY;
        for (let i = 0; i < this.pegs.length; i++) {
          const p1 = this.pegs[i];
          for (let j = i + 1; j < this.pegs.length; j++) {
            const p2 = this.pegs[j];
            const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            if (Math.abs(dist - targetDiagDist) < 4 || Math.abs(dist - targetDirectDist) < 4) {
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
            }
          }
        }
      } else if (this.gridType === 'circular') {
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const maxRadius = Math.min(this.width - 2 * this.padding, this.height - 2 * this.padding) / 2;
        const ringStep = maxRadius / 4;

        for (let r = 1; r <= 4; r++) {
          ctx.moveTo(centerX + r * ringStep, centerY);
          ctx.arc(centerX, centerY, r * ringStep, 0, Math.PI * 2);
        }

        for (let deg = 0; deg < 180; deg += 30) {
          const rad = (deg * Math.PI) / 180;
          const x1 = centerX + Math.cos(rad) * maxRadius;
          const y1 = centerY + Math.sin(rad) * maxRadius;
          const x2 = centerX - Math.cos(rad) * maxRadius;
          const y2 = centerY - Math.sin(rad) * maxRadius;
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
        }
      }
      ctx.stroke();
    }

    // 4. Render All Pegs
    for (let i = 0; i < this.pegs.length; i++) {
      const peg = this.pegs[i];
      this.drawPeg(peg, activePeg === peg, hoveredPeg === peg, isLight);
    }
  }

  /**
   * Draw individual metallic peg button
   */
  drawPeg(peg, isActive = false, isHovered = false, isLight = false) {
    const ctx = this.ctx;
    const baseRadius = this.gridType === 'isometric' ? 4 : (this.gridType === 'square15' ? 4.5 : 7.5);
    const r = isHovered ? baseRadius + 2.5 : (isActive ? baseRadius + 3.5 : baseRadius);

    // Outer glow for hover/active
    if (isHovered || isActive) {
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, r + 5, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? 'rgba(59, 130, 246, 0.4)' : 'rgba(236, 72, 153, 0.3)';
      ctx.fill();
    }

    // Drop shadow
    ctx.beginPath();
    ctx.arc(peg.x + 1, peg.y + 1.5, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fill();

    // Metallic / Color Body
    const pegGradient = ctx.createRadialGradient(
      peg.x - r * 0.3, peg.y - r * 0.3, r * 0.1,
      peg.x, peg.y, r
    );
    if (isActive) {
      pegGradient.addColorStop(0, '#93c5fd');
      pegGradient.addColorStop(0.5, '#3b82f6');
      pegGradient.addColorStop(1, '#1d4ed8');
    } else if (isHovered) {
      pegGradient.addColorStop(0, '#fbcfe8');
      pegGradient.addColorStop(0.5, '#ec4899');
      pegGradient.addColorStop(1, '#be185d');
    } else if (isLight) {
      pegGradient.addColorStop(0, '#ffffff');
      pegGradient.addColorStop(0.6, '#cbd5e1');
      pegGradient.addColorStop(1, '#64748b');
    } else {
      pegGradient.addColorStop(0, '#f1f5f9');
      pegGradient.addColorStop(0.6, '#94a3b8');
      pegGradient.addColorStop(1, '#475569');
    }

    ctx.beginPath();
    ctx.arc(peg.x, peg.y, r, 0, Math.PI * 2);
    ctx.fillStyle = pegGradient;
    ctx.fill();
    ctx.strokeStyle = isActive ? '#60a5fa' : (isLight ? '#475569' : '#cbd5e1');
    ctx.lineWidth = 1;
    ctx.stroke();

    // Pin center dot
    if (r >= 3.5) {
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, Math.max(1.2, r * 0.25), 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
    }
  }
}


