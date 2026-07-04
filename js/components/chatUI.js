/**
 * Visual Controller coordinating UI rendering states for Simulated WhatsApp Panel
 */
export class ChatUI {
  constructor() {
    this.chatBody = document.getElementById('chatBody');
    this.chatContactName = document.getElementById('chatContactName');
    this.chatSubStatus = document.getElementById('chatSubStatus');
    this.chatAvatar = document.getElementById('chatAvatar');
    this.alignmentRadios = document.getElementsByName('alignmentMode');

    this.activeAlignmentMode = 'alternate'; // 'alternate' | 'incoming'
    this.typingElement = null;
  }

  /**
   * Set metadata and reset UI
   */
  configureChatHeader(title, artist, albumArtUrl) {
    this.chatContactName.textContent = title;
    this.chatSubStatus.textContent = artist;

    if (albumArtUrl) {
      this.chatAvatar.innerHTML = `<img src="${albumArtUrl}" class="w-full h-full object-cover">`;
    } else {
      // First character fallback index symbol
      const fallbackChar = artist ? artist.charAt(0).toUpperCase() : 'M';
      this.chatAvatar.innerHTML = `<div class="bg-teal-700 text-white w-full h-full flex items-center justify-center font-bold text-base select-none">${fallbackChar}</div>`;
    }
  }

  /**
   * Clean container display fields
   */
  clear() {
    this.chatBody.innerHTML = `
      <div class="self-center bg-yellow-100/95 text-slate-700 text-[10px] px-3 py-1 rounded-md shadow-sm border border-yellow-200/50 text-center select-none max-w-[85%]">
        <i class="fa-solid fa-lock text-[8px] mr-1 text-slate-500"></i> Messages are fully simulated locally and synced with the active track timeline.
      </div>
    `;
    this.typingElement = null;
  }

  /**
   * Update active bubble positioning strategy
   */
  getBubbleAlignment(index) {
    // Read directly from checked DOM control item dynamically
    const checkedRadio = Array.from(this.alignmentRadios).find(r => r.checked);
    const mode = checkedRadio ? checkedRadio.value : 'alternate';

    if (mode === 'incoming') {
      return 'left';
    }
    // Else alternate
    return index % 2 === 0 ? 'left' : 'right';
  }

  /**
   * Inject visual bubble message matching real-time timing indicators
   * @param {string} text - Lyric message content
   * @param {number} index - Sequence index position
   */
  addLyricMessage(text, index) {
    // Drop existing indicator context
    this.clearTypingStatus();

    const alignment = this.getBubbleAlignment(index);
    const bubbleWrapper = document.createElement('div');
    bubbleWrapper.className = `flex w-full mb-1 animate-fade-in ${alignment === 'right' ? 'justify-end' : 'justify-start'}`;

    // Get simple system timestamp mock formatted to system clock
    const now = new Date();
    const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const bubble = document.createElement('div');
    if (alignment === 'right') {
      bubble.className = 'bubble-out relative bg-[#e1f3fc] text-[#111b21] text-[13px] py-1.5 px-3 rounded-lg shadow-sm max-w-[80%] break-words mr-2 flex flex-col items-end min-w-[70px]';
    } else {
      bubble.className = 'bubble-in relative bg-[#ffffff] text-[#111b21] text-[13px] py-1.5 px-3 rounded-lg shadow-sm max-w-[80%] break-words ml-2 flex flex-col items-start min-w-[70px]';
    }

    bubble.innerHTML = `
      <span class="leading-relaxed select-text">${text}</span>
      <div class="flex items-center space-x-1 mt-0.5 select-none self-end">
        <span class="text-[9px] text-slate-400 font-mono">${formattedTime}</span>
        ${alignment === 'right' ? '<i class="fa-solid fa-check-double text-[10px] text-sky-500"></i>' : ''}
      </div>
    `;

    bubbleWrapper.appendChild(bubble);
    this.chatBody.appendChild(bubbleWrapper);
    this.scrollToBottom();
  }

  /**
   * Inject and display an active "typing..." block inside chat list container
   */
  showTypingStatus() {
    if (this.typingElement) return; // Prevent duplicate injection loops

    this.chatSubStatus.textContent = 'typing...';
    this.chatSubStatus.className = 'text-[10px] text-emerald-200 font-bold truncate transition-all duration-300';

    const typingWrapper = document.createElement('div');
    typingWrapper.id = 'typingBubbleMock';
    typingWrapper.className = 'flex w-full mb-1 justify-start';

    const bubble = document.createElement('div');
    bubble.className = 'bubble-in relative bg-[#ffffff] py-2.5 px-4 rounded-lg shadow-sm max-w-[80%] ml-2 flex items-center justify-center space-x-1';
    bubble.innerHTML = `
      <span class="typing-indicator-dot"></span>
      <span class="typing-indicator-dot"></span>
      <span class="typing-indicator-dot"></span>
    `;

    typingWrapper.appendChild(bubble);
    this.chatBody.appendChild(typingWrapper);
    this.typingElement = typingWrapper;
    this.scrollToBottom();
  }

  /**
   * Remove and clean typing visual references
   */
  clearTypingStatus() {
    this.chatSubStatus.className = 'text-[10px] text-emerald-100 font-medium truncate';
    
    // Fallback status context restoration to subtext description
    const artist = document.getElementById('trackArtist').textContent;
    this.chatSubStatus.textContent = artist || 'online';

    if (this.typingElement && this.typingElement.parentNode) {
      this.typingElement.parentNode.removeChild(this.typingElement);
    }
    this.typingElement = null;
  }

  /**
   * Scroll down the messages container
   */
  scrollToBottom() {
    this.chatBody.scrollTop = this.chatBody.scrollHeight;
  }
}