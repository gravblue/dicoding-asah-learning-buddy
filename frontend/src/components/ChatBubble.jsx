export default function ChatBubble({ role = "bot", text }) {
  // Parse text untuk list dan link yang rapi
  const formatText = (str) => {
    if (!str) return "";
    
    const lines = str.split('\n');
    let html = '';
    let inList = false;
    let listType = null; // 'ol' atau 'ul'
    
    const closeList = () => {
      if (inList) {
        html += listType === 'ol' ? '</ol>' : '</ul>';
        inList = false;
        listType = null;
      }
    };
    
    lines.forEach((line) => {
      const trimmed = line.trim();
      
      if (!trimmed) {
        closeList();
        html += '<br/>';
        return;
      }
      
      // Numbered list (1., 2., dst)
      const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
      if (numberedMatch) {
        if (listType !== 'ol') {
          closeList();
          html += '<ol>';
          inList = true;
          listType = 'ol';
        }
        html += `<li>${formatInline(numberedMatch[2])}</li>`;
        return;
      }
      
      // Bullet list (-, •, •)
      const bulletMatch = trimmed.match(/^[-•â€¢]\s+(.+)/);
      if (bulletMatch) {
        if (listType !== 'ul') {
          closeList();
          html += '<ul>';
          inList = true;
          listType = 'ul';
        }
        html += `<li>${formatInline(bulletMatch[1])}</li>`;
        return;
      }
      
      // Lines starting with "Hari X:" should be bullet items
      if (trimmed.match(/^Hari\s+\d+:/i)) {
        if (listType !== 'ul') {
          closeList();
          html += '<ul>';
          inList = true;
          listType = 'ul';
        }
        html += `<li>${formatInline(trimmed)}</li>`;
        return;
      }
      
      // Standalone URL
      if (trimmed.match(/^https?:\/\//)) {
        closeList();
        html += `<a href="${trimmed}" target="_blank" rel="noopener noreferrer" class="standalone-link">${trimmed}</a><br/>`;
        return;
      }
      
      // Section headers (with emoji)
      if (trimmed.match(/^(Yuk naikin|Tips seru|Referensi|Berikut roadmap)/i) ||
          trimmed.includes('😉') || trimmed.includes('💡') || 
          trimmed.includes('📚') || trimmed.includes('⚡')) {
        closeList();
        html += `<div class="section-header">${trimmed}</div>`;
        return;
      }
      
      // Regular text
      closeList();
      html += formatInline(trimmed) + '<br/>';
    });
    
    closeList();
    return html;
  };
  
  // Format inline (bold, links, code)
  const formatInline = (str) => {
    let formatted = str;
    
    // Bold **text**
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Code `text`
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Inline links
    formatted = formatted.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="inline-link">$1</a>');
    
    return formatted;
  };

  return (
    <>
      <style>{`
        @keyframes bubbleSlideIn {
          from {
            opacity: 0;
            transform: translateY(15px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }

        .bubble-row {
          display: flex;
          margin-bottom: 20px;
          animation: bubbleSlideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .bubble {
          max-width: 75%;
          padding: 16px 22px;
          border-radius: 22px;
          font-size: 15px;
          line-height: 1.7;
          word-wrap: break-word;
          overflow-wrap: break-word;
          word-break: break-word;
          position: relative;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(10px);
        }

        .bubble:hover { 
          box-shadow: 0 8px 28px rgba(0, 0, 0, 0.14), 0 4px 12px rgba(0, 0, 0, 0.08);
          transform: translateY(-4px) scale(1.02);
        }

        .bubble.user {
          margin-left: auto;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border-bottom-right-radius: 6px;
          border: none;
          position: relative;
          overflow: hidden;
          box-shadow: 0 6px 20px rgba(124, 58, 237, 0.35), 0 2px 8px rgba(124, 58, 237, 0.25);
        }

        .bubble.user:hover {
          box-shadow: 0 10px 32px rgba(124, 58, 237, 0.45), 0 4px 16px rgba(124, 58, 237, 0.35);
        }

        .bubble.user::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, transparent 70%);
          transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1);
          opacity: 0;
        }

        .bubble.user:hover::before {
          opacity: 1;
          top: -20%;
          right: -20%;
        }

        .bubble.user::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.3),
            transparent
          );
          transition: left 0.8s ease;
        }

        .bubble.user:hover::after {
          left: 100%;
        }

        .bubble.bot {
          margin-right: auto;
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 60%, #f1f5f9 100%);
          color: #1e293b;
          border-bottom-left-radius: 6px;
          border: 2px solid #e2e8f0;
          position: relative;
          overflow: hidden;
        }

        .bubble.bot::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            135deg,
            rgba(124, 58, 237, 0.02) 0%,
            rgba(139, 92, 246, 0.02) 50%,
            rgba(167, 139, 250, 0.02) 100%
          );
          opacity: 0;
          transition: opacity 0.4s ease;
        }

        .bubble.bot:hover::before {
          opacity: 1;
        }

        .bubble.bot::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: -2px;
          width: 0;
          height: 3px;
          background: linear-gradient(90deg, #7c3aed, #8b5cf6, #a78bfa);
          transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 2px;
        }

        .bubble.bot:hover::after {
          width: calc(100% + 4px);
        }

        /* Avatar indicator */
        .bubble-avatar {
          position: absolute;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          top: 50%;
          transform: translateY(-50%);
          transition: all 0.3s ease;
        }

        .bubble.user .bubble-avatar {
          right: -16px;
          background: linear-gradient(135deg, #7c3aed, #a78bfa);
          box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.25), 0 2px 8px rgba(124, 58, 237, 0.3);
          animation: pulse 2s ease-in-out infinite;
        }

        .bubble.user:hover .bubble-avatar {
          transform: translateY(-50%) scale(1.3);
          box-shadow: 0 0 0 6px rgba(124, 58, 237, 0.3), 0 4px 12px rgba(124, 58, 237, 0.4);
        }

        .bubble.bot .bubble-avatar {
          left: -16px;
          background: linear-gradient(135deg, #10b981, #34d399);
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.25), 0 2px 8px rgba(16, 185, 129, 0.3);
          animation: pulse 2s ease-in-out infinite;
          animation-delay: 0.5s;
        }

        .bubble.bot:hover .bubble-avatar {
          transform: translateY(-50%) scale(1.3);
          box-shadow: 0 0 0 6px rgba(16, 185, 129, 0.3), 0 4px 12px rgba(16, 185, 129, 0.4);
        }

        /* Text styling */
        .bubble-content {
          position: relative;
          z-index: 1;
        }

        .bubble-content p {
          margin: 0;
        }

        .bubble-content strong {
          font-weight: 700;
          color: inherit;
          background: linear-gradient(135deg, currentColor, currentColor);
          background-clip: text;
          -webkit-background-clip: text;
        }

        .bubble-content code {
          background: rgba(0, 0, 0, 0.1);
          padding: 3px 8px;
          border-radius: 6px;
          font-family: 'Courier New', monospace;
          font-size: 14px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease;
        }

        .bubble-content code:hover {
          background: rgba(0, 0, 0, 0.15);
          transform: scale(1.05);
        }

        .bubble.user strong {
          color: #fff;
          font-weight: 700;
        }

        .bubble.user code {
          background: rgba(255, 255, 255, 0.25);
          color: #fff;
          border-color: rgba(255, 255, 255, 0.3);
        }

        .bubble.user code:hover {
          background: rgba(255, 255, 255, 0.35);
        }

        .bubble-content br {
          display: block;
          margin: 8px 0;
          content: "";
        }

        /* List styling */
        .bubble-content ol,
        .bubble-content ul {
          margin: 10px 0;
          padding-left: 24px;
        }

        .bubble-content ol {
          counter-reset: item;
        }

        .bubble-content li {
          margin: 8px 0;
          line-height: 1.6;
          position: relative;
          padding-left: 4px;
        }

        .bubble-content ol li {
          list-style: none;
          counter-increment: item;
        }

        .bubble-content ol li::before {
          content: counter(item) ".";
          position: absolute;
          left: -24px;
          font-weight: 700;
          color: #3b82f6;
        }

        .bubble.user ol li::before {
          color: rgba(255, 255, 255, 0.9);
        }

        .bubble-content ul li::marker {
          color: #3b82f6;
          font-size: 1.2em;
        }

        .bubble.user ul li::marker {
          color: rgba(255, 255, 255, 0.9);
        }

        /* Section header */
        .bubble-content .section-header {
          font-weight: 700;
          font-size: 16px;
          margin: 16px 0 10px 0;
          padding-bottom: 8px;
          border-bottom: 2px solid rgba(59, 130, 246, 0.2);
          background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: 0.3px;
        }

        .bubble.user .section-header {
          border-bottom-color: rgba(255, 255, 255, 0.4);
          background: linear-gradient(135deg, #ffffff 0%, #f0e7ff 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* Standalone links */
        .bubble-content .standalone-link {
          display: inline-block;
          color: #3b82f6;
          text-decoration: none;
          padding: 8px 14px;
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          border-radius: 10px;
          margin: 6px 0;
          font-size: 14px;
          word-break: break-all;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 2px solid #93c5fd;
          font-weight: 500;
          box-shadow: 0 2px 6px rgba(59, 130, 246, 0.1);
        }

        .bubble-content .standalone-link:hover {
          background: linear-gradient(135deg, #bfdbfe 0%, #93c5fd 100%);
          transform: translateX(4px) scale(1.02);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
          border-color: #60a5fa;
        }

        .bubble.user .standalone-link {
          color: #fff;
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.4);
          backdrop-filter: blur(10px);
        }

        .bubble.user .standalone-link:hover {
          background: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.5);
        }

        /* Inline links */
        .bubble-content .inline-link {
          color: #7c3aed;
          text-decoration: underline;
          text-decoration-thickness: 2px;
          text-underline-offset: 2px;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .bubble-content .inline-link:hover {
          color: #6d28d9;
          text-decoration-thickness: 3px;
        }

        .bubble.user .inline-link {
          color: #fff;
          text-decoration-color: rgba(255, 255, 255, 0.7);
        }

        .bubble.user .inline-link:hover {
          text-decoration-color: rgba(255, 255, 255, 1);
        }

        /* Responsive */
        @media (max-width: 768px) {
          .bubble {
            max-width: 85%;
            padding: 14px 18px;
            font-size: 14px;
            border-radius: 18px;
          }

          .bubble-avatar {
            width: 8px;
            height: 8px;
          }

          .bubble.user .bubble-avatar {
            right: -12px;
          }

          .bubble.bot .bubble-avatar {
            left: -12px;
          }
        }
      `}</style>

      <div className="bubble-row">
        <div className={`bubble ${role}`}>
          <div className="bubble-avatar"></div>
          <div 
            className="bubble-content" 
            dangerouslySetInnerHTML={{ __html: formatText(text) }} 
          />
        </div>
      </div>
    </>
  );
}