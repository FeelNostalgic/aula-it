import { describe, it, expect } from "vitest";
import { animationRegistry, arpSteps } from "@/lib/animations/registry";

describe("animationRegistry", () => {
    it("is an array with at least one entry", () => {
        expect(Array.isArray(animationRegistry)).toBe(true);
        expect(animationRegistry.length).toBeGreaterThanOrEqual(1);
    });

    it("every entry has required AnimationMeta fields with correct types", () => {
        for (const entry of animationRegistry) {
            expect(typeof entry.slug).toBe("string");
            expect(typeof entry.title).toBe("string");
            expect(typeof entry.description).toBe("string");
            expect(typeof entry.topic).toBe("string");
            expect(Array.isArray(entry.steps)).toBe(true);
            expect(entry.slug.length).toBeGreaterThan(0);
            expect(entry.title.length).toBeGreaterThan(0);
            expect(entry.description.length).toBeGreaterThan(0);
            expect(entry.topic.length).toBeGreaterThan(0);
        }
    });

    it("all slugs are unique across the registry", () => {
        const slugs = animationRegistry.map((e) => e.slug);
        const uniqueSlugs = new Set(slugs);
        expect(uniqueSlugs.size).toBe(slugs.length);
    });

    it("all slugs match alphanumeric-and-hyphens format", () => {
        const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
        for (const entry of animationRegistry) {
            expect(entry.slug).toMatch(slugPattern);
        }
    });

    it("contains the 'arp' entry with correct slug and topic", () => {
        const arpEntry = animationRegistry.find((e) => e.slug === "arp");
        expect(arpEntry).toBeDefined();
        expect(arpEntry!.slug).toBe("arp");
        expect(arpEntry!.topic).toBe("Redes");
    });

    it("every entry's steps array contains objects with id, label, description", () => {
        for (const entry of animationRegistry) {
            expect(entry.steps.length).toBeGreaterThan(0);
            for (const step of entry.steps) {
                expect(typeof step.id).toBe("string");
                expect(typeof step.label).toBe("string");
                expect(typeof step.description).toBe("string");
                expect(step.id.length).toBeGreaterThan(0);
                expect(step.label.length).toBeGreaterThan(0);
                expect(step.description.length).toBeGreaterThan(0);
            }
        }
    });
});

describe("arpSteps", () => {
    it("is an array with exactly 5 entries", () => {
        expect(Array.isArray(arpSteps)).toBe(true);
        expect(arpSteps).toHaveLength(5);
    });

    it("each entry has id, label, and description fields", () => {
        for (const step of arpSteps) {
            expect(typeof step.id).toBe("string");
            expect(typeof step.label).toBe("string");
            expect(typeof step.description).toBe("string");
        }
    });

    it("all ids are unique", () => {
        const ids = arpSteps.map((s) => s.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
    });

    it("first id is 'step-1' and last id is 'step-5'", () => {
        expect(arpSteps[0].id).toBe("step-1");
        expect(arpSteps[4].id).toBe("step-5");
    });

    it("ids follow sequential step-N pattern from step-1 to step-5", () => {
        const expectedIds = ["step-1", "step-2", "step-3", "step-4", "step-5"];
        const actualIds = arpSteps.map((s) => s.id);
        expect(actualIds).toEqual(expectedIds);
    });

    it("all labels are non-empty strings", () => {
        for (const step of arpSteps) {
            expect(step.label.trim().length).toBeGreaterThan(0);
        }
    });

    it("all descriptions are non-empty strings", () => {
        for (const step of arpSteps) {
            expect(step.description.trim().length).toBeGreaterThan(0);
        }
    });
});
