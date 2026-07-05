/**
 * Precise timing synchronization engine to coordinate playback timestamps with UI steps.
 */
export class SyncEngine {
  constructor(audioElement) {
    this.audio = audioElement;
    this.lyrics = [];
    this.currentIndex = -1;
    this.animationFrameId = null;
    this.isSyncing = false;

    // Callbacks to notify UI state changes
    this.onLyricTrigger = null;   // (lyricObject, index)
    this.onTypingTrigger = null;  // (nextLyricObject, nextIndex)
    this.onTypingClear = null;    // ()
    this.onPlaybackEnd = null;    // ()

    this.isTypingActive = false;
  }

  /**
   * Set dynamic list of lyrics into engine workspace
   * @param {Array<{time: number, text: string}>} lyrics 
   */
  setLyrics(lyrics) {
    this.lyrics = lyrics;
    this.resetState();
  }

  /**
   * Start animation frame loop checking against HTML5 Audio offset
   */
  start() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    this.loop();
  }

  /**
   * Terminate verification loop
   */
  stop() {
    this.isSyncing = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Reset pointer references
   */
  resetState() {
    this.currentIndex = -1;
    this.isTypingActive = false;
    if (this.onTypingClear) this.onTypingClear();
  }

  /**
   * Execution frame matching audio offset times to lyric targets
   */
  loop() {
    if (!this.isSyncing) return;

    const currentTime = this.audio.currentTime;

    // Find the current active lyric block
    let activeIdx = -1;
    for (let i = 0; i < this.lyrics.length; i++) {
      if (currentTime >= this.lyrics[i].time) {
        activeIdx = i;
      } else {
        break; // Lyrics are pre-sorted chronologically
      }
    }

    // Trigger update if active lyric changed
    if (activeIdx !== this.currentIndex && activeIdx !== -1) {
      this.currentIndex = activeIdx;
      if (this.onLyricTrigger) {
        this.onLyricTrigger(this.lyrics[activeIdx], activeIdx);
      }
      this.isTypingActive = false;
      if (this.onTypingClear) this.onTypingClear();
    }

    // Handle precise pre-emptive typing status indicator (exactly 1.5 seconds before next line)
    const nextIdx = this.currentIndex + 1;
    if (nextIdx < this.lyrics.length) {
      const nextLyric = this.lyrics[nextIdx];
      const timeRemaining = nextLyric.time - currentTime;

      if (timeRemaining <= 1.5 && timeRemaining > 0) {
        if (!this.isTypingActive) {
          this.isTypingActive = true;
          if (this.onTypingTrigger) {
            this.onTypingTrigger(nextLyric, nextIdx);
          }
        }
      }
    }

    // Handle end of playback state
    if (this.audio.ended && this.onPlaybackEnd) {
      this.onPlaybackEnd();
      this.stop();
      return;
    }

    this.animationFrameId = requestAnimationFrame(() => this.loop());
  }
}