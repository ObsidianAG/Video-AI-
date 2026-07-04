import { create } from "zustand";
export const useStudioStore = create((set, get) => ({
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
        const snapshot = {
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
        if (!snapshot)
            return;
        const newSnapshot = {
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
