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

    this.typingElement = null;
    this.lastBubbleSide = null; // Tracks the side of the last added bubble to apply WhatsApp tail groupings
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
      const fallbackChar = artist ? artist.charAt(0).toUpperCase() : 'M';
      this.chatAvatar.innerHTML = `<div class="bg-teal-800 text-white w-full h-full flex items-center justify-center font-bold text-base select-none">${fallbackChar}</div>`;
    }
  }

  /**
   * Clean container display fields
   */
  clear() {
    this.chatBody.innerHTML = `
      <div class="self-center bg-[#202c33]/80 text-[#8696a0] text-[9px] px-3 py-1.5 rounded-lg shadow-sm text-center select-none max-w-[90%] border border-slate-700/20">
        <i class="fa-solid fa-lock text-[8px] mr-1 text-[#8696a0]/80"></i> Messages are fully simulated locally and synced with the active track timeline.
      </div>
    `;
    this.typingElement = null;
    this.lastBubbleSide = null;
  }

  /**
   * Update active bubble positioning strategy
   */
  getBubbleAlignment(index) {
    const checkedRadio = Array.from(this.alignmentRadios).find(r => r.checked);
    const mode = checkedRadio ? checkedRadio.value : 'conversational';

    if (mode === 'incoming') {
      return 'left';
    } else if (mode === 'outgoing') {
      return 'right';
    }
    // Conversational: alternate sides
    return index % 2 === 0 ? 'left' : 'right';
  }

  /**
   * Inject visual bubble message matching real-time timing indicators
   * @param {string} text - Lyric message content
   * @param {number} index - Sequence index position
   */
  addLyricMessage(text, index) {
    // Drop existing typing indicator cleanly
    this.clearTypingStatus();

    const alignment = this.getBubbleAlignment(index);
    const bubbleWrapper = document.createElement('div');
    bubbleWrapper.className = `flex w-full mb-1 animate-fade-in ${alignment === 'right' ? 'justify-end' : 'justify-start'}`;

    // Get simple system timestamp mock formatted to system clock
    const now = new Date();
    const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const bubble = document.createElement('div');

    // Apply visual tails dynamically: only show a tail if the side changed, mimicking iOS WhatsApp grouping
    const showTail = (this.lastBubbleSide !== alignment);
    this.lastBubbleSide = alignment;

    if (alignment === 'right') {
      bubble.className = `bubble-out relative bg-[#005c4b] text-[#e9edef] text-[13px] py-2 px-3 rounded-2xl shadow-sm max-w-[80%] break-words mr-2 flex flex-col items-end min-w-[75px] ${!showTail ? 'bubble-no-tail' : ''}`;
    } else {
      bubble.className = `bubble-in relative bg-[#202c33] text-[#e9edef] text-[13px] py-2 px-3 rounded-2xl shadow-sm max-w-[80%] break-words ml-2 flex flex-col items-start min-w-[75px] ${!showTail ? 'bubble-no-tail' : ''}`;
    }

    bubble.innerHTML = `
      <span class="leading-relaxed select-text">${text}</span>
      <div class="flex items-center space-x-1 mt-1 select-none self-end">
        <span class="text-[9px] text-[#8696a0] font-mono">${formattedTime}</span>
        ${alignment === 'right' ? '<i class="fa-solid fa-check-double text-[10px] text-[#53bdeb]"></i>' : ''}
      </div>
    `;

    bubbleWrapper.appendChild(bubble);
    this.chatBody.appendChild(bubbleWrapper);
    this.scrollToBottom();
  }

  /**
   * Inject and display an active "typing..." block inside chat list container
   */
  showTypingStatus(nextIndex) {
    if (this.typingElement) return;

    // Update status in iOS header
    this.chatSubStatus.textContent = 'typing...';
    this.chatSubStatus.className = 'text-[9px] text-[#007aff] font-semibold truncate transition-all duration-300';

    // Get target side for next lyric alignment
    const alignment = this.getBubbleAlignment(nextIndex);

    const typingWrapper = document.createElement('div');
    typingWrapper.id = 'typingBubbleMock';
    typingWrapper.className = `flex w-full mb-1 ${alignment === 'right' ? 'justify-end' : 'justify-start'}`;

    const bubble = document.createElement('div');

    // Check if dynamic tail needs to be drawn
    const showTail = (this.lastBubbleSide !== alignment);

    if (alignment === 'right') {
      bubble.className = `bubble-out relative bg-[#005c4b] py-2.5 px-4 rounded-2xl shadow-sm max-w-[80%] mr-2 flex items-center justify-center space-x-1 ${!showTail ? 'bubble-no-tail' : ''}`;
    } else {
      bubble.className = `bubble-in relative bg-[#202c33] py-2.5 px-4 rounded-2xl shadow-sm max-w-[80%] ml-2 flex items-center justify-center space-x-1 ${!showTail ? 'bubble-no-tail' : ''}`;
    }

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
    this.chatSubStatus.className = 'text-[9px] text-[#8696a0] font-normal truncate';

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