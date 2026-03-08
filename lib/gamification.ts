/**
 * Gamification Logic
 * 
 * Formulas used:
 * Global Level: Level = floor(0.1 * sqrt(XP)) -> XP = (Level / 0.1)^2
 * This creates a curve where early levels are fast and later ones require significantly more XP.
 */

export const GLOBAL_LEVEL_CONSTANT = 0.1;

export interface LevelInfo {
    level: number;
    currentXp: number;
    xpInCurrentLevel: number;
    xpRequiredForNextLevel: number;
    progressPercentage: number;
}

/**
 * Calculates global level info from total XP
 */
export function getGlobalLevelInfo(totalXp: number = 0): LevelInfo {
    const level = Math.floor(GLOBAL_LEVEL_CONSTANT * Math.sqrt(totalXp));

    // XP required for current level
    const xpForCurrentLevel = Math.pow(level / GLOBAL_LEVEL_CONSTANT, 2);

    // XP required for next level
    const xpForNextLevel = Math.pow((level + 1) / GLOBAL_LEVEL_CONSTANT, 2);

    const xpInCurrentLevel = totalXp - xpForCurrentLevel;
    const xpRequiredForNextLevel = xpForNextLevel - xpForCurrentLevel;
    const progressPercentage = Math.min(100, Math.max(0, (xpInCurrentLevel / xpRequiredForNextLevel) * 100));

    return {
        level,
        currentXp: totalXp,
        xpInCurrentLevel,
        xpRequiredForNextLevel,
        progressPercentage
    };
}

/**
 * Module Ranks (F- to SS)
 * Based on static XP thresholds for the module.
 */
export type ModuleRank = 'F-' | 'F' | 'F+' | 'E-' | 'E' | 'E+' | 'D-' | 'D' | 'D+' | 'C-' | 'C' | 'C+' | 'B-' | 'B' | 'B+' | 'A-' | 'A' | 'A+' | 'S' | 'SS';

const RANK_THRESHOLDS: { rank: ModuleRank; minXp: number }[] = [
    { rank: 'SS', minXp: 10000 },
    { rank: 'S', minXp: 7500 },
    { rank: 'A+', minXp: 6000 },
    { rank: 'A', minXp: 5000 },
    { rank: 'A-', minXp: 4200 },
    { rank: 'B+', minXp: 3500 },
    { rank: 'B', minXp: 3000 },
    { rank: 'B-', minXp: 2600 },
    { rank: 'C+', minXp: 2200 },
    { rank: 'C', minXp: 1800 },
    { rank: 'C-', minXp: 1500 },
    { rank: 'D+', minXp: 1200 },
    { rank: 'D', minXp: 900 },
    { rank: 'D-', minXp: 700 },
    { rank: 'E+', minXp: 500 },
    { rank: 'E', minXp: 350 },
    { rank: 'E-', minXp: 200 },
    { rank: 'F+', minXp: 100 },
    { rank: 'F', minXp: 50 },
    { rank: 'F-', minXp: 0 },
];

export interface RankInfo {
    rank: ModuleRank;
    currentXp: number;
    nextRank?: ModuleRank;
    xpToNextRank?: number;
    progressPercentage: number;
}

/**
 * Calculates module rank info from module XP
 */
export function getModuleRankInfo(moduleXp: number = 0): RankInfo {
    const currentRankIndex = RANK_THRESHOLDS.findIndex(t => moduleXp >= t.minXp);
    const currentRank = RANK_THRESHOLDS[currentRankIndex];

    const nextRank = currentRankIndex > 0 ? RANK_THRESHOLDS[currentRankIndex - 1] : undefined;

    let progressPercentage = 100;
    let xpToNextRank = 0;

    if (nextRank) {
        const range = nextRank.minXp - currentRank.minXp;
        const gainedInRange = moduleXp - currentRank.minXp;
        progressPercentage = Math.min(100, Math.max(0, (gainedInRange / range) * 100));
        xpToNextRank = nextRank.minXp - moduleXp;
    }

    return {
        rank: currentRank.rank,
        currentXp: moduleXp,
        nextRank: nextRank?.rank,
        xpToNextRank,
        progressPercentage
    };
}
