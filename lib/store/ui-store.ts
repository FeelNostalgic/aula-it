import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
    isFullscreen: boolean;
    setIsFullscreen: (value: boolean) => void;
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
}

export const useUIStore = create<UIState>()(
    persist(
        (set) => ({
            isFullscreen: false,
            setIsFullscreen: (value) => set({ isFullscreen: value }),
            isSidebarOpen: true, // Default open
            toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
        }),
        {
            name: 'aula-ui-store',
            partialize: (state) => ({ isSidebarOpen: state.isSidebarOpen }), // Only persist this
        }
    )
);
