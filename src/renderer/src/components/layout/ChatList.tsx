import { useState } from 'react'
import { ChatSession } from '../../types/chat'
import { formatRelativeTime } from '../../utils/timeUtils'
import { ChatContextMenu } from '../ui'

interface ChatListProps {
  chatSessions: ChatSession[];
  activeSessionId: string | null;
  onSelectChat: (sessionId: string) => void;
  onDeleteChat: (sessionId: string) => void;
  onRenameChat: (sessionId: string, newTitle: string) => void;
}

export default function ChatList({
  chatSessions,
  activeSessionId,
  onSelectChat,
  onDeleteChat,
  onRenameChat
}: ChatListProps): React.JSX.Element {
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    sessionId: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    sessionId: ''
  });

  const handleContextMenu = (e: React.MouseEvent, sessionId: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      sessionId
    });
  };

  const handleContextMenuClose = () => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleRename = (newTitle: string) => {
    onRenameChat(contextMenu.sessionId, newTitle);
    handleContextMenuClose();
  };

  const handleDelete = () => {
    onDeleteChat(contextMenu.sessionId);
    handleContextMenuClose();
  };

  return (
    <div className="space-y-1 p-2">
      {chatSessions.map((session) => {
        const isActive = session.id === activeSessionId;
        const lastMessageTime = formatRelativeTime(session.lastMessageTime);
        
        return (
          <div
            key={session.id}
            className={`
              p-3 rounded-lg cursor-pointer transition-all duration-200
              ${isActive 
                ? 'bg-accent-primary text-white shadow-md' 
                : 'bg-bg-tertiary text-text-primary hover:bg-bg-hover'
              }
            `}
            onClick={() => onSelectChat(session.id)}
            onContextMenu={(e) => handleContextMenu(e, session.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{session.title}</h4>
                <p className="text-xs opacity-70 mt-1">
                  {session.model} • {lastMessageTime}
                </p>
              </div>
            </div>
          </div>
        );
      })}
      
      {chatSessions.length === 0 && (
        <div className="text-center py-8 text-text-secondary">
          <div className="text-4xl mb-2">💬</div>
          <p className="text-sm">채팅이 없습니다</p>
          <p className="text-xs opacity-70">새 채팅을 만들어보세요</p>
        </div>
      )}

      {contextMenu.visible && (
        <ChatContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onRename={handleRename}
          onDelete={handleDelete}
          onClose={handleContextMenuClose}
        />
      )}
    </div>
  );
} 