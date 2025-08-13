import { useState, useEffect } from 'react'
import { ChatSession, ChatMessage } from './types/chat'
import { Sidebar, ChatScreen } from './components'

export default function App(): React.JSX.Element {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([])

  // 채팅 세션 목록 로드
  useEffect(() => {
    const loadChatSessions = async () => {
      try {
        const sessions = await window.api.getChatSessions();
        setChatSessions(sessions);
        
        // 활성 세션이 있으면 해당 세션의 메시지 로드
        if (sessions.length > 0 && activeSessionId) {
          const chatData = await window.api.getChatData(activeSessionId);
          if (chatData) {
            setCurrentMessages(chatData.messages);
          }
        }
      } catch (error) {
        console.error('채팅 세션 로드 실패:', error);
      }
    };

    loadChatSessions();
  }, [activeSessionId]);

  // 새 채팅 생성
  const handleCreateChat = async () => {
    const newSession: ChatSession = {
      id: `session_${Date.now()}_${Math.random()}`,
      title: '새 채팅',
      model: 'claude-opus-4',
      lastMessageTime: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    try {
      await window.api.saveChatSession(newSession);
      setChatSessions(prev => [...prev, newSession]);
      setActiveSessionId(newSession.id);
      setCurrentMessages([]);
    } catch (error) {
      console.error('새 채팅 생성 실패:', error);
    }
  };

  // 채팅 선택
  const handleSelectChat = async (sessionId: string) => {
    setActiveSessionId(sessionId);
    
    try {
      const chatData = await window.api.getChatData(sessionId);
      if (chatData) {
        setCurrentMessages(chatData.messages);
      } else {
        setCurrentMessages([]);
      }
    } catch (error) {
      console.error('채팅 데이터 로드 실패:', error);
      setCurrentMessages([]);
    }
  };

  // 채팅 삭제
  const handleDeleteChat = async (sessionId: string) => {
    try {
      await window.api.deleteChatSession(sessionId);
      setChatSessions(prev => prev.filter(session => session.id !== sessionId));
      
      // 삭제된 채팅이 현재 활성 채팅이면 활성 채팅 해제
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setCurrentMessages([]);
      }
    } catch (error) {
      console.error('채팅 삭제 실패:', error);
    }
  };

  // 채팅 이름 변경
  const handleRenameChat = async (sessionId: string, newTitle: string) => {
    try {
      await window.api.renameChatSession({ sessionId, newTitle });
      setChatSessions(prev => 
        prev.map(session => 
          session.id === sessionId 
            ? { ...session, title: newTitle, updatedAt: Date.now() }
            : session
        )
      );
    } catch (error) {
      console.error('채팅 이름 변경 실패:', error);
    }
  };

  // 메시지 업데이트
  const handleUpdateMessages = async (messages: ChatMessage[] | ((prevMessages: ChatMessage[]) => ChatMessage[])) => {
    const newMessages = typeof messages === 'function' ? messages(currentMessages) : messages;
    setCurrentMessages(newMessages);

    // 활성 세션이 있으면 채팅 데이터 저장
    if (activeSessionId) {
      try {
        await window.api.saveChatData({
          sessionId: activeSessionId,
          messages: newMessages
        });

        // 세션의 마지막 메시지 시간 업데이트
        if (newMessages.length > 0) {
          const lastMessage = newMessages[newMessages.length - 1];
          const updatedSession = chatSessions.find(s => s.id === activeSessionId);
          if (updatedSession) {
            await window.api.saveChatSession({
              ...updatedSession,
              lastMessageTime: lastMessage.time,
              updatedAt: Date.now()
            });
          }
        }
      } catch (error) {
        console.error('채팅 데이터 저장 실패:', error);
      }
    }
  };

  return (
    <div className="flex h-screen bg-bg-primary">
      <Sidebar
        chatSessions={chatSessions}
        activeSessionId={activeSessionId}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        onCreateChat={handleCreateChat}
      />
      <ChatScreen
        messages={currentMessages}
        setMessages={handleUpdateMessages}
        activeSessionId={activeSessionId}
      />
    </div>
  );
}
