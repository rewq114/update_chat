/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/renderer/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 테마 색상 변수들
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'bg-tertiary': 'var(--bg-tertiary)',
        'bg-hover': 'var(--bg-hover)',
        'bg-active': 'var(--bg-active)',
        'bg-danger-hover': 'var(--bg-danger-hover)',
        
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-tertiary': 'var(--text-tertiary)',
        
        'border-primary': 'var(--border-primary)',
        'border-secondary': 'var(--border-secondary)',
        
        'accent-primary': 'var(--accent-primary)',
        'accent-success': 'var(--accent-success)',
        'accent-warning': 'var(--accent-warning)',
        'accent-danger': 'var(--accent-danger)',
        
        'shadow-light': 'var(--shadow-light)',
        'shadow-medium': 'var(--shadow-medium)',
        'shadow-heavy': 'var(--shadow-heavy)',
      },
      animation: {
        'spin': 'spin 1s linear infinite',
        'bounce': 'bounce 1s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'modal-slide-in': 'modalSlideIn 0.2s ease-out',
        'context-menu-show': 'contextMenuShow 0.15s ease-out',
        'chat-item-slide-in': 'chatItemSlideIn 0.2s ease-out',
        'shake': 'shake 0.3s ease-in-out',
        'pulse': 'pulse 2s ease-in-out infinite',
        'button-hover': 'buttonHover 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        modalSlideIn: {
          'from': { 
            opacity: '0',
            transform: 'scale(0.95) translateY(-20px)'
          },
          'to': { 
            opacity: '1',
            transform: 'scale(1) translateY(0)'
          },
        },
        contextMenuShow: {
          'from': { 
            opacity: '0',
            transform: 'scale(0.95) translateY(-5px)'
          },
          'to': { 
            opacity: '1',
            transform: 'scale(1) translateY(0)'
          },
        },
        chatItemSlideIn: {
          'from': { 
            opacity: '0',
            transform: 'translateX(-10px)'
          },
          'to': { 
            opacity: '1',
            transform: 'translateX(0)'
          },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-2px)' },
          '75%': { transform: 'translateX(2px)' },
        },
        buttonHover: {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.05)' },
        },
      },
    },
  },
  plugins: [],
}
