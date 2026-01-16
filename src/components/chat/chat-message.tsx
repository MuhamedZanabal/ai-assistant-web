import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
  createdAt: string;
  isStreaming?: boolean;
}

interface ChatMessageProps {
  message: Message;
}

const roleStyles = {
  system: 'bg-muted/50 text-muted-foreground',
  user: 'bg-primary text-primary-foreground ml-auto',
  assistant: 'bg-muted',
  tool: 'bg-muted/75 border-l-2 border-primary',
};

const roleLabels = {
  system: 'System',
  user: 'You',
  assistant: 'AI Assistant',
  tool: 'Tool',
};

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isTool = message.role === 'tool';

  return (
    <div
      className={cn(
        'flex flex-col max-w-[85%] md:max-w-[75%] rounded-lg px-4 py-2',
        isUser ? 'ml-auto items-end' : 'items-start',
        isTool && 'ml-4'
      )}
    >
      <div
        className={cn(
          'rounded-lg px-4 py-2',
          roleStyles[message.role]
        )}
      >
        {isTool && message.name && (
          <div className="text-xs font-medium mb-1 opacity-75">
            Tool: {message.name}
          </div>
        )}

        <div className="whitespace-pre-wrap break-words">
          {message.content}
        </div>

        {message.isStreaming && (
          <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
        )}
      </div>

      <div className={cn(
        'text-xs text-muted-foreground mt-1',
        isUser ? 'text-right' : 'text-left'
      )}>
        {roleLabels[message.role]}
      </div>
    </div>
  );
}
