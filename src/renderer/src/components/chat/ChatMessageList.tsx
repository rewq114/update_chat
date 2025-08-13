import { ChatMessage } from '../../types/chat'
import MessageBubble from './MessageBubble'

interface ChatMessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

export default function ChatMessageList({ messages, isLoading }: ChatMessageListProps): React.JSX.Element {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message, index) => (
        <MessageBubble key={`${message.time}_${index}`} message={message} />
      ))}
      
      {isLoading && (
        <div className="flex justify-center items-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary"></div>
        </div>
      )}
    </div>
  );
} 