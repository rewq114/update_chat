import { Message } from '../types/chat'
import { getRelativeTime } from '../utils/timeUtils'

interface MessageBubbleProps {
  msg: Message;
}

export default function MessageBubble({ msg }: MessageBubbleProps) {
  const isUser = msg.role === 'user';
  
  // 상대적 시간 계산
  const relativeTime = getRelativeTime(msg.idx);

  // 메시지 복사 함수
  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(msg.text);
      // 복사 성공 표시 (선택사항)
      console.log('메시지가 클립보드에 복사되었습니다.');
    } catch (err) {
      console.error('복사 실패:', err);
      // 폴백: 구식 방법으로 복사
      const textArea = document.createElement('textarea');
      textArea.value = msg.text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  return (
    <div style={styles.messageContainer}>
      <div 
        style={{
          ...styles.messageBubble,
          ...(isUser ? styles.myMessage : styles.otherMessage),
        }}
      >
        <div style={styles.messageContent}>
          <span style={styles.messageText}>
            {msg.text}
          </span>
        </div>
        <div style={styles.messageFooter}>
          <div style={styles.messageTime}>
            {relativeTime}
          </div>
          <button 
            style={styles.copyButton}
            onClick={handleCopyMessage}
            title="메시지 복사"
          >
            📋
          </button>
        </div>
      </div>
    </div>
  );
}

// 스타일 객체
const styles: { [key: string]: React.CSSProperties } = {
  messageContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  messageBubble: {
    maxWidth: '70%',
    width: 'fit-content',
    borderRadius: '16px',
    position: 'relative',
    boxShadow: '0 1px 2px var(--shadow-light)',
  },
  messageContent: {
    padding: '12px 16px',
    lineHeight: '1.4',
    overflowWrap: 'break-word',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word', // 긴 텍스트 줄바꿈
    maxWidth: '100%', // 최대 너비 제한
  },
  messageText: {
    userSelect: 'text' as const, // 텍스트 선택 가능
    cursor: 'text',
    WebkitUserSelect: 'text', // Safari 지원
    MozUserSelect: 'text', // Firefox 지원
    msUserSelect: 'text', // IE 지원
    display: 'inline-block',
    width: '100%',
  },
  messageFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 16px 8px',
  },
  messageTime: {
    fontSize: '11px',
    opacity: 0.7,
  },
  copyButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '4px',
    borderRadius: '4px',
    transition: 'background-color 0.2s ease',
    opacity: 0.7,
  },
  myMessage: {
    backgroundColor: 'var(--accent-primary)',
    color: 'white',
    marginLeft: 'auto',
    borderBottomRightRadius: '4px',
  },
  otherMessage: {
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    borderBottomLeftRadius: '4px',
    border: '1px solid var(--border-primary)',
  },
}; 