// Geometry for the three-axis "Global performance" radar in the correction
// modal's Overview tab. Shared with the landing page's Assessed preview so
// both draw the identical shape from the same constants.
export const RADAR_CENTER = 100;
export const RADAR_RADIUS = 70;
export const RADAR_ANGLES = [-90, 30, 150];
export const RADAR_AXIS_COLORS = ["#7c3aed", "#0284c7", "#c026d3"];

export function getRadarPoint(score: number, index: number) {
  const angle = (RADAR_ANGLES[index] * Math.PI) / 180;
  const radius = (Math.max(0, Math.min(100, score)) / 100) * RADAR_RADIUS;
  return {
    x: RADAR_CENTER + Math.cos(angle) * radius,
    y: RADAR_CENTER + Math.sin(angle) * radius,
  };
}

export function getRadarPolygon(scores: number[]) {
  return scores
    .map((score, index) => {
      const point = getRadarPoint(score, index);
      return `${point.x},${point.y}`;
    })
    .join(" ");
}
