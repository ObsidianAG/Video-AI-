import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStudioStore } from "./studio";
beforeEach(() => {
    const { getState } = useStudioStore;
    act(() => {
        getState().setCode("");
        getState().setPrompt("");
        getState().setMode("LIVE");
        getState().setRunState("idle");
        useStudioStore.setState({ history: [], pendingDiff: null });
    });
});
describe("useStudioStore", () => {
    it("initializes with empty state", () => {
        const { result } = renderHook(() => useStudioStore());
        expect(result.current.code).toBe("");
        expect(result.current.prompt).toBe("");
        expect(result.current.mode).toBe("LIVE");
        expect(result.current.runState).toBe("idle");
        expect(result.current.history).toEqual([]);
    });
    it("setPrompt updates prompt", () => {
        const { result } = renderHook(() => useStudioStore());
        act(() => {
            result.current.setPrompt("new prompt");
        });
        expect(result.current.prompt).toBe("new prompt");
    });
    it("setCode updates code", () => {
        const { result } = renderHook(() => useStudioStore());
        act(() => {
            result.current.setCode("<html></html>");
        });
        expect(result.current.code).toBe("<html></html>");
    });
    it("setMode updates mode", () => {
        const { result } = renderHook(() => useStudioStore());
        act(() => {
            result.current.setMode("DEMO");
        });
        expect(result.current.mode).toBe("DEMO");
    });
    it("commitSnapshot appends to history", () => {
        const { result } = renderHook(() => useStudioStore());
        act(() => {
            result.current.commitSnapshot("code1", "prompt1");
        });
        expect(result.current.history).toHaveLength(1);
        expect(result.current.history[0]?.code).toBe("code1");
        expect(result.current.history[0]?.prompt).toBe("prompt1");
    });
    it("commitSnapshot does not mutate prior entries", () => {
        const { result } = renderHook(() => useStudioStore());
        act(() => {
            result.current.commitSnapshot("code1", "prompt1");
        });
        const firstSnapshot = result.current.history[0];
        act(() => {
            result.current.commitSnapshot("code2", "prompt2");
        });
        expect(result.current.history).toHaveLength(2);
        expect(result.current.history[0]).toBe(firstSnapshot);
    });
    it("forkFromSnapshot sets code and appends new snapshot", () => {
        const { result } = renderHook(() => useStudioStore());
        act(() => {
            result.current.commitSnapshot("original", "prompt");
        });
        const snapshotId = result.current.history[0].id;
        act(() => {
            result.current.setCode("different");
            result.current.forkFromSnapshot(snapshotId);
        });
        expect(result.current.code).toBe("original");
        expect(result.current.history).toHaveLength(2);
    });
    it("forkFromSnapshot does not mutate prior snapshots", () => {
        const { result } = renderHook(() => useStudioStore());
        act(() => {
            result.current.commitSnapshot("snap1", "p1");
            result.current.commitSnapshot("snap2", "p2");
        });
        const snap1 = result.current.history[0];
        const snap2 = result.current.history[1];
        const snap1Id = snap1.id;
        act(() => {
            result.current.forkFromSnapshot(snap1Id);
        });
        expect(result.current.history[0]).toBe(snap1);
        expect(result.current.history[1]).toBe(snap2);
        expect(result.current.history).toHaveLength(3);
    });
    it("setPendingDiff sets diff", () => {
        const { result } = renderHook(() => useStudioStore());
        act(() => {
            result.current.setPendingDiff({ before: "old", after: "new" });
        });
        expect(result.current.pendingDiff).toEqual({ before: "old", after: "new" });
    });
    it("applyDiff replaces code and clears diff", () => {
        const { result } = renderHook(() => useStudioStore());
        act(() => {
            result.current.setCode("old");
            result.current.setPendingDiff({ before: "old", after: "new" });
            result.current.applyDiff();
        });
        expect(result.current.code).toBe("new");
        expect(result.current.pendingDiff).toBeNull();
    });
    it("discardDiff clears diff without changing code", () => {
        const { result } = renderHook(() => useStudioStore());
        act(() => {
            result.current.setCode("current");
            result.current.setPendingDiff({ before: "current", after: "new" });
            result.current.discardDiff();
        });
        expect(result.current.code).toBe("current");
        expect(result.current.pendingDiff).toBeNull();
    });
    it("mode can be toggled from DEMO to LIVE", () => {
        const { result } = renderHook(() => useStudioStore());
        act(() => {
            result.current.setMode("DEMO");
        });
        expect(result.current.mode).toBe("DEMO");
        act(() => {
            result.current.setMode("LIVE");
        });
        expect(result.current.mode).toBe("LIVE");
    });
});
