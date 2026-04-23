/**
 * UI State Management (Zustand)
 *
 * Global UI state that doesn't belong in the backend.
 * This includes selection state, drag state, sidebar state, etc.
 *
 * Backend remains the source of truth for itinerary data.
 * This store only manages ephemeral UI interactions.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface UIState {
  // =====================================================
  // SELECTION STATE
  // =====================================================

  /** Currently selected day number (1-indexed) */
  selectedDay: number | null;

  /** Currently selected activity ID */
  selectedActivity: string | null;

  // =====================================================
  // DRAG STATE
  // =====================================================

  /** Whether user is currently dragging an activity */
  isDragging: boolean;

  /** ID of the activity being dragged */
  draggedActivityId: string | null;

  /** Source day index when dragging starts */
  dragSourceDay: number | null;

  // =====================================================
  // SIDEBAR STATE
  // =====================================================

  /** Whether the CopilotKit sidebar is open */
  sidebarOpen: boolean;

  /** Active tab in the sidebar */
  activeTab: 'chat' | 'suggestions' | 'history';

  // =====================================================
  // ACTIONS
  // =====================================================

  setSelectedDay: (day: number | null) => void;
  setSelectedActivity: (activityId: string | null) => void;
  clearSelection: () => void;

  startDrag: (activityId: string, fromDay?: number) => void;
  endDrag: () => void;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveTab: (tab: 'chat' | 'suggestions' | 'history') => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        // =====================================================
        // INITIAL STATE
        // =====================================================

        selectedDay: null,
        selectedActivity: null,

        isDragging: false,
        draggedActivityId: null,
        dragSourceDay: null,

        sidebarOpen: true,
        activeTab: 'chat',

        // =====================================================
        // SELECTION ACTIONS
        // =====================================================

        setSelectedDay: (day) => set({ selectedDay: day }),

        setSelectedActivity: (activityId) => set({ selectedActivity: activityId }),

        clearSelection: () => set({
          selectedDay: null,
          selectedActivity: null,
        }),

        // =====================================================
        // DRAG ACTIONS
        // =====================================================

        startDrag: (activityId, fromDay) => set({
          isDragging: true,
          draggedActivityId: activityId,
          dragSourceDay: fromDay || null,
        }),

        endDrag: () => set({
          isDragging: false,
          draggedActivityId: null,
          dragSourceDay: null,
        }),

        // =====================================================
        // SIDEBAR ACTIONS
        // =====================================================

        toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

        setSidebarOpen: (open) => set({ sidebarOpen: open }),

        setActiveTab: (tab) => set({ activeTab: tab }),
      }),
      {
        name: 'rategen-ui-store',
        // Only persist these fields
        partialize: (state) => ({
          sidebarOpen: state.sidebarOpen,
          activeTab: state.activeTab,
        }),
      }
    ),
    { name: 'UIStore' }
  )
);
