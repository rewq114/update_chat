import { useState, useRef, useEffect } from 'react'

interface MessageInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  shouldFocus?: boolean; // 포커스 복원을 위한 prop
  hasApiKey?: boolean; // API 키 상태
}

export default function MessageInput({ onSendMessage, isLoading, shouldFocus = false, hasApiKey = true }: MessageInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSendMessage = () => {
    if (text.trim() && !isLoading) {
        onSendMessage(text);
        setText('');
        // 전송 후 textarea 높이 초기화
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
    }
  };

  // 포커스 복원 효과
  useEffect(() => {
    if (shouldFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [shouldFocus]);

  // textarea 높이 자동 조절 함수
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      // 높이를 초기화하여 스크롤 높이를 정확히 계산
      textareaRef.current.style.height = 'auto';
      
      // 스크롤 높이를 기반으로 높이 설정
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = Math.min(scrollHeight, 200); // 최대 200px
      
      textareaRef.current.style.height = `${maxHeight}px`;
      
      // 최대 높이를 초과하면 스크롤 활성화
      if (scrollHeight > 200) {
        textareaRef.current.style.overflowY = 'auto';
      } else {
        textareaRef.current.style.overflowY = 'hidden';
      }
    }
  };

  // 텍스트 변경 시 높이 조절
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // 다음 프레임에서 높이 조절 (DOM 업데이트 후)
    setTimeout(adjustTextareaHeight, 0);
  };

  // 컴포넌트 마운트 시 초기 높이 설정
  useEffect(() => {
    adjustTextareaHeight();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter 키를 누르면 메시지 전송 (Shift+Enter는 줄바꿈)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="p-4 bg-bg-secondary border-t border-border-primary">
      <div className="flex items-end gap-3 bg-bg-tertiary rounded-3xl p-2 border border-border-primary transition-colors duration-200 min-h-14">
        <textarea
          ref={textareaRef}
          className="flex-1 px-4 py-3 border-none bg-transparent resize-none text-sm font-inherit outline-none min-h-5 max-h-50 leading-relaxed text-text-primary transition-height duration-200 overflow-y-hidden"
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={
            !hasApiKey ? "API 키를 설정해주세요..." :
            isLoading ? "응답을 기다리는 중..." : 
            "메시지를 입력하세요... (Enter: 전송, Shift+Enter: 줄바꿈)"
          }
          rows={1}
          disabled={isLoading || !hasApiKey}
        />
        <button 
          className={`
            w-10 h-10 rounded-full border-none text-white cursor-pointer flex items-center justify-center transition-all duration-200 flex-shrink-0
            ${text.trim() && !isLoading && hasApiKey 
              ? 'bg-accent-primary scale-105' 
              : 'bg-text-secondary'
            }
            ${isLoading ? 'bg-accent-warning cursor-not-allowed' : ''}
            ${!text.trim() || isLoading || !hasApiKey ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}
          `}
          onClick={handleSendMessage}
          disabled={!text.trim() || isLoading || !hasApiKey}
        >
          {isLoading ? (
            <span className="text-base leading-none animate-spin">⟳</span>
          ) : (
            <span className="text-base leading-none">➤</span>
          )}
        </button>
      </div>
    </div>
  );
} 