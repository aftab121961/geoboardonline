/**
 * mathEngine.js - Advanced Geometry & Pick's Theorem Solver for Geoboard
 */

export class MathEngine {
  /**
   * Calculate Greatest Common Divisor (GCD) for integer boundary point calculation
   */
  static gcd(a, b) {
    a = Math.abs(Math.round(a));
    b = Math.abs(Math.round(b));
    while (b) {
      const temp = b;
      b = a % b;
      a = temp;
    }
    return a;
  }

  /**
   * Euclidean distance between two points {x, y}
   */
  static distance(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.hypot(dx, dy);
  }

  /**
   * Calculate polygon area using Shoelace formula (Gauss's area formula)
   * Points are in grid unit coordinates (e.g. 0 to 4 for 5x5)
   */
  static calculateShoelaceArea(points) {
    const n = points.length;
    if (n < 3) return 0;

    let area2 = 0;
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      area2 += points[i].x * points[next].y - points[next].x * points[i].y;
    }
    return Math.abs(area2) / 2;
  }

  /**
   * Calculate boundary grid points B for integer grid polygon
   */
  static calculateBoundaryPoints(points) {
    const n = points.length;
    if (n < 3) return 0;

    let b = 0;
    for (let i = 0; i < n; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % n];
      const dx = Math.abs(Math.round(p2.x) - Math.round(p1.x));
      const dy = Math.abs(Math.round(p2.y) - Math.round(p1.y));
      b += this.gcd(dx, dy);
    }
    return b;
  }

  /**
   * Calculate interior grid points I using Pick's Theorem: I = Area - B/2 + 1
   */
  static calculateInteriorPointsPicks(area, b) {
    return Math.max(0, Math.round(area - b / 2 + 1));
  }

  /**
   * Directly test if integer point (px, py) is strictly inside a simple polygon
   */
  static isPointInsidePolygon(px, py, points) {
    let inside = false;
    const n = points.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = points[i].x, yi = points[i].y;
      const xj = points[j].x, yj = points[j].y;

      const intersect = ((yi > py) !== (yj > py)) &&
        (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /**
   * Directly test if point lies on any boundary edge segment
   */
  static isPointOnBoundary(px, py, points, eps = 1e-5) {
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % n];
      
      const d1 = Math.hypot(px - p1.x, py - p1.y);
      const d2 = Math.hypot(px - p2.x, py - p2.y);
      const lineLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      if (Math.abs(d1 + d2 - lineLen) < eps) {
        return true;
      }
    }
    return false;
  }

  /**
   * Count interior pegs directly by checking grid points inside bounding box
   */
  static countInteriorPegsDirect(points, gridWidth, gridHeight) {
    if (points.length < 3) return 0;
    
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    points.forEach(p => {
      minX = Math.min(minX, Math.floor(p.x));
      maxX = Math.max(maxX, Math.ceil(p.x));
      minY = Math.min(minY, Math.floor(p.y));
      maxY = Math.max(maxY, Math.ceil(p.y));
    });

    let interiorCount = 0;
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        if (!this.isPointOnBoundary(x, y, points) && this.isPointInsidePolygon(x, y, points)) {
          interiorCount++;
        }
      }
    }
    return interiorCount;
  }

  /**
   * Calculate complete Pick's Theorem Analysis object (supports Polygons, Line Segments, & Polylines)
   */
  static analyzePolygon(points, isIsometric = false, isClosed = true) {
    if (!points || points.length < 2) {
      return {
        isValid: false,
        isLine: false,
        area: 0,
        perimeter: 0,
        boundaryPegs: 0,
        interiorPegs: 0,
        sidesCount: points ? points.length : 0,
        classification: "Incomplete Shape",
        sideLengths: [],
        angles: []
      };
    }

    // 1. Line Segment (2 pegs) or Open Polyline (!isClosed)
    if (points.length === 2 || !isClosed) {
      let totalLength = 0;
      const sideLengths = [];
      let boundaryPegs = 0;

      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const dist = this.distance(p1, p2);
        sideLengths.push(dist);
        totalLength += dist;

        if (!isIsometric) {
          const dx = Math.abs(Math.round(p2.x) - Math.round(p1.x));
          const dy = Math.abs(Math.round(p2.y) - Math.round(p1.y));
          boundaryPegs += this.gcd(dx, dy);
        }
      }
      if (!isIsometric && points.length >= 2) {
        boundaryPegs += 1; // Count starting peg for open line
      }

      // Calculate angles between consecutive line segments
      const angles = [];
      for (let i = 1; i < points.length - 1; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const next = points[i + 1];
        angles.push(this.calculateAngleBetweenThreePoints(prev, curr, next));
      }

      const classification = points.length === 2
        ? "Line Segment"
        : `Open Polyline (${points.length - 1} segments)`;

      return {
        isValid: true,
        isLine: true,
        area: 0,
        triangularUnits: isIsometric ? 0 : null,
        perimeter: parseFloat(totalLength.toFixed(2)),
        boundaryPegs,
        interiorPegs: 0,
        sidesCount: points.length,
        classification,
        sideLengths: sideLengths.map(l => parseFloat(l.toFixed(2))),
        angles: angles.map(a => parseFloat(a.toPrecision(4)))
      };
    }

    // 2. Closed Polygon (3+ pegs)
    const area = this.calculateShoelaceArea(points);
    const boundaryPegs = isIsometric ? 0 : this.calculateBoundaryPoints(points);
    const interiorPegs = isIsometric ? 0 : this.calculateInteriorPointsPicks(area, boundaryPegs);

    // Calculate perimeter & individual side lengths
    const sideLengths = [];
    let perimeter = 0;
    const n = points.length;

    for (let i = 0; i < n; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % n];
      const dist = this.distance(p1, p2);
      sideLengths.push(dist);
      perimeter += dist;
    }

    // Calculate internal angles
    const angles = [];
    for (let i = 0; i < n; i++) {
      const prev = points[(i - 1 + n) % n];
      const curr = points[i];
      const next = points[(i + 1) % n];
      const angle = this.calculateAngleBetweenThreePoints(prev, curr, next);
      angles.push(angle);
    }

    const classification = this.classifyPolygon(points, sideLengths, angles);

    return {
      isValid: true,
      isLine: false,
      area: parseFloat(area.toFixed(2)),
      triangularUnits: isIsometric ? parseFloat((area * 2).toFixed(2)) : null,
      perimeter: parseFloat(perimeter.toFixed(2)),
      boundaryPegs,
      interiorPegs,
      sidesCount: n,
      classification,
      sideLengths: sideLengths.map(l => parseFloat(l.toFixed(2))),
      angles: angles.map(a => parseFloat(a.toPrecision(4)))
    };
  }

  /**
   * Angle in degrees at vertex B given 3 points A -> B -> C
   */
  static calculateAngleBetweenThreePoints(A, B, C) {
    const v1x = A.x - B.x;
    const v1y = A.y - B.y;
    const v2x = C.x - B.x;
    const v2y = C.y - B.y;

    const angle1 = Math.atan2(v1y, v1x);
    const angle2 = Math.atan2(v2y, v2x);

    let diff = angle2 - angle1;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    while (diff > Math.PI) diff -= 2 * Math.PI;

    let deg = Math.abs(diff) * (180 / Math.PI);
    return deg;
  }

  /**
   * Classify geometric shape (Triangle, Quadrilateral, etc.)
   */
  static classifyPolygon(points, sideLengths, angles) {
    const n = points.length;
    if (n === 3) {
      const [a, b, c] = [...sideLengths].sort((x, y) => x - y);
      const isRight = Math.abs(a * a + b * b - c * c) < 0.1;
      const isEquilateral = Math.abs(a - b) < 0.05 && Math.abs(b - c) < 0.05;
      const isIsosceles = Math.abs(a - b) < 0.05 || Math.abs(b - c) < 0.05 || Math.abs(a - c) < 0.05;

      if (isEquilateral) return "Equilateral Triangle";
      if (isRight && isIsosceles) return "Right Isosceles Triangle";
      if (isRight) return "Right Triangle";
      if (isIsosceles) return "Isosceles Triangle";
      return "Scalene Triangle";
    }

    if (n === 4) {
      const [s1, s2, s3, s4] = sideLengths;
      const allSidesEqual = Math.abs(s1 - s2) < 0.05 && Math.abs(s2 - s3) < 0.05 && Math.abs(s3 - s4) < 0.05;
      const allAnglesRight = angles.every(ang => Math.abs(ang - 90) < 1.0);

      if (allSidesEqual && allAnglesRight) return "Square";
      if (allAnglesRight) return "Rectangle";
      if (allSidesEqual) return "Rhombus";

      const oppSidesEqual = Math.abs(s1 - s3) < 0.05 && Math.abs(s2 - s4) < 0.05;
      if (oppSidesEqual) return "Parallelogram";

      return "Quadrilateral";
    }

    if (n === 5) return "Pentagon";
    if (n === 6) return "Hexagon";
    if (n === 8) return "Octagon";

    return `${n}-sided Polygon`;
  }

  /**
   * Calculate complete circle geometry analysis object
   */
  static analyzeCircle(centerPeg, radiusPeg) {
    const r = this.distance(
      { x: centerPeg.gridX, y: centerPeg.gridY },
      { x: radiusPeg.gridX, y: radiusPeg.gridY }
    );
    const d = 2 * r;
    const area = Math.PI * r * r;
    const circumference = 2 * Math.PI * r;

    return {
      isValid: true,
      isCircle: true,
      isLine: false,
      radius: parseFloat(r.toFixed(2)),
      diameter: parseFloat(d.toFixed(2)),
      area: parseFloat(area.toFixed(2)),
      perimeter: parseFloat(circumference.toFixed(2)),
      boundaryPegs: null,
      interiorPegs: null,
      sidesCount: 1,
      classification: `Circle (r = ${r.toFixed(1)} u)`,
      sideLengths: [parseFloat(r.toFixed(2))],
      angles: []
    };
  }
}
