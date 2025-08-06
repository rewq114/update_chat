import { useState, useRef, useEffect } from 'react'
import { Chat } from '../types/chat'
import { getRelativeTime } from '../utils/timeUtils'
import ContextMenu from './ContextMenu'

interface ChatItemsProps {
  chats: Chat[];
  activeChatId: string;
  onSelectChat: (id: string) => void;
  onDeleteChat: (chatId: string) => void;
  onRenameChat: (chatId: string, newName: string) => void;
}

export default function ChatItems({ chats, activeChatId, onSelectChat, onDeleteChat, onRenameChat }: ChatItemsProps) {
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    chatId: string;
  }>({ visible: false, x: 0, y: 0, chatId: '' });

  const [editingChatId, setEditingChatId] = useState<string>('');
  const [editingName, setEditingName] = useState<string>('');
  const [hoveredChatId, setHoveredChatId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<string>(''); // 로딩 중인 채팅 ID
  const inputRef = useRef<HTMLInputElement>(null);

  // 컨텍스트 메뉴 외부 클릭시 닫기
  useEffect(() => {
  if (!contextMenu.visible) {
    return;
  }

  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-context-menu]')) {
      return;
    }
    setContextMenu({ visible: false, x: 0, y: 0, chatId: '' });
  };

  const timeoutId = setTimeout(() => {
    document.addEventListener('click', handleClickOutside);
  }, 0);

  return () => {
    clearTimeout(timeoutId);
    document.removeEventListener('click', handleClickOutside);
  };
}, [contextMenu.visible]);

  // 편집 모드 시 input에 포커스
  useEffect(() => {
    if (editingChatId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingChatId]);

  const handleContextMenu = (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      chatId
    });
  };

  const handleRename = async (chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      // ContextMenu를 즉시 완전히 제거
      setContextMenu({ visible: false, x: 0, y: 0, chatId: '' });
      
      // 포커스 강제 해제
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      
      // 약간의 지연 후 작업 시작
      setTimeout(() => {
        setEditingChatId(chatId);
        setEditingName(chat.name);
      }, 10);
    }
  };

  const handleDelete = async (chatId: string) => {
    if (window.confirm('이 채팅을 삭제하시겠습니까?')) {
      // ContextMenu를 즉시 완전히 제거
      setContextMenu({ visible: false, x: 0, y: 0, chatId: '' });
      
      // 포커스 강제 해제
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      
      // 약간의 지연 후 작업 시작
      setTimeout(async () => {
        setIsLoading(chatId);
        try {
          await onDeleteChat(chatId);
        } catch (error) {
          console.error('채팅 삭제 중 오류:', error);
          alert('채팅 삭제 중 오류가 발생했습니다.');
        } finally {
          setIsLoading('');
        }
      }, 10);
    } else {
      // 취소한 경우에도 ContextMenu 숨기기
      setContextMenu({ visible: false, x: 0, y: 0, chatId: '' });
    }
  };

  const handleNameSubmit = async (chatId: string) => {
    if (editingName.trim()) {
      setIsLoading(chatId);
      try {
        await onRenameChat(chatId, editingName);
      } catch (error) {
        console.error('채팅 이름 변경 중 오류:', error);
        alert('채팅 이름 변경 중 오류가 발생했습니다.');
      } finally {
        setIsLoading('');
      }
    }
    setEditingChatId('');
    setEditingName('');
  };

  const handleKeyDown = async (e: React.KeyboardEvent, chatId: string) => {
    if (e.key === 'Enter') {
      await handleNameSubmit(chatId);
    } else if (e.key === 'Escape') {
      setEditingChatId('');
      setEditingName('');
    }
  };

  if (chats.length === 0) {
    return (
      <div style={styles.emptyChatList}>
        <div style={styles.emptyIcon}>💭</div>
        <p style={styles.emptyText}>아직 채팅이 없습니다</p>
      </div>
    );
  }

  return (
    <>
      <div style={styles.chatList}>
        {chats.map(chat => (
          <div
            key={chat.id}
            style={{
              ...styles.chatItem,
              ...(chat.id === activeChatId ? styles.activeChatItem : {}),
              ...(hoveredChatId === chat.id ? (
                chat.id === activeChatId ? styles.activeChatItemHover : styles.chatItemHover
              ) : {})
            }} 
            onClick={() => onSelectChat(chat.id)}
            onContextMenu={(e) => handleContextMenu(e, chat.id)}
            onMouseEnter={() => setHoveredChatId(chat.id)}
            onMouseLeave={() => setHoveredChatId('')}
          >
            <div style={styles.chatItemContent}>
              <div style={styles.chatItemHeader}>
                {editingChatId === chat.id ? (
                  <input
                    ref={inputRef}
                    style={styles.chatNameInput}
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => handleNameSubmit(chat.id)}
                    onKeyDown={(e) => handleKeyDown(e, chat.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <h4 style={styles.chatName}>
                    {chat.name}
                    {isLoading === chat.id && <span style={styles.loadingSpinner}> ⟳</span>}
                  </h4>
                )}
                <span style={styles.chatTime}>
                  {chat.messages.length > 0 
                    ? getRelativeTime(chat.messages[chat.messages.length - 1].idx)
                    : '새 채팅'
                  }
                </span>
              </div>
              <p style={styles.chatPreview}>
                {chat.messages.length > 0 
                  ? chat.messages[chat.messages.length - 1].text.substring(0, 50) + (chat.messages[chat.messages.length - 1].text.length > 50 ? '...' : '')
                  : '새로운 채팅을 시작해보세요'
                }
              </p>
            </div>
            {chat.id === activeChatId && <div style={styles.activeIndicator}></div>}
          </div>
        ))}
      </div>
      
      {contextMenu.visible && contextMenu.chatId ? (
        <ContextMenu
          key={`context-menu-${contextMenu.chatId}-${Date.now()}`}
          x={contextMenu.x}
          y={contextMenu.y}
          onRename={async () => await handleRename(contextMenu.chatId)}
          onDelete={async () => await handleDelete(contextMenu.chatId)}
        />
      ) : null}
    </>
  )
}

// 스타일 객체
const styles: { [key: string]: React.CSSProperties } = {
  chatList: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 0',
  },
  chatItem: {
    padding: '16px 24px',
    cursor: 'pointer',
    borderBottom: '1px solid var(--border-secondary)',
    transition: 'all 0.2s ease',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  activeChatItem: {
    backgroundColor: 'var(--bg-active)',
    borderRight: '3px solid var(--accent-primary)',
  },
  chatItemHover: {
    backgroundColor: 'var(--bg-hover)',
  },
  activeChatItemHover: {
    backgroundColor: 'var(--bg-active)',
  },
  chatItemContent: {
    flex: 1,
    minWidth: 0,
  },
  chatItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  chatName: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  loadingSpinner: {
    display: 'inline-block',
    animation: 'spin 1s linear infinite',
    color: 'var(--accent-primary)',
    fontSize: '12px',
  },
  chatNameInput: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    border: '1px solid var(--accent-primary)',
    borderRadius: '4px',
    padding: '2px 6px',
    background: 'var(--bg-secondary)',
    outline: 'none',
    width: '100%',
    maxWidth: '150px',
  },
  chatTime: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    flexShrink: 0,
  },
  chatPreview: {
    margin: 0,
    fontSize: '14px',
    color: 'var(--text-secondary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    lineHeight: '1.3',
  },
  activeIndicator: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '3px',
    backgroundColor: 'var(--accent-primary)',
  },
  emptyChatList: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    opacity: 0.5,
  },
  emptyText: {
    margin: 0,
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
}; 