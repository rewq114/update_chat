import electronLogo from '../assets/electron.svg'
import { Chat } from '../types/chat'
import { useState, useRef, useEffect } from 'react'

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
  onThemeChange 
}: SidebarProps) {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  return (
    <div style={styles.sidebar}>
      <Header />    
      <NewChatButton onCreateNewChat={onCreateNewChat} />
      <ChatItems 
        chats={chats} 
        activeChatId={activeChatId} 
        onSelectChat={onSelectChat}
        onDeleteChat={onDeleteChat}
        onRenameChat={onRenameChat}
      />
      <SettingsFooter onOpenSettings={() => setIsSettingsModalOpen(true)} />
      
      {isSettingsModalOpen && (
        <SettingsModal
          theme={theme}
          onThemeChange={onThemeChange}
          onClose={() => setIsSettingsModalOpen(false)}
        />
      )}
    </div>
  );
};

// --- 헤더 컴포넌트 ---
function Header() {
  return (
    <div style={styles.sidebarHeader}>
      <div style={styles.headerContent}>
        <button style={styles.sidebarHeaderFoldingButton}>
          <img src={electronLogo} alt="logo" style={styles.sidebarHeaderFoldingButtonIcon} />
        </button>
        <h2 style={styles.sidebarHeaderTitle}>Min-Chat</h2>
      </div>
    </div>
  )
}

// --- 새로운 채팅 버튼 컴포넌트 ---
interface NewChatButtonProps {
  onCreateNewChat: () => void;
}

function NewChatButton({ onCreateNewChat }: NewChatButtonProps) {
  const handleNewChat = async () => {
    try {
      await onCreateNewChat();
    } catch (error) {
      console.error('새 채팅 생성 중 오류:', error);
      alert('새 채팅 생성 중 오류가 발생했습니다.');
    }
  };

  return (
    <div style={styles.newChatButtonContainer}>
      <button style={styles.newChatButton} onClick={handleNewChat}>
        <span style={styles.newChatIcon}>+</span>
        <span>새 채팅</span>
      </button>
    </div>
  )
}

// --- 설정 푸터 컴포넌트 ---
interface SettingsFooterProps {
  onOpenSettings: () => void;
}

function SettingsFooter({ onOpenSettings }: SettingsFooterProps) {
  return (
    <div style={styles.settingsFooter}>
      <button style={styles.settingsButton} onClick={onOpenSettings}>
        <span style={styles.settingsIcon}>⚙️</span>
        <span style={styles.settingsText}>설정</span>
      </button>
    </div>
  );
}

// --- 설정 모달 컴포넌트 ---
interface SettingsModalProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onClose: () => void;
}

