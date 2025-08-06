import { useState, useEffect } from 'react'

interface ContextMenuProps {
  x: number;
  y: number;
  onRename: () => Promise<void>;
  onDelete: () => Promise<void>;
}

export default function ContextMenu({ x, y, onRename, onDelete }: ContextMenuProps) {
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

// 스타일 객체
const styles: { [key: string]: React.CSSProperties } = {
  contextMenu: {
    position: 'fixed',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-primary)',
    borderRadius: '8px',
    boxShadow: '0 4px 12px var(--shadow-heavy)',
    padding: '8px 0',
    minWidth: '140px',
    zIndex: 1000,
    animation: 'contextMenuShow 0.15s ease-out',
  },
  contextMenuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '14px',
    color: 'var(--text-primary)',
    transition: 'background-color 0.2s ease',
  },
  contextMenuItemHover: {
    backgroundColor: 'var(--bg-hover)',
  },
  contextMenuItemDanger: {
    color: 'var(--accent-danger)',
  },
  contextMenuItemDangerHover: {
    backgroundColor: 'var(--bg-danger-hover)',
  },
  contextMenuIcon: {
    fontSize: '14px',
  },
  contextMenuDivider: {
    height: '1px',
    backgroundColor: 'var(--border-primary)',
    margin: '4px 0',
  },
}; 