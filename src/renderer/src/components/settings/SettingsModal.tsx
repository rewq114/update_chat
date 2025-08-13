import { useState, useEffect } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface SettingsModalProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onClose: () => void;
}

export default function SettingsModal({ theme, onThemeChange, onClose }: SettingsModalProps) {
  const [_activeSettingMenu, setActiveSettingMenu] = useState<string>('');
  const [hoveredTheme, setHoveredTheme] = useState<string>('');
  const [hoveredButton, setHoveredButton] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [defaultModel, setDefaultModel] = useState<string>('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [apiKey, systemPrompt, defaultModel] = await Promise.all([
          window.electron.ipcRenderer.invoke('get-api-key'),
          window.electron.ipcRenderer.invoke('get-system-prompt'),
          window.electron.ipcRenderer.invoke('get-default-model')
        ]);
        
        setApiKey(apiKey || '');
        setSystemPrompt(systemPrompt || 'You are a helpful assistant.');
        setDefaultModel(defaultModel || 'claude-opus-4');
      } catch (error) {
        console.error('❌ 설정 불러오기 실패:', error);
      }
    };
    fetchSettings();
  }, []);



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

  const handleThemeSelect = async (selectedTheme: Theme) => {
    onThemeChange(selectedTheme);
    setActiveSettingMenu('');
    
    // Theme 즉시 저장
    try {
      await window.electron.ipcRenderer.invoke('save-theme', selectedTheme);
    } catch (error) {
      console.error('❌ Theme 저장 오류:', error);
    }
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

  const availableModels = [
    'claude-3-7-sonnet',
    'claude-sonnet-4',
    'claude-opus-4',
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gpt-4.1',
    'gpt-4.1-mini',
    'gpt-4o',
    'gpt-4o-mini'
  ];

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
                    <input 
                      type="text" 
                      placeholder="API Key" 
                      style={styles.apiKeyInput} 
                      defaultValue={apiKey}
                      onChange={async (e) => {
                        try {
                          await window.electron.ipcRenderer.invoke('save-api-key', e.target.value);
                        } catch (error) {
                          console.error('❌ API Key 저장 오류:', error);
                        }
                      }}
                    />
                </div>
            </div>
            </div>

          {/* System Prompt 설정 */}
          <div style={styles.settingSection}>
            <div style={styles.settingSectionHeader}>
              <span style={styles.settingSectionIcon}>💬</span>
              <h3 style={styles.settingSectionTitle}>System Prompt</h3>
            </div>
            <div style={styles.settingSectionContent}>
              <p style={styles.settingSectionDescription}>
                AI에게 주는 기본 시스템 지시문을 설정합니다.
              </p>
              <div style={styles.systemPromptContainer}>
                <textarea 
                  style={styles.systemPromptInput}
                  placeholder="AI에게 주는 기본 지시문을 입력하세요..."
                  defaultValue={systemPrompt}
                  rows={4}
                  onChange={async (e) => {
                    try {
                      await window.electron.ipcRenderer.invoke('save-system-prompt', e.target.value);
                    } catch (error) {
                      console.error('❌ System Prompt 저장 오류:', error);
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Default Model 설정 */}
          <div style={styles.settingSection}>
            <div style={styles.settingSectionHeader}>
              <span style={styles.settingSectionIcon}>🤖</span>
              <h3 style={styles.settingSectionTitle}>기본 모델</h3>
            </div>
            <div style={styles.settingSectionContent}>
              <p style={styles.settingSectionDescription}>
                기본으로 사용할 AI 모델을 선택합니다.
              </p>
              <div style={styles.modelSelectorContainer}>
                <select 
                  style={styles.modelSelect}
                  value={defaultModel}
                  onChange={async (e) => {
                    setDefaultModel(e.target.value);
                    try {
                      await window.electron.ipcRenderer.invoke('save-default-model', e.target.value);
                    } catch (error) {
                      console.error('❌ Default Model 저장 오류:', error);
                    }
                  }}
                >
                  {availableModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
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

// 스타일 객체
const styles: { [key: string]: React.CSSProperties } = {
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
  // System Prompt 스타일
  systemPromptContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  systemPromptInput: {
    width: '100%',
    padding: '12px',
    border: '1px solid var(--border-primary)',
    borderRadius: '6px',
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: '80px',
    outline: 'none',
  },
  // Model Selector 스타일
  modelSelectorContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  modelSelect: {
    flex: 1,
    padding: '12px',
    border: '1px solid var(--border-primary)',
    borderRadius: '6px',
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    cursor: 'pointer',
    outline: 'none',
  },
}; 