function SettingsModal({ theme, onThemeChange, onClose }: SettingsModalProps) {
  const [_activeSettingMenu, setActiveSettingMenu] = useState<string>('');
  const [hoveredTheme, setHoveredTheme] = useState<string>('');
  const [hoveredButton, setHoveredButton] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const apiKeyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchApiKey = async () => {
      const apiKey = await window.electron.ipcRenderer.invoke('get-api-key');
      setApiKey(apiKey || '');
    };
    fetchApiKey();
  }, []);

  const handleApiKeySave = async () => {
    try {
      await window.electron.ipcRenderer.invoke('save-api-key', apiKeyInputRef.current?.value);
    } catch (error) {
      console.error('❌ API 키 저장 오류:', error)
    }
  };

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleThemeSelect = (selectedTheme: Theme) => {
    onThemeChange(selectedTheme);
    setActiveSettingMenu('');
  };

  const handleMCPConfig = () => {
    alert('MCP 설정은 곧 구현될 예정입니다.');
  };

  const getThemeDisplayName = (themeValue: Theme) => {
    switch (themeValue) {
      case 'light': return '밝게';
      case 'dark': return '어둡게';
      case 'system': return '시스템 설정';
      default: return '시스템 설정';
    }
  };

  const getThemeIcon = (themeValue: Theme) => {
    switch (themeValue) {
      case 'light': return '☀️';
      case 'dark': return '🌙';
      case 'system': return '🖥️';
      default: return '🖥️';
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={handleOverlayClick}>
      <div style={styles.modalContent}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>설정</h2>
          <button 
            style={{
              ...styles.modalCloseButton,
              ...(hoveredButton === 'close' ? styles.modalCloseButtonHover : {})
            }}
            onClick={onClose}
            onMouseEnter={() => setHoveredButton('close')}
            onMouseLeave={() => setHoveredButton('')}
          >
            ✕
          </button>
        </div>
        
        <div style={styles.modalBody}>
            {/* H-CHAT API 설정 */}
            <div style={styles.settingSection}>
                <div style={styles.settingSectionHeader}>
              <span style={styles.settingSectionIcon}>🔧</span>
              <h3 style={styles.settingSectionTitle}>API</h3>
            </div>
            <div style={styles.settingSectionContent}>
                <p style={styles.settingSectionDescription}>
                    H-CHAT API 설정을 관리합니다.
                </p>
                <div style={styles.apiKeyContainer}>
                    <input type="text" placeholder="API Key" style={styles.apiKeyInput} ref={apiKeyInputRef} defaultValue={apiKey}/>
                    <button style={styles.apiKeyButton} onClick={handleApiKeySave}>저장</button>
                </div>
            </div>
            </div>
          {/* 테마 설정 */}
          <div style={styles.settingSection}>
            <div style={styles.settingSectionHeader}>
              <span style={styles.settingSectionIcon}>🎨</span>
              <h3 style={styles.settingSectionTitle}>테마</h3>
            </div>
            <div style={styles.settingSectionContent}>
              <p style={styles.settingSectionDescription}>
                애플리케이션의 테마를 변경할 수 있습니다.
              </p>
              <div style={styles.themeOptions}>
                                 {(['light', 'dark', 'system'] as Theme[]).map((themeOption) => (
                   <button
                     key={themeOption}
                     style={{
                       ...styles.themeOption,
                       ...(theme === themeOption ? styles.themeOptionActive : {}),
                       ...(hoveredTheme === themeOption ? styles.themeOptionHover : {})
                     }}
                     onClick={() => handleThemeSelect(themeOption)}
                     onMouseEnter={() => setHoveredTheme(themeOption)}
                     onMouseLeave={() => setHoveredTheme('')}
                   >
                    <span style={styles.themeOptionIcon}>{getThemeIcon(themeOption)}</span>
                    <div style={styles.themeOptionContent}>
                      <span style={styles.themeOptionName}>{getThemeDisplayName(themeOption)}</span>
                    </div>
                    {theme === themeOption && (
                      <span style={styles.themeOptionCheck}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* MCP Config */}
          <div style={styles.settingSection}>
            <div style={styles.settingSectionHeader}>
              <span style={styles.settingSectionIcon}>🔧</span>
              <h3 style={styles.settingSectionTitle}>MCP Config</h3>
            </div>
            <div style={styles.settingSectionContent}>
              <p style={styles.settingSectionDescription}>
                Model Context Protocol 설정을 관리합니다.
              </p>
                             <button 
                 style={{
                   ...styles.mcpConfigButton,
                   ...(hoveredButton === 'mcp' ? styles.mcpConfigButtonHover : {})
                 }}
                 onClick={handleMCPConfig}
                 onMouseEnter={() => setHoveredButton('mcp')}
                 onMouseLeave={() => setHoveredButton('')}
               >
                 <span style={styles.mcpConfigIcon}>⚡</span>
                 <span>MCP 설정 열기</span>
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- 채팅 아이템 컴포넌트 ---
interface ChatItemsProps {
  chats: Chat[];
  activeChatId: string;
  onSelectChat: (id: string) => void;
  onDeleteChat: (chatId: string) => void;
  onRenameChat: (chatId: string, newName: string) => void;
}

function ChatItems({ chats, activeChatId, onSelectChat, onDeleteChat, onRenameChat }: ChatItemsProps) {
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
                <span style={styles.chatTime}>방금 전</span>
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

// --- 컨텍스트 메뉴 컴포넌트 ---
interface ContextMenuProps {
  x: number;
  y: number;
  onRename: () => Promise<void>;
  onDelete: () => Promise<void>;
}

function ContextMenu({ x, y, onRename, onDelete }: ContextMenuProps) {
  const [hoveredItem, setHoveredItem] = useState<string>('');

  // 컴포넌트가 마운트될 때 포커스 설정
  useEffect(() => {
    const menuElement = document.querySelector('[data-context-menu]') as HTMLElement;
    if (menuElement) {
      menuElement.focus();
    }
  }, []);

  return (
    <div 
      data-context-menu
      tabIndex={-1}
      style={{
        ...styles.contextMenu,
        left: x,
        top: y,
      }}
      onClick={(e) => e.stopPropagation()}
      onBlur={() => {
        // 포커스가 벗어나면 ContextMenu 숨기기
        setTimeout(() => {
          setHoveredItem('');
        }, 100);
      }}
    >
      <div 
        style={{
          ...styles.contextMenuItem,
          ...(hoveredItem === 'rename' ? styles.contextMenuItemHover : {})
        }}
        onClick={async () => await onRename()}
        onMouseEnter={() => setHoveredItem('rename')}
        onMouseLeave={() => setHoveredItem('')}
      >
        <span style={styles.contextMenuIcon}>✏️</span>
        <span>이름 변경</span>
      </div>
      <div style={styles.contextMenuDivider} />
      <div 
        style={{
          ...styles.contextMenuItem, 
          ...styles.contextMenuItemDanger,
          ...(hoveredItem === 'delete' ? styles.contextMenuItemDangerHover : {})
        }}
        onClick={async () => await onDelete()}
        onMouseEnter={() => setHoveredItem('delete')}
        onMouseLeave={() => setHoveredItem('')}
      >
        <span style={styles.contextMenuIcon}>🗑️</span>
        <span>삭제</span>
      </div>
    </div>
  );
}

// --- 스타일 객체 ---
const styles: { [key: string]: React.CSSProperties } = {
  sidebar: {
    width: '320px',
    height: '100vh',
    backgroundColor: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border-primary)',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '2px 0 8px var(--shadow-medium)',
  },
  sidebarHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid var(--border-primary)',
    backgroundColor: 'var(--bg-tertiary)',
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  sidebarHeaderFoldingButton: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'var(--accent-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  sidebarHeaderFoldingButtonIcon: {
    width: '20px',
    height: '20px',
    filter: 'brightness(0) invert(1)',
  },
  sidebarHeaderTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    letterSpacing: '-0.5px',
  },
  newChatButtonContainer: {
    padding: '16px 24px',
    borderBottom: '1px solid var(--border-primary)',
  },
  newChatButton: {
    width: '100%',
    padding: '12px 16px',
    border: '2px dashed var(--accent-primary)',
    backgroundColor: 'transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--accent-primary)',
    transition: 'all 0.2s ease',
  },
  newChatIcon: {
    fontSize: '18px',
    fontWeight: 'bold',
  },
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
  contextMenu: {
    position: 'fixed',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-primary)',
    borderRadius: '8px',
    boxShadow: '0 4px 12px var(--shadow-heavy)',
    zIndex: 1000,
    minWidth: '140px',
    padding: '4px 0',
    animation: 'contextMenuShow 0.15s ease-out',
  },
  contextMenuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    color: 'var(--text-primary)',
  },
  contextMenuItemDanger: {
    color: 'var(--accent-danger)',
  },
  contextMenuIcon: {
    fontSize: '14px',
    width: '16px',
    textAlign: 'center',
  },
  contextMenuDivider: {
    height: '1px',
    backgroundColor: 'var(--border-primary)',
    margin: '4px 0',
  },
  contextMenuItemHover: {
    backgroundColor: 'var(--bg-hover)',
  },
  contextMenuItemDangerHover: {
    backgroundColor: 'var(--bg-danger-hover)',
  },
  // 설정 푸터 스타일
  settingsFooter: {
    borderTop: '1px solid var(--border-primary)',
    backgroundColor: 'var(--bg-secondary)',
  },
  settingsButton: {
    width: '100%',
    padding: '16px 24px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '14px',
    color: 'var(--text-primary)',
    transition: 'background-color 0.2s ease',
  },
  settingsIcon: {
    fontSize: '16px',
  },
  settingsText: {
    fontWeight: '500',
  },
  // 모달 스타일
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    animation: 'fadeIn 0.2s ease-out',
  },
  modalContent: {
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '12px',
    width: '480px',
    maxWidth: '90vw',
    maxHeight: '80vh',
    boxShadow: '0 20px 40px var(--shadow-heavy)',
    animation: 'modalSlideIn 0.3s ease-out',
    overflow: 'hidden',
  },
  modalHeader: {
    padding: '24px 24px 16px',
    borderBottom: '1px solid var(--border-primary)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  modalCloseButton: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: 'var(--bg-hover)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    transition: 'all 0.2s ease',
  },
  modalBody: {
    padding: '24px',
    maxHeight: 'calc(80vh - 100px)',
    overflowY: 'auto',
  },
  settingSection: {
    marginBottom: '32px',
  },
  settingSectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  settingSectionIcon: {
    fontSize: '24px',
  },
  settingSectionTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  settingSectionContent: {
    paddingLeft: '36px',
  },
  settingSectionDescription: {
    margin: '0 0 16px',
    fontSize: '14px',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
  },
  themeOptions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  themeOption: {
    width: '100%',
    padding: '16px',
    border: '1px solid var(--border-primary)',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    transition: 'all 0.2s ease',
    textAlign: 'left',
  },
  themeOptionActive: {
    borderColor: 'var(--accent-primary)',
    backgroundColor: 'var(--bg-active)',
  },
  themeOptionIcon: {
    fontSize: '20px',
  },
  themeOptionContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  themeOptionName: {
    fontSize: '16px',
    fontWeight: '500',
    color: 'var(--text-primary)',
  },
  themeOptionDescription: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  themeOptionCheck: {
    fontSize: '16px',
    color: 'var(--accent-primary)',
    fontWeight: 'bold',
  },
  mcpConfigButton: {
    padding: '12px 16px',
    border: '1px solid var(--border-primary)',
    borderRadius: '6px',
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    transition: 'all 0.2s ease',
  },
  mcpConfigIcon: {
    fontSize: '16px',
  },
  // 모달 호버 스타일
  modalCloseButtonHover: {
    backgroundColor: 'var(--bg-tertiary)',
  },
  themeOptionHover: {
    backgroundColor: 'var(--bg-hover)',
  },
  mcpConfigButtonHover: {
    backgroundColor: 'var(--bg-hover)',
    borderColor: 'var(--accent-primary)',
  },
  apiKeyContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  apiKeyInput: {
    width: '80%',   
    padding: '12px',
    border: '1px solid var(--border-primary)',
    borderRadius: '6px',
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
  },
  apiKeyButton: {   
    padding: '12px 16px',
    border: '1px solid var(--border-primary)',
    borderRadius: '6px',
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    transition: 'all 0.2s ease',
  },
};