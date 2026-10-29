import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// react-markdown ignores raw HTML by default, so article bodies can't inject scripts.
// An image followed by an italic line (as inserted by the editor's image picker) renders as a photo with a credit caption.
export function Markdown({ children }: { children: string }) {
  return (
    <div
      className={[
        "prose prose-invert prose-neutral max-w-none prose-headings:tracking-tight prose-a:text-emerald-400",
        "[&_p:has(>img)]:text-center [&_p:has(>img)_em]:block [&_p:has(>img)_em]:text-xs [&_p:has(>img)_em]:text-neutral-500",
        "[&_p:has(>img)_em_a]:text-neutral-400",
      ].join(" ")}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- alt comes from the Markdown
          // Capped in height and centred: portrait photos would otherwise be huge at full width.
          img: ({ node: _node, className: _className, ...props }) => (
            <img {...props} loading="lazy" className="mx-auto mb-2 max-h-[480px] w-auto max-w-full rounded-xl" />
          ),
          a: ({ node: _node, ...props }) => <a {...props} target={props.href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
