/**
 * geoboardEngine.js - Interactive Peg Grid Rendering Engine & Magnet Snapping
 */

export class GeoboardEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.gridType = options.gridType || 'square5'; // 'square5', 'square10', 'isometric'
    this.showGridLines = options.showGridLines !== undefined ? options.showGridLines : true;
    this.showPegLabels = options.showPegLabels !== undefined ? options.showPegLabels : false;

    this.pegs = [];
    this.padding = 50;
    this.snapRadius = 35; // Pixel radius for magnet snap

    // Responsive setup
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  setGridType(type) {
    this.gridType = type;
    this.rebuildPegs();
  }

  setShowGridLines(show) {
    this.showGridLines = show;
  }

  setShowPegLabels(show) {
    this.showPegLabels = show;
  }

  resizeCanvas() {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Use minimum square dimension for perfect aspect ratio
    const size = Math.min(rect.width, rect.height, 800) - 20;
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

    if (this.gridType === 'square5') {
      const rows = 5, cols = 5;
      const stepX = usableW / (cols - 1);
      const stepY = usableH / (rows - 1);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          this.pegs.push({
            id: `p_${c}_${r}`,
            gridX: c,
            gridY: r,
            x: pad + c * stepX,
            y: pad + r * stepY,
            label: `(${c},${r})`
          });
        }
      }
    } else if (this.gridType === 'square10') {
      const rows = 10, cols = 10;
      const stepX = usableW / (cols - 1);
      const stepY = usableH / (rows - 1);

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
      // Triangular / Isometric grid layout
      const rows = 7;
      const cols = 9;
      const stepY = usableH / (rows - 1);
      const stepX = stepY * (2 / Math.sqrt(3)); // Equilateral spacing

      const startX = (width - (cols - 1) * stepX) / 2;

      for (let r = 0; r < rows; r++) {
        const offset = (r % 2 === 1) ? stepX / 2 : 0;
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

      // Concentric Rings: Ring 1 (6 pegs), Ring 2 (12 pegs), Ring 3 (18 pegs), Ring 4 (24 pegs)
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
   * Find nearest peg to pixel coordinates (x, y) within snap radius
   */
  getNearestPeg(px, py, maxDist = this.snapRadius) {
    let closest = null;
    let minDist = maxDist;

    for (const peg of this.pegs) {
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

    // 1. Draw subtle board background texture
    const bgGradient = ctx.createRadialGradient(
      this.width / 2, this.height / 2, 50,
      this.width / 2, this.height / 2, this.width * 0.7
    );
    bgGradient.addColorStop(0, '#1e293b'); // Dark Slate center
    bgGradient.addColorStop(1, '#0f172a'); // Very dark border
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Draw Board Border / Frame
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, this.width - 20, this.height - 20);

    // 3. Draw Grid Lines (if enabled)
    if (this.showGridLines) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)'; // Slate faint line
      ctx.lineWidth = 1.5;

      if (this.gridType === 'square5' || this.gridType === 'square10') {
        const rows = this.gridType === 'square5' ? 5 : 10;
        const cols = rows;

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
        // Connect isometric triangular lattice
        for (let i = 0; i < this.pegs.length; i++) {
          const p1 = this.pegs[i];
          for (let j = i + 1; j < this.pegs.length; j++) {
            const p2 = this.pegs[j];
            const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            const targetDist = (this.height - 2 * this.padding) / 6;
            if (Math.abs(dist - targetDist) < 15 || Math.abs(dist - targetDist * (2 / Math.sqrt(3))) < 15) {
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
            }
          }
        }
      } else if (this.gridType === 'circular') {
        // Draw Concentric Rings & Radial Spokes
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const maxRadius = Math.min(this.width - 2 * this.padding, this.height - 2 * this.padding) / 2;
        const ringStep = maxRadius / 4;

        // Concentric Rings
        for (let r = 1; r <= 4; r++) {
          ctx.moveTo(centerX + r * ringStep, centerY);
          ctx.arc(centerX, centerY, r * ringStep, 0, Math.PI * 2);
        }

        // 12 Radial Spokes (every 30 degrees)
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
    for (const peg of this.pegs) {
      this.drawPeg(peg, activePeg === peg, hoveredPeg === peg);
    }
  }

  /**
   * Draw individual metallic 3D peg button
   */
  drawPeg(peg, isActive = false, isHovered = false) {
    const ctx = this.ctx;
    const baseRadius = this.gridType === 'square10' ? 6 : 8;
    const r = isHovered ? baseRadius + 3 : (isActive ? baseRadius + 4 : baseRadius);

    // Outer glow for hover/active
    if (isHovered || isActive) {
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, r + 6, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? 'rgba(59, 130, 246, 0.4)' : 'rgba(236, 72, 153, 0.3)';
      ctx.fill();
    }

    // Drop shadow
    ctx.beginPath();
    ctx.arc(peg.x + 1.5, peg.y + 2, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fill();

    // Metallic Gradient Body
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
    } else {
      pegGradient.addColorStop(0, '#f1f5f9');
      pegGradient.addColorStop(0.6, '#94a3b8');
      pegGradient.addColorStop(1, '#475569');
    }

    ctx.beginPath();
    ctx.arc(peg.x, peg.y, r, 0, Math.PI * 2);
    ctx.fillStyle = pegGradient;
    ctx.fill();
    ctx.strokeStyle = isActive ? '#60a5fa' : '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Pin center dot
    ctx.beginPath();
    ctx.arc(peg.x, peg.y, Math.max(2, r * 0.3), 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();

    // Peg Label (if enabled)
    if (this.showPegLabels && this.gridType !== 'square10') {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(peg.label, peg.x, peg.y + r + 12);
    }
  }
}
