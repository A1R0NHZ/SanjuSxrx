import katex from "katex";
import "katex/dist/katex.min.css";

function render(tex: string, displayMode: boolean) {
  return {
    __html: katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      output: "html",
    }),
  };
}

export function M({ children }: { children: string }) {
  return <span dangerouslySetInnerHTML={render(children, false)} />;
}

export function MB({ children }: { children: string }) {
  return (
    <div className="my-3 px-4 py-3 bg-black/40 border border-reactor-line rounded-sm overflow-x-auto">
      <span dangerouslySetInnerHTML={render(children, true)} />
    </div>
  );
}
