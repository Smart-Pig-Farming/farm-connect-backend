export interface LevelInfo {
  level: number;
  label: string;
  nextLevelAt: number | null;
  pointsIntoLevel: number;
  pointsForLevel: number;
}

const LEVELS = [
  { level: 1, label: "Newcomer", min: 0, max: 20 },
  { level: 2, label: "Amateur", min: 21, max: 149 },
  { level: 3, label: "Contributor", min: 150, max: 299 },
  { level: 4, label: "Knight", min: 300, max: 599 },
  { level: 5, label: "Expert", min: 600, max: Infinity },
];

export function mapPointsToLevel(totalPoints: number): LevelInfo {
  // Clamp negatives so they don't fall through and incorrectly map to highest level.
  const effectivePoints = totalPoints < 0 ? 0 : totalPoints;

  const lvl =
    LEVELS.find((l) => effectivePoints >= l.min && effectivePoints <= l.max) ||
    LEVELS[LEVELS.length - 1];

  const next = LEVELS.find((l) => l.level === lvl.level + 1);
  const spanMin = lvl.min;
  const spanMax = lvl.max === Infinity ? effectivePoints : lvl.max;
  const pointsIntoLevel = Math.max(effectivePoints - spanMin, 0);
  const pointsForLevel =
    spanMax === Infinity ? pointsIntoLevel : spanMax - spanMin + 1;
  return {
    level: lvl.level,
    label: lvl.label,
    nextLevelAt: next ? next.min : null,
    pointsIntoLevel,
    pointsForLevel,
  };
}
