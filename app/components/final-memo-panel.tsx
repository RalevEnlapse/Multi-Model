import MarkdownMemo from "./markdown-memo";

import { Badge, Card, CardBody, CardHeader, CardMeta, CardTitle } from "../../lib/ui/primitives";

export type FinalMemoPanelProps = {
  finalMarkdown: string;
};

export default function FinalMemoPanel({ finalMarkdown }: FinalMemoPanelProps) {
  return (
    <Card className="flex min-h-0 flex-col overflow-hidden lg:col-span-7" variant="default">
      <CardBody className="flex min-h-0 flex-col">
        <CardHeader className="shrink-0">
          <div className="min-w-0">
            <CardTitle>Final memo</CardTitle>
            <CardMeta className="mt-1 block">Markdown output (copy/paste ready).</CardMeta>
          </div>
          <Badge tone={finalMarkdown ? "green" : "zinc"}>{finalMarkdown ? "ready" : "pending"}</Badge>
        </CardHeader>

        <div className="mt-4 flex-1 min-h-0 overflow-hidden rounded-xl border border-zinc-800/70 bg-zinc-950/35">
          <div className="output-scroll h-full overflow-auto p-4 sm:p-6">
            <div className="prose prose-invert prose-zinc max-w-none markdown-output">
              {finalMarkdown ? (
                <MarkdownMemo markdown={finalMarkdown} />
              ) : (
                <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/20 p-4">
                  <div className="text-sm font-medium text-zinc-200">Memo pending</div>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                    The final memo will appear here once the agents finish.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
