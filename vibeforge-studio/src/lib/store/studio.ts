import { create } from "zustand";

export type StudioMode = "LIVE" | "DEMO";
export type RunState = "idle" | "streaming" | "error";

export interface Snapshot {
  id: string;
  code: string;
  prompt: string;
  timestamp: number;
}

interface StudioStore {
  code: string;
  prompt: string;
  mode: StudioMode;
  runState: RunState;
  history: Snapshot[];
  pendingDiff: { before: string; after: string } | null;
  
  setPrompt: (p: string) => void;
  setCode: (c: string) => void;
  setMode: (m: StudioMode) => void;
  setRunState: (s: RunState) => void;
  commitSnapshot: (code: string, prompt: string) => void;
  forkFromSnapshot: (id: string) => void;
  setPendingDiff: (diff: { before: string; after: string } | null) => void;
  applyDiff: () => void;
  discardDiff: () => void;
}

export const useStudioStore = create<StudioStore>((set, get) => ({
  code: "",
  prompt: "",
  mode: "LIVE",
  runState: "idle",
  history: [],
  pendingDiff: null,
  
  setPrompt: (prompt) => set({ prompt }),
  setCode: (code) => set({ code }),
  setMode: (mode) => set({ mode }),
  setRunState: (runState) => set({ runState }),
  
  commitSnapshot: (code, prompt) => {
    const snapshot: Snapshot = {
      id: Date.now().toString(),
      code,
      prompt,
      timestamp: Date.now()
    };
    set((state) => ({ history: [...state.history, snapshot] }));
  },
  
  forkFromSnapshot: (id) => {
    const state = get();
    const snapshot = state.history.find((s) => s.id === id);
    if (!snapshot) return;
    
    const newSnapshot: Snapshot = {
      id: Date.now().toString(),
      code: snapshot.code,
      prompt: snapshot.prompt,
      timestamp: Date.now()
    };
    
    set({
      code: snapshot.code,
      history: [...state.history, newSnapshot]
    });
  },
  
  setPendingDiff: (pendingDiff) => set({ pendingDiff }),
  
  applyDiff: () => {
    const { pendingDiff } = get();
    if (pendingDiff) {
      set({ code: pendingDiff.after, pendingDiff: null });
    }
  },
  
  discardDiff: () => set({ pendingDiff: null }),
}));
