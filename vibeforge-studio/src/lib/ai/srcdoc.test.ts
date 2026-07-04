import { describe, it, expect } from "vitest";
import { buildSrcDoc } from "./srcdoc";

describe("buildSrcDoc", () => {
  it("injects bridge before </head> when present", () => {
    const code = "<html><head><title>Test</title></head><body></body></html>";
    const nonce = "test123";
    const result = buildSrcDoc(code, nonce);
    
    expect(result).toContain("<script>");
    expect(result).toContain(`vf:"${nonce}"`);
    expect(result).toContain("</head>");
    expect(result.indexOf("<script>")).toBeLessThan(result.indexOf("</head>"));
  });
  
  it("prepends bridge when no </head> tag exists", () => {
    const code = "<html><body>Hello</body></html>";
    const nonce = "test456";
    const result = buildSrcDoc(code, nonce);
    
    expect(result).toContain("<script>");
    expect(result).toContain(`vf:"${nonce}"`);
    expect(result.indexOf("<script>")).toBe(0);
  });
  
  it("includes nonce in bridge exactly once", () => {
    const code = "<html><head></head><body></body></html>";
    const nonce = "unique789";
    const result = buildSrcDoc(code, nonce);
    
    const matches = result.match(new RegExp(nonce, "g"));
    expect(matches).toHaveLength(1);
  });
  
  it("bridge sets up console intercept", () => {
    const code = "<html><head></head></html>";
    const result = buildSrcDoc(code, "n");
    
    expect(result).toContain('["log","warn","error"]');
    expect(result).toContain("console[k]");
  });
  
  it("bridge sets up window.onerror handler", () => {
    const code = "<html><head></head></html>";
    const result = buildSrcDoc(code, "n");
    
    expect(result).toContain("window.onerror");
  });
  
  it("never includes allow-same-origin string", () => {
    const code = "<html><head></head></html>";
    const result = buildSrcDoc(code, "test");
    
    expect(result).not.toContain("allow-same-origin");
  });
});
