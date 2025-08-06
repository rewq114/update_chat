import { Chat } from '../types/chat'
import { useState } from 'react'
import Header from './Header'
import NewChatButton from './NewChatButton'
import SettingsFooter from './SettingsFooter'
import SettingsModal from './SettingsModal'
import ChatItems from './ChatItems'

type Theme = 'light' | 'dark' | 'system'

interface SidebarProps {
  chats: Chat[];
  activeChatId: string;
  onSelectChat: (id: string) => void;
  onCreateNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  onRenameChat: (chatId: string, newName: string) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  isOpen: boolean;
  onToggle: () => void;
}

// --- 사이드바 컴포넌트 ---
export default function Sidebar({ 
  chats, 
  activeChatId, 
  onSelectChat, 
  onCreateNewChat, 
  onDeleteChat, 
  onRenameChat,
  theme,
  onThemeChange,
  isOpen,
  onToggle
}: SidebarProps) {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const shouldShowContent = isOpen || isHovered;

  return (
    <div 
      style={{
        ...styles.sidebar,
        width: shouldShowContent ? '320px' : '60px',
        transition: 'width 0.3s ease-in-out',
      }}
      onMouseEnter={() => !isOpen && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={styles.sidebarContent}>
        <Header onToggleSidebar={onToggle} isCollapsed={!isOpen} isHovered={isHovered} />    
        <NewChatButton onCreateNewChat={onCreateNewChat} isCollapsed={!shouldShowContent} />
        {shouldShowContent && (
          <ChatItems 
            chats={chats} 
            activeChatId={activeChatId} 
            onSelectChat={onSelectChat}
            onDeleteChat={onDeleteChat}
            onRenameChat={onRenameChat}
          />
        )}
      </div>
      <SettingsFooter onOpenSettings={() => setIsSettingsModalOpen(true)} isCollapsed={!shouldShowContent} />
      
      {isSettingsModalOpen && (
        <SettingsModal
          theme={theme}
          onThemeChange={onThemeChange}
          onClose={() => setIsSettingsModalOpen(false)}
        />
      )}
    </div>
  );
}

// --- 스타일 객체 ---
const styles: { [key: string]: React.CSSProperties } = {
  sidebar: {
    height: '100vh',
    backgroundColor: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border-primary)',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '2px 0 8px var(--shadow-medium)',
    position: 'relative',
    zIndex: 1000,
    overflow: 'hidden',
  },
  sidebarContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  },
};