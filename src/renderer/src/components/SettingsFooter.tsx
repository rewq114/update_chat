interface SettingsFooterProps {
  onOpenSettings: () => void;
  isCollapsed?: boolean;
}

export default function SettingsFooter({ onOpenSettings, isCollapsed }: SettingsFooterProps) {
  return (
    <div style={styles.settingsFooter}>
      <button 
        style={{
          ...styles.settingsButton,
          width: isCollapsed ? '40px' : '100%',
          height: isCollapsed ? '40px' : 'auto',
          padding: isCollapsed ? '0' : '16px 24px',
          borderRadius: isCollapsed ? '50%' : '0',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
        }} 
        onClick={onOpenSettings}
        title={isCollapsed ? "설정" : "설정"}
      >
        <span style={styles.settingsIcon}>⚙️</span>
        {!isCollapsed && <span style={styles.settingsText}>설정</span>}
      </button>
    </div>
  );
}

// 스타일 객체
const styles: { [key: string]: React.CSSProperties } = {
  settingsFooter: {
    borderTop: '1px solid var(--border-primary)',
    backgroundColor: 'var(--bg-secondary)',
    display: 'flex',
    justifyContent: 'center',
    padding: '10px',
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
    transition: 'all 0.2s ease',
  },
  settingsIcon: {
    fontSize: '16px',
  },
  settingsText: {
    fontWeight: '500',
  },
}; 