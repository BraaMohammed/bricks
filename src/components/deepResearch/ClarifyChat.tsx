import { useEffect, useRef, useState } from 'react';
import { Send, WarningCircle } from 'iconoir-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ResearchModelSelector } from '@/components/deepResearch/ResearchModelSelector';
import { OutputSchemaEditor } from '@/components/deepResearch/OutputSchemaEditor';
import { useDeepResearchStore } from '@/stores/useDeepResearchStore';
import type { ChatMessage } from '@/lib/deepResearch/types';

const SUGGESTIONS = [
  'Find 25 US companies hiring SDRs right now',
  'Find seed-stage fintech founders in London',
  'Find open data engineering roles at Series A startups',
];

const ChatBubble = ({
  message,
  streaming,
}: {
  message: ChatMessage;
  streaming?: boolean;
}) => {
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
        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">
          {message.content}
          {streaming && (
            <span className="ml-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary align-middle" />
          )}
        </p>
      </div>
    </div>
  );
};

interface ClarifyChatProps {
  onApproveAndStart: () => void;
}

export const ClarifyChat = ({ onApproveAndStart }: ClarifyChatProps) => {
  const messages = useDeepResearchStore((s) => s.messages);
  const isSendingChat = useDeepResearchStore((s) => s.isSendingChat);
  const error = useDeepResearchStore((s) => s.error);
  const outputSchema = useDeepResearchStore((s) => s.outputSchema);
  const sendClarificationMessage = useDeepResearchStore((s) => s.sendClarificationMessage);
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const lastMessageContent = messages[messages.length - 1]?.content;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [messages.length, lastMessageContent, isSendingChat, error, outputSchema]);

  const send = async () => {
    const content = draft.trim();
    if (!content || isSendingChat) return;
    setDraft('');
    await sendClarificationMessage(content);
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-4 pt-6">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <p className="text-center text-sm text-muted-foreground">
              Describe the table you want — the Orchestrator will propose an editable schema.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
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
          <div className="flex flex-col gap-4">
            {messages.map((message, index) => (
              <ChatBubble
                key={index}
                message={message}
                streaming={
                  isSendingChat &&
                  index === messages.length - 1 &&
                  message.role === 'assistant'
                }
              />
            ))}
            {isSendingChat && (
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                The Orchestrator is thinking…
              </div>
            )}
          </div>
        )}

        {outputSchema && (
          <div className="mt-4">
            <OutputSchemaEditor onApproveAndStart={onApproveAndStart} />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="flex items-center gap-1.5 font-mono text-[10px] leading-snug text-destructive">
          <WarningCircle className="shrink-0 text-[12px]" />
          {error}
        </p>
      )}

      <div className="mt-2 rounded-xl border border-border bg-card p-2.5 transition-colors focus-within:border-primary/60">
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
          className="min-h-0 w-full resize-none border-0 bg-transparent px-2 py-1.5 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <div className="mt-1 flex items-center justify-between gap-2">
          <ResearchModelSelector variant="composer" />
          <Button
            onClick={() => void send()}
            disabled={isSendingChat || !draft.trim()}
            className="h-9 shrink-0 gap-2 rounded-md border border-primary bg-primary font-mono text-[10px] uppercase tracking-[0.14em] text-primary-foreground hover:border-primary-glow hover:bg-primary-glow"
          >
            <Send className="text-[14px]" />
            Send
          </Button>
        </div>
      </div>
      <p className="mt-1.5 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60">
        Enter to send · Shift + Enter for a new line
      </p>
    </div>
  );
};
