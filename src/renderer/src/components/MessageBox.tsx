import { useState, useRef, useEffect } from 'react'
import { Message } from '../types/chat'

interface MessageBoxProps {
  chatLog: Message[];
  setChatLog: (chatLog: Message[]) => void;
  activeChatId: string;
}

// --- 전체 채팅 앱 컴포넌트 ---
export default function MessageBox({ chatLog, setChatLog, activeChatId }: MessageBoxProps) {
  const [model, setModel] = useState<string>('claude-opus-4')
  const [models, _setModels] = useState<string[]>([
        'claude-3-7-sonnet',
        'claude-sonnet-4',
        'claude-opus-4',
        'gemini-2.5-pro',
        'gemini-2.5-flash',
        'gemini-1.5-flash',
        'gpt-4.1',
        'gpt-4.1-mini',
        'gpt-4o',
        'gpt-4o-mini'
    ])
  const [system, _setSystem] = useState<string>('You are a helpful assistant.')
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const handleSendMessage = async (text: string) => {
    console.log('사용자 메시지:', text);

    // 사용자 메시지 추가
    const newUserMessage: Message = {
      idx: Date.now(),
      text,
      role: 'user',
    };

    const updatedChatLog = [...chatLog, newUserMessage];
    setChatLog(updatedChatLog);
    
    // LLM 요청 준비
    setIsLoading(true);
    
    try {
      const llmData = {
        model: model,
        max_tokens: 4096 * 3, // 
        stream: false,
        system: system,
        chatId: activeChatId, // activeChatId 추가!
        messages: updatedChatLog.map((message) => ({ 
          role: message.role, 
          content: message.text 
        })),
        enableMCP: true
      };

      console.log('LLM 요청 데이터:', llmData);
      
      // LLM 요청
      const response = await window.electron.ipcRenderer.invoke('llm-request', llmData);
      console.log('LLM 응답:', response);
      
      if (response) {
        // LLM 응답 메시지 추가
        const assistantMessage: Message = {
          idx: Date.now() + 1, // 고유 ID 보장
          text: response,
          role: 'assistant',
        };
        
        setChatLog([...updatedChatLog, assistantMessage]);
        
        // 파일에 저장된 후 채팅 목록 다시 로드 (동기화)
        setTimeout(() => {
          window.electron.ipcRenderer.invoke('get-chat-log').then((chats) => {
            const currentChat = chats.find(chat => chat.id === activeChatId);
            if (currentChat) {
              setChatLog(currentChat.messages);
            }
          });
        }, 100); // 약간의 지연 후 동기화
      } else {
        // 오류 메시지 추가
        const errorMessage: Message = {
          idx: Date.now() + 1,
          text: '죄송합니다. 응답을 생성할 수 없습니다. 다시 시도해 주세요.',
          role: 'assistant',
        };
        
        setChatLog([...updatedChatLog, errorMessage]);
      }
    } catch (error) {
      console.error('LLM 요청 오류:', error);
      
      // 오류 메시지 추가
      const errorMessage: Message = {
        idx: Date.now() + 1,
        text: '오류가 발생했습니다. 네트워크 연결을 확인하고 다시 시도해 주세요.',
        role: 'assistant',
      };
      
      setChatLog([...updatedChatLog, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // activeChatId가 있고 chatLog가 있는 경우에만 채팅 인터페이스 표시
  const hasActiveChat = activeChatId && activeChatId !== '';

  return (
    <div style={styles.chatWindow}>
    {hasActiveChat ? (
        <>
        <div style={styles.chatHeader}>
            <div style={styles.chatHeaderContent}>
              <div style={styles.chatHeaderLeft}>
                <h3 style={styles.chatTitle}>채팅</h3>
                
                  
                  
                  <div style={styles.modelSelector}>
                  <label style={styles.modelLabel}>모델:</label>
                  <select 
                    style={styles.modelSelect}
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    disabled={isLoading}
                  >
                    {models.map((modelOption) => (
                      <option key={modelOption} value={modelOption}>
                        {modelOption}
                      </option>
                    ))}
                  </select>
                
                </div>
              </div>
              <div style={styles.chatHeaderRight}>
                <div style={styles.chatStatus}>
                <span style={{
                    ...styles.statusDot,
                    backgroundColor: isLoading ? '#ffc107' : '#28a745'
                  }}></span>
                <span style={styles.statusText}>
                    {isLoading ? '응답 대기 중...' : '온라인'}
                  </span>
                  </div>
              </div>
            </div>
        </div>
        <MessageList messages={chatLog} isLoading={isLoading} />
        <MessageInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </>
    ) : (
        <div style={styles.noChatSelected}>
          <div style={styles.welcomeContent}>
            <div style={styles.welcomeIcon}>💬</div>
            <h2 style={styles.welcomeTitle}>채팅을 시작해보세요</h2>
            <p style={styles.welcomeSubtitle}>새로운 채팅을 만들거나 기존 채팅을 선택해주세요.</p>
          </div>
        </div>
    )}
    </div>
  );
}

// --- 3. 메시지 입력창 컴포넌트 ---
interface MessageInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
}

function MessageInput({ onSendMessage, isLoading }: MessageInputProps) {
  const [text, setText] = useState('');

  const handleSendMessage = () => {
    if (text.trim() && !isLoading) {
        onSendMessage(text);
        setText('');
    }
  };

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
          style={styles.textarea}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isLoading ? "응답을 기다리는 중..." : "메시지를 입력하세요... (Enter: 전송, Shift+Enter: 줄바꿈)"}
          rows={1}
          disabled={isLoading}
        />
        <button 
          style={{
            ...styles.sendButton,
            ...(text.trim() && !isLoading ? styles.sendButtonActive : {}),
            ...(isLoading ? styles.sendButtonLoading : {})
          }} 
          onClick={handleSendMessage}
          disabled={!text.trim() || isLoading}
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
};

// --- 2. 메시지 목록 컴포넌트 ---
interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

const MessageList = ({ messages, isLoading }: MessageListProps) => {
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
      {messages.map((msg) => (
        messageBubble(msg)
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
};

const messageBubble = (msg: Message) => {
  const isUser = msg.role === 'user';
  const currentTime = new Date().toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit'
  });

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
    <div key={msg.idx} style={styles.messageContainer}>
      <div 
        style={{
          ...styles.messageBubble,
          ...(isUser ? styles.myMessage : styles.otherMessage),
        }}
      >
        <div style={styles.messageContent}>
          {msg.text}
        </div>
        <div style={styles.messageFooter}>
          <div style={styles.messageTime}>
            {currentTime}
          </div>
          {!isUser && (
            <button 
              style={styles.copyButton}
              onClick={handleCopyMessage}
              title="메시지 복사"
            >
              📋
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// --- 스타일 객체 ---
const styles: { [key: string]: React.CSSProperties } = {
  chatWindow: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg-primary)',
    height: '100vh',
  },
  chatHeader: {
    padding: '16px 24px',
    borderBottom: '1px solid var(--border-primary)',
    backgroundColor: 'var(--bg-secondary)',
    boxShadow: '0 2px 4px var(--shadow-light)',
  },
  chatHeaderContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  chatHeaderRight: {
    display: 'flex',
    alignItems: 'center',
  },
  chatTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  chatStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-success)',
  },
  statusText: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
  modelSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  modelLabel: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  modelSelect: {
    padding: '6px 12px',
    border: '1px solid var(--border-primary)',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    transition: 'border-color 0.2s ease',
  },
  messageList: {
    flex: 1,
    padding: '24px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
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
    userSelect: 'text', // 텍스트 선택 가능
    cursor: 'text',
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
  noChatSelected: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg-primary)',
  },
  welcomeContent: {
    textAlign: 'center',
    color: 'var(--text-secondary)',
  },
  welcomeIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  welcomeTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: 'var(--text-tertiary)',
    marginBottom: '8px',
  },
  welcomeSubtitle: {
    fontSize: '16px',
    color: 'var(--text-secondary)',
    margin: 0,
  },
};