import { describe, it, expect } from "vitest";
import { getGlobalLevelInfo, getModuleRankInfo } from "@/lib/gamification";

describe("getGlobalLevelInfo", () => {
    // Formula: level = floor(0.1 * sqrt(xp))
    // xpForCurrentLevel = (level / 0.1)^2
    // xpForNextLevel = ((level + 1) / 0.1)^2
    // xpRequiredForNextLevel = xpForNextLevel - xpForCurrentLevel
    // progressPercentage = clamp((xpInCurrentLevel / xpRequiredForNextLevel) * 100, 0, 100)

    it("XP=0 → level 0, 0% progress, requires 100 XP to reach level 1", () => {
        const result = getGlobalLevelInfo(0);
        expect(result.level).toBe(0);
        expect(result.currentXp).toBe(0);
        expect(result.xpInCurrentLevel).toBe(0);
        expect(result.xpRequiredForNextLevel).toBe(100);
        expect(result.progressPercentage).toBe(0);
    });

    it("XP=99 → still level 0, 99% progress (one XP short of level 1)", () => {
        const result = getGlobalLevelInfo(99);
        expect(result.level).toBe(0);
        expect(result.currentXp).toBe(99);
        expect(result.xpInCurrentLevel).toBe(99);
        expect(result.xpRequiredForNextLevel).toBe(100);
        expect(result.progressPercentage).toBe(99);
    });

    it("XP=100 → level 1, 0% progress into level 2, requires 300 XP more", () => {
        // xpForCurrentLevel = (1/0.1)^2 = 100
        // xpForNextLevel = (2/0.1)^2 = 400
        // xpRequiredForNextLevel = 400 - 100 = 300
        const result = getGlobalLevelInfo(100);
        expect(result.level).toBe(1);
        expect(result.currentXp).toBe(100);
        expect(result.xpInCurrentLevel).toBe(0);
        expect(result.xpRequiredForNextLevel).toBe(300);
        expect(result.progressPercentage).toBe(0);
    });

    it("XP=400 → level 2, 0% progress into level 3, requires 500 XP more", () => {
        // xpForCurrentLevel = (2/0.1)^2 = 400
        // xpForNextLevel = (3/0.1)^2 = 900
        // xpRequiredForNextLevel = 900 - 400 = 500
        const result = getGlobalLevelInfo(400);
        expect(result.level).toBe(2);
        expect(result.currentXp).toBe(400);
        expect(result.xpInCurrentLevel).toBe(0);
        expect(result.xpRequiredForNextLevel).toBe(500);
        expect(result.progressPercentage).toBe(0);
    });

    it("XP=10000 → level 10, 0% progress into level 11, requires 2100 XP more", () => {
        // xpForCurrentLevel = (10/0.1)^2 = 10000
        // xpForNextLevel = (11/0.1)^2 = 12100
        // xpRequiredForNextLevel = 12100 - 10000 = 2100
        const result = getGlobalLevelInfo(10000);
        expect(result.level).toBe(10);
        expect(result.currentXp).toBe(10000);
        expect(result.xpInCurrentLevel).toBe(0);
        expect(result.xpRequiredForNextLevel).toBe(2100);
        expect(result.progressPercentage).toBe(0);
    });

    it("progress is clamped to 0 — never goes below 0", () => {
        const result = getGlobalLevelInfo(0);
        expect(result.progressPercentage).toBeGreaterThanOrEqual(0);
    });

    it("progress is clamped to 100 — never exceeds 100", () => {
        // XP=99 is 99% — verify upper bound is respected by testing at level boundary
        const result = getGlobalLevelInfo(99);
        expect(result.progressPercentage).toBeLessThanOrEqual(100);
    });

    it("mid-level XP yields correct fractional progress", () => {
        // XP=250 is in level 1 (100..399 range)
        // xpInCurrentLevel = 250 - 100 = 150
        // xpRequiredForNextLevel = 300
        // progress = (150 / 300) * 100 = 50
        const result = getGlobalLevelInfo(250);
        expect(result.level).toBe(1);
        expect(result.xpInCurrentLevel).toBe(150);
        expect(result.xpRequiredForNextLevel).toBe(300);
        expect(result.progressPercentage).toBe(50);
    });

    it("defaults to XP=0 when called with no arguments", () => {
        const result = getGlobalLevelInfo();
        expect(result.level).toBe(0);
        expect(result.currentXp).toBe(0);
    });
});

