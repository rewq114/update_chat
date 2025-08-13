import { useState, useEffect } from 'react'
import { ChatMessage } from '../../types/chat'
import { LLMRequestData } from '../../../../types/api'
import ChatMessageList from './ChatMessageList'
import MessageInput from './MessageInput'
import FeatureToggles from './FeatureToggles'

interface ChatScreenProps {
  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[] | ((prevMessages: ChatMessage[]) => ChatMessage[])) => void;
  activeSessionId: string | null;
}

export default function ChatScreen({ messages, setMessages, activeSessionId }: ChatScreenProps): React.JSX.Element {
  const [model, setModel] = useState<string>('claude-opus-4')
  const [models] = useState<string[]>([
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

  // 기능 토글 상태
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
  const [mcpEnabled, setMCPEnabled] = useState(false);
  const [selectedMCPServers, setSelectedMCPServers] = useState<string[]>([]);
  const [availableMCPServers, setAvailableMCPServers] = useState<string[]>([]);
  
  // API Key 상태
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // API Key 확인
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const apiKey = await window.api.getApiKey();
        setHasApiKey(!!apiKey);
      } catch (error) {
        console.error('API Key 확인 실패:', error);
        setHasApiKey(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkApiKey();
  }, []);

  // MCP 서버 목록 가져오기
  useEffect(() => {
    const fetchMCPServers = async () => {
      try {
        const response = await window.api.mcpListTools();
        if (response.success && response.tools) {
          // 서버 이름들을 추출하여 중복 제거
          const serverNames = [...new Set(response.tools.map(tool => tool.serverName))];
          setAvailableMCPServers(serverNames);
        }
      } catch (error) {
        console.error('MCP 서버 목록 가져오기 실패:', error);
      }
    };

    fetchMCPServers();
  }, []);

  const handleThinkingToggle = (enabled: boolean) => {
    setThinkingEnabled(enabled);
  };

  const handleMCPToggle = (enabled: boolean) => {
    setMCPEnabled(enabled);
    if (!enabled) {
      setSelectedMCPServers([]);
    }
  };

  const handleMCPServerToggle = (serverName: string, enabled: boolean) => {
    if (enabled) {
      setSelectedMCPServers(prev => [...prev, serverName]);
    } else {
      setSelectedMCPServers(prev => prev.filter(name => name !== serverName));
    }
  };

  const handleSendMessage = async (text: string): Promise<void> => {
    if (!text.trim()) return;

    // 사용자 메시지 추가
    const userMessage: ChatMessage = {
      role: 'user',
      time: Date.now(),
      type: 'text',
      content: text
    };

    setMessages(prevMessages => [...prevMessages, userMessage]);

    // 임시 어시스턴트 메시지 생성
    const tempAssistantMessage: ChatMessage = {
      role: 'assistant',
      time: Date.now(),
      type: 'text',
      content: ''
    };

    setMessages(prevMessages => [...prevMessages, tempAssistantMessage]);

    // LLM 요청 데이터 준비
    const llmData: LLMRequestData = {
      model: model,
      stream: true,
      messages: [...messages, userMessage],
      thinking: thinkingEnabled,
      tools: mcpEnabled && selectedMCPServers.length > 0 ? selectedMCPServers : undefined
    };

    const response = await window.api.llmStreamRequest(llmData);

    if (response.success) {
      // 스트리밍 응답 처리
      window.api.onStreamChunk((data) => {
        setMessages(prevMessages => {
          const newMessages = [...prevMessages];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            lastMessage.content = data.fullResponse;
          }
          return newMessages;
        });
      });

      window.api.onStreamComplete((data) => {
        setMessages(prevMessages => {
          const newMessages = [...prevMessages];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            lastMessage.content = data.content;
          }
          return newMessages;
        });
      });

      window.api.onStreamError((data) => {
        setMessages(prevMessages => {
          const newMessages = [...prevMessages];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            lastMessage.content = `오류가 발생했습니다: ${data.error}`;
          }
          return newMessages;
        });
      });
    } else {
      // 에러 처리
      const errorText = response.error || '알 수 없는 오류가 발생했습니다.';
      setMessages(prevMessages => {
        const newMessages = [...prevMessages];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          lastMessage.content = errorText;
        }
        return newMessages;
      });
    }
  };

  // activeSessionId가 있고 messages가 있는 경우에만 채팅 인터페이스 표시
  const hasActiveChat = activeSessionId && activeSessionId !== '';

  return (
    <div className="flex-1 flex flex-col bg-bg-primary h-screen">
    {hasActiveChat ? (
        <>
        <div className="p-4 border-b border-border-primary bg-bg-secondary shadow-sm">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h3 className="m-0 text-lg font-semibold text-text-primary">채팅</h3>

                <div className="flex items-center gap-2">
                  <label className="text-sm text-text-secondary font-medium">모델:</label>
                  <select
                    className="px-3 py-1.5 border border-border-primary rounded-md text-sm bg-bg-secondary text-text-primary cursor-pointer transition-colors duration-200 focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/25"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    disabled={false} // Removed isLoading state
                  >
                    {models.map((modelOption) => (
                      <option key={modelOption} value={modelOption}>
                        {modelOption}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center">
                <div className="flex items-center gap-2">
                  <span className={`
                    w-2 h-2 rounded-full
                    bg-accent-success
                  `}></span>
                  <span className="text-sm text-text-secondary">
                    온라인
                  </span>
                </div>
              </div>
            </div>
        </div>
        <ChatMessageList messages={messages} isLoading={false} />
        <div className="p-4 border-t border-border-primary bg-bg-secondary">
          <div className="relative">
            <MessageInput
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              shouldFocus={false}
              hasApiKey={hasApiKey}
            />
            <FeatureToggles
              thinkingEnabled={thinkingEnabled}
              onThinkingToggle={handleThinkingToggle}
              mcpEnabled={mcpEnabled}
              onMCPToggle={handleMCPToggle}
              selectedMCPServers={selectedMCPServers}
              onMCPServerToggle={handleMCPServerToggle}
              availableMCPServers={availableMCPServers}
            />
          </div>
        </div>
        </>
    ) : (
        <div className="flex-1 flex items-center justify-center bg-bg-primary">
          <div className="text-center text-text-secondary">
            <div className="text-5xl mb-4">💬</div>
            <h2 className="text-2xl font-semibold text-text-tertiary mb-2">채팅을 시작해보세요</h2>
            <p className="text-base text-text-secondary m-0">새로운 채팅을 만들거나 기존 채팅을 선택해주세요.</p>
          </div>
        </div>
    )}
    </div>
  );
}