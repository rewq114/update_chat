import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { ChatMessage } from '../../types/chat'
import { formatRelativeTime } from '../../utils/timeUtils'

interface MessageBubbleProps {
  message: ChatMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps): React.JSX.Element {
  const isUser = message.role === 'user';
  const relativeTime = formatRelativeTime(message.time);

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(message.content);
    } catch (error) {
      console.error('메시지 복사 실패:', error);
    }
  };

  const shouldRenderMarkdown = (content: string): boolean => {
    return content.includes('```') || 
           content.includes('**') || 
           content.includes('*') || 
           content.includes('#') || 
           content.includes('[') ||
           content.includes('`');
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-3xl rounded-2xl px-4 py-3 shadow-sm ${
        isUser 
          ? 'bg-accent-primary text-white rounded-br-md' 
          : 'bg-bg-secondary text-text-primary rounded-bl-md border border-border-primary'
      }`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {shouldRenderMarkdown(message.content) ? (
              <div className="markdown-content">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    code: ({ node, inline, className, children, ...props }: any) => {
                      return !inline ? (
                        <pre className="bg-bg-tertiary rounded-md p-3 overflow-x-auto">
                          <code className={className} {...props}>
                            {children}
                          </code>
                        </pre>
                      ) : (
                        <code className="bg-bg-tertiary px-1 py-0.5 rounded text-sm" {...props}>
                          {children}
                        </code>
                      );
                    },
                    a: ({ href, children, ...props }: any) => (
                      <a 
                        href={href} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-accent-primary hover:underline"
                        {...props}
                      >
                        {children}
                      </a>
                    ),
                    table: ({ children, ...props }: any) => (
                      <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse border border-border-primary" {...props}>
                          {children}
                        </table>
                      </div>
                    ),
                    blockquote: ({ children, ...props }: any) => (
                      <blockquote 
                        className="border-l-4 border-accent-primary pl-4 italic text-text-secondary"
                        {...props}
                      >
                        {children}
                      </blockquote>
                    )
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="whitespace-pre-wrap">{message.content}</div>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-xs opacity-70">
            <span>{relativeTime}</span>
            <button
              onClick={handleCopy}
              className="hover:opacity-100 transition-opacity duration-200"
              title="메시지 복사"
            >
              📋
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 