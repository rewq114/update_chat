import Sidebar from './components/Sidebar'
import MessageBox from './components/MessageBox'
import { useState, useEffect } from 'react'
import { Chat, Message } from './types/chat'

type Theme = 'light' | 'dark' | 'system'

function App(): React.JSX.Element {
  const [chats, setChats] = useState<Chat[]>([])
  const [chatLog, setChatLog] = useState<Message[]>([])
  const [activeChatId, setActiveChatId] = useState<string>('')
  // const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true)
  const [theme, setTheme] = useState<Theme>('system')
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light')

  // 시스템 테마 감지
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleThemeChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        setActualTheme(e.matches ? 'dark' : 'light')
      }
    }

    // 초기 시스템 테마 설정
    if (theme === 'system') {
      setActualTheme(mediaQuery.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleThemeChange)
    return () => mediaQuery.removeEventListener('change', handleThemeChange)
  }, [theme])

  // 테마 변경시 actualTheme 업데이트
  useEffect(() => {
    if (theme === 'light') {
      setActualTheme('light')
    } else if (theme === 'dark') {
      setActualTheme('dark')
    }
    // system의 경우 위의 useEffect에서 처리
  }, [theme])

  // 테마 적용
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', actualTheme)
  }, [actualTheme])

  // 로컬 스토리지에서 테마 설정 불러오기
  useEffect(() => {
    const savedTheme = localStorage.getItem('ming-chat-theme') as Theme
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setTheme(savedTheme)
    }
  }, [])

  // 테마 변경 핸들러
  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem('ming-chat-theme', newTheme)
  }

  // 채팅 로그 가져오기
  useEffect(() => {
    window.electron.ipcRenderer.invoke('get-chat-log').then((res) => {
      setChats(res)
      // 첫 번째 채팅을 기본으로 선택
      if (res.length > 0) {
        setActiveChatId(res[0].id)
      }
    })
  }, [])

  // 채팅 로그 선택
  useEffect(() => {
    if (activeChatId) {
      const selectedChat = chats.find((chat) => chat.id === activeChatId)
      setChatLog(selectedChat?.messages || [])
    } else {
      setChatLog([])
    }
  }, [activeChatId, chats])

  const handleSelectChat = (id: string) => {
    setActiveChatId(id)
  }

  const handleCreateNewChat = async () => {
    const newChatId = `chat-${Date.now()}`
    const newChat: Chat = {
      id: newChatId,
      name: `새 채팅 ${chats.length + 1}`,
      messages: []
    }
    
    try {
      const updatedChats = [...chats, newChat]
      
      // main process를 통해 파일에 새 채팅 저장
      const result = await window.electron.ipcRenderer.invoke('save-chat-log', updatedChats)
      
      if (result.success) {
        // 성공하면 로컬 상태 업데이트
        setChats(updatedChats)
        setActiveChatId(newChatId)
        console.log('✅ 새 채팅 생성 성공:', newChat)
      } else {
        console.error('❌ 새 채팅 저장 실패:', result.error)
        throw new Error(result.error || '새 채팅 생성에 실패했습니다.')
      }
    } catch (error) {
      console.error('❌ 새 채팅 생성 오류:', error)
      throw error // 상위 컴포넌트에서 처리하도록 에러 전파
    }
  }

  const handleDeleteChat = async (chatId: string) => {
    try {
      // main process를 통해 파일에서 채팅 삭제
      const result = await window.electron.ipcRenderer.invoke('delete-chat', chatId)
      
      if (result.success) {
        // 성공하면 로컬 상태 업데이트
        const updatedChats = result.chats
        setChats(updatedChats)
        
        // 삭제하려는 채팅이 현재 활성 채팅인 경우
        if (chatId === activeChatId) {
          // 다른 채팅이 있으면 첫 번째 채팅을 선택, 없으면 빈 상태
          if (updatedChats.length > 0) {
            setActiveChatId(updatedChats[0].id)
          } else {
            setActiveChatId('')
            setChatLog([])
          }
        }
        
        console.log('✅ 채팅 삭제 성공:', chatId)
      } else {
        console.error('❌ 채팅 삭제 실패:', result.error)
        throw new Error(result.error || '채팅 삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('❌ 채팅 삭제 오류:', error)
      throw error // 상위 컴포넌트에서 처리하도록 에러 전파
    }
  }

  const handleRenameChatId = async (chatId: string, newName: string) => {
    if (!newName.trim()) return
    
    try {
      // main process를 통해 파일에서 채팅 이름 변경
      const result = await window.electron.ipcRenderer.invoke('rename-chat', { 
        chatId, 
        newName: newName.trim() 
      })
      
      if (result.success) {
        // 성공하면 로컬 상태 업데이트
        setChats(result.chats)
        console.log('✅ 채팅 이름 변경 성공:', chatId, '→', newName)
      } else {
        console.error('❌ 채팅 이름 변경 실패:', result.error)
        throw new Error(result.error || '채팅 이름 변경에 실패했습니다.')
      }
    } catch (error) {
      console.error('❌ 채팅 이름 변경 오류:', error)
      throw error // 상위 컴포넌트에서 처리하도록 에러 전파
    }
  }

  const handleUpdateChatLog = (newChatLog: Message[]) => {
    setChatLog(newChatLog)
    
    // chats 배열에서 현재 활성 채팅의 메시지도 업데이트
    const updatedChats = chats.map(chat => 
      chat.id === activeChatId 
        ? { ...chat, messages: newChatLog }
        : chat
    )
    setChats(updatedChats)
  }

  return (
    <div style={styles.appContainer}>
      <Sidebar 
        chats={chats} 
        activeChatId={activeChatId} 
        onSelectChat={handleSelectChat}
        onCreateNewChat={handleCreateNewChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChatId}
        theme={theme}
        onThemeChange={handleThemeChange}
      />
      <MessageBox 
        chatLog={chatLog} 
        setChatLog={handleUpdateChatLog}
        activeChatId={activeChatId}
      />
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  appContainer: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    backgroundColor: 'var(--bg-primary)',
    overflow: 'hidden',
  }
}

export default App
