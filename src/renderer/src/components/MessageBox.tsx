import { useState, useEffect } from 'react'
import { Message } from '../types/chat'
import MessageList from './MessageList'
import MessageInput from './MessageInput'

interface MessageBoxProps {
  chatLog: Message[];
  setChatLog: (chatLog: Message[]) => void;
  activeChatId: string;
}

// 바이너리 데이터 감지 및 처리 함수
const isBinaryData = (text: string): boolean => {
  // 바이너리 패턴 감지
  const binaryPatterns = [
    /\\x[0-9a-fA-F]{2}/g,  // \x00 형태
    /\\[0-7]{3}/g,         // \000 형태
    /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, // 제어 문자
  ];
  
  return binaryPatterns.some(pattern => pattern.test(text));
};

const sanitizeText = (text: string): string => {
  if (isBinaryData(text)) {
    return '[바이너리 데이터 - 표시할 수 없습니다]';
  }
  
  // HTML 특수 문자 이스케이프
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

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
  const [system, setSystem] = useState<string>('You are a helpful assistant.')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [shouldFocusInput, _setShouldFocusInput] = useState<boolean>(false)
  const [apiKey, setApiKey] = useState<string>('')
  const [hasApiKey, setHasApiKey] = useState<boolean>(false)

  // 설정에서 system prompt와 default model 불러오기
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [systemPrompt, defaultModel, apiKeyValue] = await Promise.all([
          window.electron.ipcRenderer.invoke('get-system-prompt'),
          window.electron.ipcRenderer.invoke('get-default-model'),
          window.electron.ipcRenderer.invoke('get-api-key')
        ]);
        
        setSystem(systemPrompt || 'You are a helpful assistant.');
        setModel(defaultModel || 'claude-opus-4');
        setApiKey(apiKeyValue || '');
        setHasApiKey(!!apiKeyValue);
      } catch (error) {
        console.error('❌ 설정 불러오기 실패:', error);
      }
    };
    
    loadSettings();
    
    // API 키 변경 이벤트 리스너 추가
    const handleApiKeyChange = async () => {
      try {
        const apiKeyValue = await window.electron.ipcRenderer.invoke('get-api-key');
        setApiKey(apiKeyValue || '');
        setHasApiKey(!!apiKeyValue);
      } catch (error) {
        console.error('❌ API 키 업데이트 실패:', error);
      }
    };
    
    // 주기적으로 API 키 상태 확인 (설정 모달에서 변경될 수 있음)
    const interval = setInterval(handleApiKeyChange, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = async (text: string) => {
    console.log('사용자 메시지:', text);

    // API 키 검증
    if (!hasApiKey || !apiKey.trim()) {
      const errorMessage: Message = {
        idx: Date.now() + Math.random(),
        text: '⚠️ API 키가 설정되지 않았습니다. 설정에서 H-Chat API 키를 입력해주세요.',
        role: 'assistant',
      };
      setChatLog([...chatLog, errorMessage]);
      return;
    }

    // 사용자 메시지 추가
    const newUserMessage: Message = {
      idx: Date.now() + Math.random(), // 더 고유한 ID 생성
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
        // 응답 텍스트 정제
        const sanitizedResponse = sanitizeText(response);
        
        // LLM 응답 메시지 추가
        const assistantMessage: Message = {
          idx: Date.now() + Math.random() + 1, // 더 고유한 ID 생성
          text: sanitizedResponse,
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
          idx: Date.now() + Math.random() + 1,
          text: '죄송합니다. 응답을 생성할 수 없습니다. 다시 시도해 주세요.',
          role: 'assistant',
        };
        
        setChatLog([...updatedChatLog, errorMessage]);
      }
    } catch (error) {
      console.error('LLM 요청 오류:', error);
      
      // 에러 메시지 개선
      let errorText = '오류가 발생했습니다. 네트워크 연결을 확인하고 다시 시도해 주세요.';
      
      if (error instanceof Error) {
        if (error.message.includes('401 Unauthorized') || error.message.includes('Api key is invalid')) {
          errorText = '⚠️ API 키가 잘못되었습니다. 설정에서 올바른 H-Chat API 키를 입력해주세요.';
        } else if (error.message.includes('500 Internal Server Error')) {
          errorText = '⚠️ 서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        } else if (error.message.includes('Failed to read HTTP message')) {
          errorText = '⚠️ API 요청 형식 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        }
      }
      
      const errorMessage: Message = {
        idx: Date.now() + Math.random() + 1,
        text: errorText,
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
                    backgroundColor: !hasApiKey ? '#dc3545' : isLoading ? '#ffc107' : '#28a745'
                  }}></span>
                  <span style={styles.statusText}>
                    {!hasApiKey ? 'API 키 필요' : isLoading ? '응답 대기 중...' : '온라인'}
                  </span>
                </div>
              </div>
            </div>
        </div>
        <MessageList messages={chatLog} isLoading={isLoading} />
        <MessageInput 
          onSendMessage={handleSendMessage} 
          isLoading={isLoading} 
          shouldFocus={shouldFocusInput}
          hasApiKey={hasApiKey}
        />
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