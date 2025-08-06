interface HeaderProps {
  onToggleSidebar?: () => void;
  isCollapsed?: boolean;
  isHovered?: boolean;
}

export default function Header({ onToggleSidebar, isCollapsed, isHovered }: HeaderProps) {
  // 호버링 중이면 "고정하기", 그렇지 않으면 "축소하기"
  const buttonTitle = isHovered ? "사이드바 고정하기" : (isCollapsed ? "사이드바 펼치기" : "사이드바 축소하기");
  
  return (
    <div style={{
      ...styles.sidebarHeader,
      justifyContent: isHovered ? 'space-between' : (isCollapsed ? 'center' : 'space-between'),
    }}>
      {(!isCollapsed || isHovered) && <h2 style={styles.sidebarHeaderTitle}>Update Chat</h2>}
      <button 
        style={styles.sidebarToggleButton}
        onClick={onToggleSidebar}
        title={buttonTitle}
      >
        <span style={styles.toggleIcon}>
          {isHovered ? "🔒" : (isCollapsed ? '▶' : '◀')}
        </span>
      </button>
    </div>
  )
}

// 스타일 객체
const styles: { [key: string]: React.CSSProperties } = {
  sidebarHeader: {
    maxHeight: '10vh',
    padding: '10px 20px',
    borderBottom: '1px solid var(--border-primary)',
    backgroundColor: 'var(--bg-tertiary)',
    minHeight: '60px',
    display: 'flex',
    alignItems: 'center',
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
  },
  sidebarToggleButton: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    border: '1px solid var(--border-primary)',
    backgroundColor: 'var(--bg-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    flexShrink: 0,
    color: 'var(--text-primary)',
    fontSize: '14px',
  },
  toggleIcon: {
    fontSize: '12px',
    fontWeight: 'bold',
    lineHeight: '1',
  },
  sidebarHeaderTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    letterSpacing: '-0.5px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
}; 