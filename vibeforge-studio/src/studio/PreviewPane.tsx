import { buildSrcDoc } from "../lib/ai/srcdoc";

export function PreviewPane({ code, nonce }: { code: string; nonce: string }) {
  return (
    <iframe
      title="preview"
      sandbox="allow-scripts"
      srcDoc={buildSrcDoc(code, nonce)}
      className="h-full w-full rounded-[16px] border border-[var(--line)] bg-white"
    />
  );
}
