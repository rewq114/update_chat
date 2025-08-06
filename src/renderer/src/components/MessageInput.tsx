import { useState, useRef, useEffect } from 'react'

interface MessageInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  shouldFocus?: boolean; // 포커스 복원을 위한 prop
  hasApiKey?: boolean; // API 키 상태
}

export default function MessageInput({ onSendMessage, isLoading, shouldFocus = false, hasApiKey = true }: MessageInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSendMessage = () => {
    if (text.trim() && !isLoading) {
        onSendMessage(text);
        setText('');
    }
  };

  // 포커스 복원 효과
  useEffect(() => {
    if (shouldFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [shouldFocus]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter 키를 누르면 메시지 전송 (Shift+Enter는 줄바꿈)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div style={styles.inputContainer}>
      <div style={styles.inputWrapper}>
        <textarea
          ref={textareaRef}
          style={styles.textarea}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            !hasApiKey ? "API 키를 설정해주세요..." :
            isLoading ? "응답을 기다리는 중..." : 
            "메시지를 입력하세요... (Enter: 전송, Shift+Enter: 줄바꿈)"
          }
          rows={1}
          disabled={isLoading || !hasApiKey}
        />
        <button 
          style={{
            ...styles.sendButton,
            ...(text.trim() && !isLoading && hasApiKey ? styles.sendButtonActive : {}),
            ...(isLoading ? styles.sendButtonLoading : {})
          }} 
          onClick={handleSendMessage}
          disabled={!text.trim() || isLoading || !hasApiKey}
        >
          {isLoading ? (
            <span style={styles.loadingSpinner}>⟳</span>
          ) : (
            <span style={styles.sendIcon}>➤</span>
          )}
        </button>
      </div>
    </div>
  );
}

// 스타일 객체
const styles: { [key: string]: React.CSSProperties } = {
  inputContainer: {
    padding: '16px 24px',
    backgroundColor: 'var(--bg-secondary)',
    borderTop: '1px solid var(--border-primary)',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '12px',
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: '24px',
    padding: '8px 12px',
    border: '1px solid var(--border-primary)',
    transition: 'border-color 0.2s ease',
  },
  textarea: {
    flex: 1,
    padding: '12px 16px',
    border: 'none',
    backgroundColor: 'transparent',
    resize: 'none',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    minHeight: '20px',
    lineHeight: '1.4',
    color: 'var(--text-primary)',
  },
  sendButton: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'var(--text-secondary)',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    flexShrink: 0,
  },
  sendButtonActive: {
    backgroundColor: 'var(--accent-primary)',
    transform: 'scale(1.05)',
  },
  sendButtonLoading: {
    backgroundColor: 'var(--accent-warning)',
    cursor: 'not-allowed',
  },
  sendIcon: {
    fontSize: '16px',
    lineHeight: 1,
  },
  loadingSpinner: {
    fontSize: '16px',
    lineHeight: 1,
    animation: 'spin 1s linear infinite',
  },
}; 