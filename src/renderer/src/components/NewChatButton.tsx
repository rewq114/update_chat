interface NewChatButtonProps {
  onCreateNewChat: () => void;
  isCollapsed?: boolean;
}

export default function NewChatButton({ onCreateNewChat, isCollapsed }: NewChatButtonProps) {
  const handleNewChat = async () => {
    try {
      await onCreateNewChat();
    } catch (error) {
      console.error('새 채팅 생성 실패:', error);
    }
  };

  return (
    <div style={styles.buttonContainer}>
      <button 
        style={{
          ...styles.newChatButton,
          width: isCollapsed ? '40px' : '100%',
          height: isCollapsed ? '40px' : 'auto',
          padding: isCollapsed ? '0' : '12px 16px',
          borderRadius: isCollapsed ? '50%' : '8px',
        }}
        onClick={handleNewChat}
        title={isCollapsed ? "새 채팅 만들기" : "새 채팅 만들기"}
      >
        <span style={styles.newChatIcon}>+</span>
        {!isCollapsed && <span style={styles.newChatText}>새 채팅</span>}
      </button>
    </div>
  );
}

// 스타일 객체
const styles: { [key: string]: React.CSSProperties } = {
  buttonContainer: {
    padding: '10px',
    borderBottom: '1px solid var(--border-primary)',
    display: 'flex',
    justifyContent: 'center',
  },
  newChatButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: 'var(--accent-primary)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    width: '100%',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  newChatIcon: {
    fontSize: '16px',
    fontWeight: 'bold',
  },
  newChatText: {
    fontSize: '14px',
  },
}; 