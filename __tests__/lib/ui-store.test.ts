import { describe, it, expect, beforeEach } from "vitest";
import { useUIStore } from "@/lib/store/ui-store";

// Reset store to initial state before each test so tests are fully isolated.
beforeEach(() => {
    useUIStore.setState({ isFullscreen: false });
});

describe("useUIStore", () => {
    it("has isFullscreen set to false in the initial state", () => {
        const { isFullscreen } = useUIStore.getState();
        expect(isFullscreen).toBe(false);
    });

    it("setIsFullscreen(true) updates isFullscreen to true", () => {
        useUIStore.getState().setIsFullscreen(true);
        expect(useUIStore.getState().isFullscreen).toBe(true);
    });

    it("setIsFullscreen(false) resets isFullscreen back to false", () => {
        useUIStore.setState({ isFullscreen: true });
        useUIStore.getState().setIsFullscreen(false);
        expect(useUIStore.getState().isFullscreen).toBe(false);
    });
});
