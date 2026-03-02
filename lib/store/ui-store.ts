import { create } from 'zustand';

interface UIState {
    isFullscreen: boolean;
    setIsFullscreen: (value: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
    isFullscreen: false,
    setIsFullscreen: (value) => set({ isFullscreen: value }),
}));
