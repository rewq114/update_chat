import { useState } from 'react'
import { ChatSession } from '../../types/chat'
import { ChatList, CreateChatButton } from './'
import { SettingsModal } from '../settings'

interface SidebarProps {
  chatSessions: ChatSession[];
  activeSessionId: string | null;
  onSelectChat: (sessionId: string) => void;
  onDeleteChat: (sessionId: string) => void;
  onRenameChat: (sessionId: string, newTitle: string) => void;
  onCreateChat: () => void;
}

export default function Sidebar({
  chatSessions,
  activeSessionId,
  onSelectChat,
  onDeleteChat,
  onRenameChat,
  onCreateChat
}: SidebarProps): React.JSX.Element {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="w-80 bg-bg-secondary border-r border-border-primary flex flex-col">
      <div className="p-4 border-b border-border-primary">
        <CreateChatButton onClick={onCreateChat} />
      </div>
      
      <div className="flex-1 overflow-hidden">
        <ChatList
          chatSessions={chatSessions}
          activeSessionId={activeSessionId}
          onSelectChat={onSelectChat}
          onDeleteChat={onDeleteChat}
          onRenameChat={onRenameChat}
        />
      </div>
      
      <div className="p-4 border-t border-border-primary">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="w-full px-4 py-2 bg-bg-tertiary text-text-primary rounded-md hover:bg-bg-hover transition-colors duration-200"
        >
          설정
        </button>
      </div>

      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
}