import { useEffect, useRef, useState } from 'react';
import { Send, WarningCircle } from 'iconoir-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useDeepResearchStore } from '@/stores/useDeepResearchStore';
import type { ChatMessage } from '@/lib/deepResearch/types';

const SUGGESTIONS = [
  'Find 25 US companies hiring SDRs right now',
  'Find seed-stage fintech founders in London',
  'Find open data engineering roles at Series A startups',
];

const ChatBubble = ({ message }: { message: ChatMessage }) => {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-xl border px-4 py-3 ${
          isUser ? 'border-primary/30 bg-primary/[0.08]' : 'border-border bg-card'
        }`}
      >
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
          {isUser ? 'You' : 'Orchestrator'}
        </p>
        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
      </div>
    </div>
  );
};

export const ClarifyChat = () => {
  const messages = useDeepResearchStore((s) => s.messages);
  const isSendingChat = useDeepResearchStore((s) => s.isSendingChat);
  const error = useDeepResearchStore((s) => s.error);
  const sendClarificationMessage = useDeepResearchStore((s) => s.sendClarificationMessage);
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [messages.length, isSendingChat, error]);

  const send = async () => {
    const content = draft.trim();
    if (!content || isSendingChat) return;
    setDraft('');
    await sendClarificationMessage(content);
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="mx-auto mt-12 w-full max-w-4xl">
      {isEmpty ? (
        <div className="rounded-xl border border-border bg-card/60 p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {'// describe the table you want'}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            The Orchestrator will ask a few questions, then propose an editable Output Schema.
            Once you approve it, Search Sub-Agents research each Research Source in parallel and
            the Table Builder deduplicates the Records.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setDraft(suggestion)}
                className="rounded-full border border-border px-3 py-1.5 text-left font-mono text-[10px] text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="max-h-[46vh] overflow-y-auto rounded-xl border border-border bg-background/40 p-4">
          <div className="flex flex-col gap-4">
            {messages.map((message, index) => (
              <ChatBubble key={index} message={message} />
            ))}
            {isSendingChat && (
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                The Orchestrator is thinking…
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/[0.06] px-3 py-2.5">
          <WarningCircle className="mt-0.5 shrink-0 text-[14px] text-destructive" />
          <p className="text-xs leading-relaxed text-muted-foreground">{error}</p>
        </div>
      )}

      <div className="mt-4 flex items-end gap-3 rounded-xl border border-border bg-card p-3 transition-colors focus-within:border-primary/60">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder={
            isEmpty
              ? 'Describe what you want to find — companies, people, job posts, anything…'
              : 'Answer the Orchestrator or refine your goal…'
          }
          rows={2}
          disabled={isSendingChat}
          className="min-h-0 flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <Button
          onClick={() => void send()}
          disabled={isSendingChat || !draft.trim()}
          className="h-10 shrink-0 gap-2 rounded-md border border-primary bg-primary font-mono text-[10px] uppercase tracking-[0.14em] text-primary-foreground hover:border-primary-glow hover:bg-primary-glow"
        >
          <Send className="text-[14px]" />
          Send
        </Button>
      </div>
      <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60">
        Enter to send · Shift + Enter for a new line
      </p>
    </div>
  );
};
