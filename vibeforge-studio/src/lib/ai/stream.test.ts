import { describe, it, expect } from "vitest";

describe("streamGenerate", () => {
  it("yields text deltas from SSE frames", async () => {
    const mockResponse = `data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}\n\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":" world"}}\n\n`;
    
    global.fetch = async () => ({
      ok: true,
      body: {
        getReader: () => ({
          read: (() => {
            let done = false;
            return async () => {
              if (done) return { done: true, value: undefined };
              done = true;
              return { done: false, value: new TextEncoder().encode(mockResponse) };
            };
          })()
        })
      }
    }) as Response;
    
    const { streamGenerate } = await import("./stream");
    const chunks: string[] = [];
    for await (const chunk of streamGenerate("test")) {
      chunks.push(chunk);
    }
    
    expect(chunks).toEqual(["Hello", " world"]);
  });
  
  it("handles frames split across chunks", async () => {
    const part1 = `data: {"type":"content_block_delta","delta":{"type":"text_`;
    const part2 = `delta","text":"Split"}}\n\n`;
    
    global.fetch = async () => ({
      ok: true,
      body: {
        getReader: () => {
          let step = 0;
          return {
            read: async () => {
              if (step === 0) { step++; return { done: false, value: new TextEncoder().encode(part1) }; }
              if (step === 1) { step++; return { done: false, value: new TextEncoder().encode(part2) }; }
              return { done: true, value: undefined };
            }
          };
        }
      }
    }) as Response;
    
    const { streamGenerate } = await import("./stream");
    const chunks: string[] = [];
    for await (const chunk of streamGenerate("test")) {
      chunks.push(chunk);
    }
    
    expect(chunks).toEqual(["Split"]);
  });
  
  it("skips non-text-delta events", async () => {
    const mockResponse = `data: {"type":"content_block_start"}\n\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Keep"}}\n\ndata: {"type":"content_block_stop"}\n\n`;
    
    global.fetch = async () => ({
      ok: true,
      body: {
        getReader: () => ({
          read: (() => {
            let done = false;
            return async () => {
              if (done) return { done: true, value: undefined };
              done = true;
              return { done: false, value: new TextEncoder().encode(mockResponse) };
            };
          })()
        })
      }
    }) as Response;
    
    const { streamGenerate } = await import("./stream");
    const chunks: string[] = [];
    for await (const chunk of streamGenerate("test")) {
      chunks.push(chunk);
    }
    
    expect(chunks).toEqual(["Keep"]);
  });
  
  it("throws on non-ok response with proxy status", async () => {
    global.fetch = async () => ({
      ok: false,
      status: 503,
      text: async () => "proxy disarmed"
    }) as Response;
    
    const { streamGenerate } = await import("./stream");
    
    await expect(async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _chunk of streamGenerate("test")) {
        // should not reach here
      }
    }).rejects.toThrow(/proxy 503/);
  });
  
  it("throws if response body is null", async () => {
    global.fetch = async () => ({
      ok: true,
      body: null,
      text: async () => ""
    }) as Response;
    
    const { streamGenerate } = await import("./stream");
    
    await expect(async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _chunk of streamGenerate("test")) {
        // should not reach here
      }
    }).rejects.toThrow(/fail-closed/);
  });
});
