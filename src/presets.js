/**
 * presets.js - Pre-built Geometry Templates & Interactive Math Puzzles
 */

export const PRESETS = [
  {
    id: 'concentric_circle',
    name: 'Unit Circle (R=2)',
    gridType: 'circular',
    colorId: 'pink',
    description: 'A concentric unit circle with radius = 2 units on circular grid.',
    isCircle: true,
    pegs: [
      { gridX: 0, gridY: 0 },
      { gridX: 2, gridY: 0 }
    ]
  },
  {
    id: 'line_segment',
    name: 'Straight Line Segment',
    gridType: 'square5',
    colorId: 'blue',
    description: 'A 2-peg open line segment showcasing perimeter length and boundary pegs.',
    isLine: true,
    pegs: [
      { gridX: 0, gridY: 4 },
      { gridX: 4, gridY: 0 }
    ]
  },
  {
    id: 'unit_square',
    name: 'Unit Square (1×1)',
    gridType: 'square5',
    colorId: 'blue',
    description: 'Basic 1x1 square demonstrating boundary points B=4, interior points I=0.',
    pegs: [
      { gridX: 1, gridY: 1 },
      { gridX: 2, gridY: 1 },
      { gridX: 2, gridY: 2 },
      { gridX: 1, gridY: 2 }
    ]
  },
  {
    id: 'right_triangle_345',
    name: '3-4-5 Right Triangle',
    gridType: 'square5',
    colorId: 'red',
    description: 'Classic Pythagorean right-angled triangle. Area = 6, B=8, I=3.',
    pegs: [
      { gridX: 0, gridY: 0 },
      { gridX: 3, gridY: 0 },
      { gridX: 0, gridY: 4 }
    ]
  },
  {
    id: 'parallelogram',
    name: 'Slanted Parallelogram',
    gridType: 'square5',
    colorId: 'orange',
    description: 'Quad with opposite parallel slanted sides. Explores Pick\'s theorem area.',
    pegs: [
      { gridX: 1, gridY: 0 },
      { gridX: 4, gridY: 0 },
      { gridX: 3, gridY: 3 },
      { gridX: 0, gridY: 3 }
    ]
  },
  {
    id: 'hexagon_iso',
    name: 'Regular Hexagon',
    gridType: 'isometric',
    colorId: 'green',
    description: '6-sided symmetric polygon on triangular grid lattice.',
    pegs: [
      { gridX: 2, gridY: 1 },
      { gridX: 4, gridY: 1 },
      { gridX: 5.5, gridY: 3 },
      { gridX: 4, gridY: 5 },
      { gridX: 2, gridY: 5 },
      { gridX: 0.5, gridY: 3 }
    ]
  },
  {
    id: 'star_polygon',
    name: 'Geoboard 4-Point Star',
    gridType: 'square5',
    colorId: 'pink',
    description: 'Non-convex 8-vertex star polygon showcasing Pick\'s Theorem on complex shapes.',
    pegs: [
      { gridX: 2, gridY: 0 },
      { gridX: 2.5, gridY: 1.5 },
      { gridX: 4, gridY: 2 },
      { gridX: 2.5, gridY: 2.5 },
      { gridX: 2, gridY: 4 },
      { gridX: 1.5, gridY: 2.5 },
      { gridX: 0, gridY: 2 },
      { gridX: 1.5, gridY: 1.5 }
    ]
  }
];

export const PUZZLES = [
  {
    title: "Pick's Challenge: Area = 5",
    description: "Construct any polygon on the 5x5 grid with an exact Pick's Area of 5.0 square units.",
    targetArea: 5.0
  },
  {
    title: "Right Angle Hunt",
    description: "Construct a triangle with side lengths 3, 4, and 5, then measure its 90° angle using the Protractor tool.",
    targetAngles: [90]
  },
  {
    title: "Maximum Area Challenge",
    description: "What is the largest possible polygon area you can build on the 5x5 geoboard without self-intersecting?",
    targetArea: 16.0
  }
];
