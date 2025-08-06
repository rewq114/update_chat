import { useRef, useEffect } from 'react'
import { Message } from '../types/chat'
import MessageBubble from './MessageBubble'

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export default function MessageList({ messages, isLoading }: MessageListProps) {
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  // 새 메시지가 추가될 때마다 스크롤을 맨 아래로 이동
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    <div style={styles.messageList}>
      {messages.map((msg, index) => (
        <div key={`${msg.idx}-${msg.role}-${index}-${msg.text.length}`}>
          <MessageBubble msg={msg} />
        </div>
      ))}
      {isLoading && (
        <div style={styles.loadingMessage}>
          <div style={styles.typingIndicator}>
            <span style={{...styles.typingDot, animationDelay: '0s'}}></span>
            <span style={{...styles.typingDot, animationDelay: '0.2s'}}></span>
            <span style={{...styles.typingDot, animationDelay: '0.4s'}}></span>
          </div>
          <span style={styles.typingText}>AI가 응답을 작성 중입니다...</span>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

// 스타일 객체
const styles: { [key: string]: React.CSSProperties } = {
  messageList: {
    flex: 1,
    padding: '24px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  loadingMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '16px',
    maxWidth: '70%',
    boxShadow: '0 1px 2px var(--shadow-light)',
  },
  typingIndicator: {
    display: 'flex',
    gap: '4px',
  },
  typingDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-primary)',
    animation: 'bounce 1.4s ease-in-out infinite both',
  },
  typingText: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    fontStyle: 'italic',
  },
}; 