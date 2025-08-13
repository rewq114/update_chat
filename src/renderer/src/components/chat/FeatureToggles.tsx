import { useState } from 'react'

interface FeatureTogglesProps {
  thinkingEnabled: boolean;
  onThinkingToggle: (enabled: boolean) => void;
  mcpEnabled: boolean;
  onMCPToggle: (enabled: boolean) => void;
  selectedMCPServers: string[];
  onMCPServerToggle: (serverName: string, enabled: boolean) => void;
  availableMCPServers: string[];
}

export default function FeatureToggles({
  thinkingEnabled,
  onThinkingToggle,
  mcpEnabled,
  onMCPToggle,
  selectedMCPServers,
  onMCPServerToggle,
  availableMCPServers
}: FeatureTogglesProps): React.JSX.Element {
  const [showMCPServers, setShowMCPServers] = useState(false);

  return (
    <div className="absolute left-3 bottom-3 flex items-center gap-1 z-10">
      {/* 생각하기 토글 - 작은 원형 버튼 */}
      <button
        className={`
          w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200
          ${thinkingEnabled 
            ? 'bg-accent-primary text-white shadow-sm' 
            : 'bg-bg-tertiary/80 text-text-secondary hover:bg-bg-hover/80 backdrop-blur-sm'
          }
        `}
        onClick={() => onThinkingToggle(!thinkingEnabled)}
        title="생각하기 기능 토글"
      >
        <span className="text-xs">🧠</span>
      </button>

      {/* MCP 토글 - 작은 원형 버튼 */}
      <div className="relative">
        <button
          className={`
            w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200
            ${mcpEnabled 
              ? 'bg-accent-success text-white shadow-sm' 
              : 'bg-bg-tertiary/80 text-text-secondary hover:bg-bg-hover/80 backdrop-blur-sm'
            }
          `}
          onClick={() => onMCPToggle(!mcpEnabled)}
          onMouseEnter={() => setShowMCPServers(true)}
          title="MCP 기능 토글"
        >
          <span className="text-xs">⚡</span>
        </button>

        {/* MCP 서버 선택 드롭다운 */}
        {showMCPServers && mcpEnabled && (
          <div 
            className="absolute bottom-full left-0 mb-2 bg-bg-secondary border border-border-primary rounded-lg shadow-lg p-2 min-w-40 z-20"
            onMouseLeave={() => setShowMCPServers(false)}
          >
            <div className="text-xs font-medium text-text-primary mb-1">
              MCP 서버 선택
            </div>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {availableMCPServers.length > 0 ? (
                availableMCPServers.map((serverName) => (
                  <label
                    key={serverName}
                    className="flex items-center gap-1 cursor-pointer hover:bg-bg-hover p-1 rounded transition-colors duration-150"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMCPServers.includes(serverName)}
                      onChange={(e) => onMCPServerToggle(serverName, e.target.checked)}
                      className="w-2.5 h-2.5 text-accent-success bg-bg-tertiary border-border-primary rounded focus:ring-accent-success focus:ring-1"
                    />
                    <span className="text-xs text-text-primary">{serverName}</span>
                  </label>
                ))
              ) : (
                <div className="text-xs text-text-secondary text-center py-1">
                  사용 가능한 MCP 서버가 없습니다
                </div>
              )}
            </div>
            {availableMCPServers.length > 0 && (
              <div className="text-xs text-text-secondary mt-1 pt-1 border-t border-border-primary">
                선택된 서버: {selectedMCPServers.length}개
              </div>
            )}
          </div>
        )}
      </div>

      {/* 연구 기능 토글 - 작은 원형 버튼 */}
      <button
        className="w-6 h-6 rounded-full bg-bg-tertiary/80 text-text-secondary hover:bg-bg-hover/80 backdrop-blur-sm flex items-center justify-center transition-all duration-200"
        title="연구 기능 토글"
      >
        <span className="text-xs">🔍</span>
      </button>
    </div>
  );
}
