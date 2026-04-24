import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage as ChatMessageType } from '../context/AppContext';

interface Props {
  message: ChatMessageType;
}

export function ChatMessage({ message }: Props) {
  if (message.role === 'user') {
    return (
      <div className="max-w-[90%] self-end px-3 py-2 rounded-xl rounded-br-sm bg-emerald-600 text-white text-[13px] leading-relaxed shadow-sm">
        {message.content}
        {message.hasPII && (
          <span className="ml-1.5 text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded font-medium">
            PII
          </span>
        )}
      </div>
    );
  }

  if (message.role === 'system') {
    return (
      <div className="self-center px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/10 text-slate-400 text-[11px] chat-markdown">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {message.content}
        </ReactMarkdown>
      </div>
    );
  }

  // assistant
  return (
    <div className="max-w-[92%] self-start px-3 py-2 rounded-xl rounded-bl-sm bg-surface-elevated border border-slate-700/50 text-slate-200 text-[13px] leading-relaxed chat-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {message.content}
      </ReactMarkdown>
    </div>
  );
}
