type CodeBlockProps = {
  code: string;
  label?: string;
};

export function CodeBlock({ code, label }: CodeBlockProps) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/80">
      {label ? (
        <div className="border-b border-white/10 px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-slate-500">
          {label}
        </div>
      ) : null}
      <pre className="overflow-x-auto p-5 text-sm leading-7 text-slate-300">
        <code>{code}</code>
      </pre>
    </div>
  );
}
