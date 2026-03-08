import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
    it("merges multiple class strings correctly", () => {
        expect(cn("px-2", "py-1")).toBe("px-2 py-1");
    });

    it("resolves Tailwind conflicts — last value wins (px-4 overrides px-2)", () => {
        expect(cn("px-2", "px-4")).toBe("px-4");
    });

    it("returns an empty string when called with no arguments", () => {
        expect(cn()).toBe("");
    });
});