describe("getModuleRankInfo", () => {
    // RANK_THRESHOLDS (descending by minXp):
    // SS=10000, S=7500, A+=6000, A=5000, A-=4200, B+=3500, B=3000, B-=2600,
    // C+=2200, C=1800, C-=1500, D+=1200, D=900, D-=700, E+=500, E=350,
    // E-=200, F+=100, F=50, F-=0
    // nextRank = RANK_THRESHOLDS[currentIndex - 1] (one step higher in the array = one rank up)

    it("XP=0 → F- rank, next rank is F (minXp=50), 0% progress", () => {
        const result = getModuleRankInfo(0);
        expect(result.rank).toBe("F-");
        expect(result.currentXp).toBe(0);
        expect(result.nextRank).toBe("F");
        expect(result.xpToNextRank).toBe(50);
        expect(result.progressPercentage).toBe(0);
    });

    it("XP=50 → exact F boundary, next rank is F+ (minXp=100), 0% into F range", () => {
        // range = 100 - 50 = 50, gained = 50 - 50 = 0
        const result = getModuleRankInfo(50);
        expect(result.rank).toBe("F");
        expect(result.currentXp).toBe(50);
        expect(result.nextRank).toBe("F+");
        expect(result.xpToNextRank).toBe(50);
        expect(result.progressPercentage).toBe(0);
    });

    it("XP=100 → exact F+ boundary, next rank is E- (minXp=200), 0% into F+ range", () => {
        // range = 200 - 100 = 100, gained = 0
        const result = getModuleRankInfo(100);
        expect(result.rank).toBe("F+");
        expect(result.currentXp).toBe(100);
        expect(result.nextRank).toBe("E-");
        expect(result.xpToNextRank).toBe(100);
        expect(result.progressPercentage).toBe(0);
    });

    it("XP=5500 → A rank, 50% progress toward A+ (minXp=6000)", () => {
        // currentRank = A (minXp=5000), nextRank = A+ (minXp=6000)
        // range = 6000 - 5000 = 1000, gained = 5500 - 5000 = 500
        // progress = (500 / 1000) * 100 = 50
        const result = getModuleRankInfo(5500);
        expect(result.rank).toBe("A");
        expect(result.currentXp).toBe(5500);
        expect(result.nextRank).toBe("A+");
        expect(result.xpToNextRank).toBe(500);
        expect(result.progressPercentage).toBe(50);
    });

    it("XP=10000 → SS rank (top), no nextRank, 100% progress, xpToNextRank=0", () => {
        const result = getModuleRankInfo(10000);
        expect(result.rank).toBe("SS");
        expect(result.currentXp).toBe(10000);
        expect(result.nextRank).toBeUndefined();
        expect(result.xpToNextRank).toBe(0);
        expect(result.progressPercentage).toBe(100);
    });

    it("XP=7500 → exact S boundary, next rank is SS (minXp=10000), 0% into S range", () => {
        // S is at index 1, nextRank = RANK_THRESHOLDS[0] = SS (minXp=10000)
        // range = 10000 - 7500 = 2500, gained = 7500 - 7500 = 0
        const result = getModuleRankInfo(7500);
        expect(result.rank).toBe("S");
        expect(result.nextRank).toBe("SS");
        expect(result.xpToNextRank).toBe(2500);
        expect(result.progressPercentage).toBe(0);
    });

    it("XP=9999 → still S rank, 99.96% progress toward SS", () => {
        // S range: 7500..10000, gained = 9999 - 7500 = 2499, range = 2500
        // progress = (2499 / 2500) * 100 = 99.96
        const result = getModuleRankInfo(9999);
        expect(result.rank).toBe("S");
        expect(result.nextRank).toBe("SS");
        expect(result.xpToNextRank).toBe(1);
        expect(result.progressPercentage).toBeCloseTo(99.96, 1);
    });

    it("defaults to XP=0 when called with no arguments", () => {
        const result = getModuleRankInfo();
        expect(result.rank).toBe("F-");
        expect(result.currentXp).toBe(0);
    });

    it("progressPercentage is clamped to [0, 100]", () => {
        const low = getModuleRankInfo(0);
        const high = getModuleRankInfo(10000);
        expect(low.progressPercentage).toBeGreaterThanOrEqual(0);
        expect(high.progressPercentage).toBeLessThanOrEqual(100);
    });
});
