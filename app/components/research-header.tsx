export type ResearchHeaderProps = {
  title?: string;
  description?: string;
};

export default function ResearchHeader({
  title = "Automated Market Research Team",
  description =
    "Multi-agent competitor research using the OpenAI Agents SDK. Choose a process mode, watch each agent’s progress, and get a final memo.",
}: ResearchHeaderProps) {
  return (
    <header className="shrink-0">
      <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800/70 bg-zinc-950/25 px-3 py-1 text-[11px] font-medium text-zinc-300 shadow-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80 shadow-[0_0_0_4px_rgba(52,211,153,0.12)]" />
        Research workspace
      </div>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
        <span className="bg-gradient-to-b from-zinc-50 to-zinc-300 bg-clip-text text-transparent">
          {title}
        </span>
      </h1>
      <p className="mt-2 w-full text-sm leading-relaxed text-zinc-400">{description}</p>
    </header>
  );
}
