import { lyricParser } from './core/lyricParser.js';
import { SyncEngine } from './core/syncEngine.js';
import { lrcApi } from './services/lrcApi.js';
import { metadataParser } from './services/metadataParser.js';
import { ChatUI } from './components/chatUI.js';
import { VideoRecorder } from './services/videoRecorder.js';

class AppController {
  constructor() {
    // DOM Initializations
    this.audioInput = document.getElementById('audioInput');
    this.audioDropzone = document.getElementById('audioDropzone');
    this.audioFileName = document.getElementById('audioFileName');
    this.audioPlayer = document.getElementById('audioPlayer');

    this.modeApiBtn = document.getElementById('modeApiBtn');
    this.modeLrcBtn = document.getElementById('modeLrcBtn');
    this.modeManualBtn = document.getElementById('modeManualBtn');
    this.lrcUploadArea = document.getElementById('lrcUploadArea');
    this.lrcFileInput = document.getElementById('lrcFileInput');
    this.lrcFileName = document.getElementById('lrcFileName');

    this.manualSyncSection = document.getElementById('manualSyncSection');
    this.manualTextInput = document.getElementById('manualTextInput');
    this.manualSyncCount = document.getElementById('manualSyncCount');
    this.manualTotalLines = document.getElementById('manualTotalLines');
    this.nextManualLinePreview = document.getElementById('nextManualLinePreview');
    this.tagStampBtn = document.getElementById('tagStampBtn');

    this.startRecordBtn = document.getElementById('startRecordBtn');
    this.stopRecordBtn = document.getElementById('stopRecordBtn');
    this.recordingProgress = document.getElementById('recordingProgress');
    this.statusBadge = document.getElementById('statusBadge');

    this.chatCanvasWrapper = document.getElementById('chatCanvasWrapper');

    // Fullscreen DOM selectors
    this.fullscreenBtn = document.getElementById('fullscreenBtn');
    this.deviceWrapper = document.getElementById('deviceWrapper');

    // Class Modules Instantiations
    this.chatUI = new ChatUI();
    this.syncEngine = new SyncEngine(this.audioPlayer);
    this.videoRecorder = new VideoRecorder(this.chatCanvasWrapper, this.audioPlayer);

    // Dynamic State Values
    this.state = {
      audioFile: null,
      trackTitle: '',
      trackArtist: '',
      lyricsMode: 'api', // 'api' | 'lrc' | 'manual'
      lyrics: [],       // Array of parsed lyrics {time, text}
      manualLines: [],  // Array of parsed lines for manual stamp tracking
      manualCursor: 0   // Current tagging offset cursor
    };

    this.registerEventBindings();
    this.initSimulatedClock();
  }

  /**
   * Assign reactive browser actions and listeners
   */
  registerEventBindings() {
    // Standard Drag and Drop handling
    this.setupDropzone(this.audioDropzone, this.audioInput, (file) => this.handleAudioUpload(file));
    this.setupDropzone(this.lrcUploadArea, this.lrcFileInput, (file) => this.handleLrcUpload(file));

    // Fullscreen action triggers
    this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
    document.addEventListener('fullscreenchange', () => this.updateFullscreenIconState());

    // Manual Upload Triggers
    this.audioInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) this.handleAudioUpload(e.target.files[0]);
    });
    this.lrcFileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) this.handleLrcUpload(e.target.files[0]);
    });

    // Control Selection Mode Buttons
    this.modeApiBtn.addEventListener('click', () => this.switchLyricsMode('api'));
    this.modeLrcBtn.addEventListener('click', () => this.switchLyricsMode('lrc'));
    this.modeManualBtn.addEventListener('click', () => this.switchLyricsMode('manual'));

    // Re-render layout instantly when alignment configurations are selected
    const alignmentRadios = document.getElementsByName('alignmentMode');
    alignmentRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        this.chatUI.clear();
        this.syncEngine.resetState();
      });
    });

    // Manual Tracking Controls
    this.manualTextInput.addEventListener('input', () => this.initializeManualLines());
    this.tagStampBtn.addEventListener('click', () => this.stampCurrentManualLine());
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && document.activeElement !== this.manualTextInput && this.state.lyricsMode === 'manual') {
        e.preventDefault();
        this.stampCurrentManualLine();
      }
    });

    // Synchronizer callbacks mapping
    this.syncEngine.onLyricTrigger = (lyric, idx) => {
      this.chatUI.addLyricMessage(lyric.text, idx);
    };
    this.syncEngine.onTypingTrigger = (nextLyric, nextIdx) => {
      this.chatUI.showTypingStatus(nextIdx);
    };
    this.syncEngine.onTypingClear = () => {
      this.chatUI.clearTypingStatus();
    };
    this.syncEngine.onPlaybackEnd = () => {
      this.updateStatusBadge('Completed', 'bg-blue-500');
    };

    // Video Recording Triggers
    this.startRecordBtn.addEventListener('click', () => this.initiateVideoRecord());
    this.stopRecordBtn.addEventListener('click', () => this.terminateVideoRecord());

    // Playback state updates mapping to sync loop configurations
    this.audioPlayer.addEventListener('play', () => {
      this.syncEngine.start();
      this.updateStatusBadge('Playing', 'bg-emerald-500');
    });
    this.audioPlayer.addEventListener('pause', () => {
      this.syncEngine.stop();
      this.updateStatusBadge('Paused', 'bg-amber-500');
    });
    this.audioPlayer.addEventListener('seeked', () => {
      this.syncEngine.resetState();
      this.chatUI.clear();
    });
  }

  /**
   * Helper utility class configuring drag-and-drop actions easily
   */
  setupDropzone(dropzoneElement, hiddenInputElement, fileCallback) {
    dropzoneElement.addEventListener('click', () => hiddenInputElement.click());

    dropzoneElement.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzoneElement.classList.add('border-blue-500', 'bg-slate-800');
    });

    dropzoneElement.addEventListener('dragleave', () => {
      dropzoneElement.classList.remove('border-blue-500', 'bg-slate-800');
    });

    dropzoneElement.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzoneElement.classList.remove('border-blue-500', 'bg-slate-800');
      if (e.dataTransfer.files.length > 0) {
        fileCallback(e.dataTransfer.files[0]);
      }
    });
  }

  /**
   * Keep visual simulated iOS device clock current with hardware system time
   */
  initSimulatedClock() {
    const clockEl = document.getElementById('iosClock');
    const updateTime = () => {
      const now = new Date();
      clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    };
    updateTime();
    setInterval(updateTime, 1000 * 60);
  }

  /**
   * Coordinate metadata parse updates following file upload
   */
  async handleAudioUpload(file) {
    if (!file) return;
    this.state.audioFile = file;
    this.audioFileName.textContent = file.name;

    this.updateStatusBadge('Parsing Metadata', 'bg-purple-500');

    // Local object URL assignment to standard Audio Player element
    const objectUrl = URL.createObjectURL(file);
    this.audioPlayer.src = objectUrl;

    // Retrieve embedded tags
    const meta = await metadataParser.parseMp3(file);
    this.state.trackTitle = meta.title;
    this.state.trackArtist = meta.artist;

    // Display updates
    document.getElementById('metadataPanel').classList.remove('hidden');
    document.getElementById('trackTitle').textContent = meta.title;
    document.getElementById('trackArtist').textContent = meta.artist;

    const albumArtPlaceholder = document.getElementById('albumArtPlaceholder');
    if (meta.albumArt) {
      albumArtPlaceholder.innerHTML = `<img src="${meta.albumArt}" class="w-full h-full object-cover rounded-lg">`;
    } else {
      albumArtPlaceholder.innerHTML = `<i class="fa-solid fa-compact-disc text-2xl animate-spin-slow"></i>`;
    }

    this.chatUI.configureChatHeader(meta.title, meta.artist, meta.albumArt);
    this.chatUI.clear();

    this.updateStatusBadge('Ready', 'bg-emerald-500');

    // Run automated external lookup fallback systems matching active mode
    if (this.state.lyricsMode === 'api') {
      this.fetchExternalLyrics();
    }
  }

  /**
   * File processing engine for physical system LRC elements
   */
  handleLrcUpload(file) {
    if (!file) return;
    this.lrcFileName.textContent = file.name;

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawText = e.target.result;
      const lyrics = lyricParser.parse(rawText);
      this.updateParsedLyricsWorkspace(lyrics);
    };
    reader.readAsText(file);
  }

  /**
   * Switch Active UI Modes
   */
  switchLyricsMode(mode) {
    this.state.lyricsMode = mode;
    this.state.lyrics = [];
    this.syncEngine.setLyrics([]);
    this.chatUI.clear();

    // Reset controls visibility
    this.modeApiBtn.className = 'bg-slate-700 text-slate-300 py-1.5 px-2 rounded-lg text-xs font-semibold hover:bg-slate-600 transition-colors';
    this.modeLrcBtn.className = 'bg-slate-700 text-slate-300 py-1.5 px-2 rounded-lg text-xs font-semibold hover:bg-slate-600 transition-colors';
    this.modeManualBtn.className = 'bg-slate-700 text-slate-300 py-1.5 px-2 rounded-lg text-xs font-semibold hover:bg-slate-600 transition-colors';

    this.lrcUploadArea.classList.add('hidden');
    this.manualSyncSection.classList.add('hidden');

    if (mode === 'api') {
      this.modeApiBtn.className = 'bg-blue-600 text-white py-1.5 px-2 rounded-lg text-xs font-semibold hover:bg-blue-500 transition-colors';
      this.fetchExternalLyrics();
    } else if (mode === 'lrc') {
      this.modeLrcBtn.className = 'bg-blue-600 text-white py-1.5 px-2 rounded-lg text-xs font-semibold hover:bg-blue-500 transition-colors';
      this.lrcUploadArea.classList.remove('hidden');
    } else if (mode === 'manual') {
      this.modeManualBtn.className = 'bg-amber-600 text-slate-950 py-1.5 px-2 rounded-lg text-xs font-semibold hover:bg-amber-500 transition-colors';
      this.manualSyncSection.classList.remove('hidden');
      this.initializeManualLines();
    }
  }

  /**
   * Call external matching APIs to seek synced options
   */
  async fetchExternalLyrics() {
    if (!this.state.trackTitle) {
      this.chatUI.clear();
      return;
    }

    this.updateStatusBadge('Fetching Lyrics...', 'bg-indigo-500');
    const rawLrc = await lrcApi.fetchLyrics(this.state.trackTitle, this.state.trackArtist);

    if (rawLrc) {
      const lyrics = lyricParser.parse(rawLrc);
      this.updateParsedLyricsWorkspace(lyrics);
      this.updateStatusBadge('Lyrics Synced', 'bg-emerald-500');
    } else {
      alert(`No synced lyrics were found on the cloud API for "${this.state.trackTitle}". Redirecting to Manual Sync mode.`);
      this.switchLyricsMode('manual');
    }
  }

  /**
   * Parse the clean data rows to prepare for execution
   */
  initializeManualLines() {
    const rawText = this.manualTextInput.value;
    const rawLines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    this.state.manualLines = rawLines;
    this.state.manualCursor = 0;
    this.state.lyrics = [];
    this.syncEngine.setLyrics([]);

    this.manualSyncCount.textContent = '0';
    this.manualTotalLines.textContent = rawLines.length.toString();
    this.tagStampBtn.disabled = rawLines.length === 0;

    this.updateManualPreview();
  }

  /**
   * Stamp the current timing onto the highlighted line
   */
  stampCurrentManualLine() {
    if (this.state.manualCursor >= this.state.manualLines.length) return;

    const currentTime = this.audioPlayer.currentTime;
    const text = this.state.manualLines[this.state.manualCursor];

    this.state.lyrics.push({
      time: Number(currentTime.toFixed(3)),
      text: text
    });

    this.state.lyrics.sort((a, b) => a.time - b.time);
    this.syncEngine.setLyrics(this.state.lyrics);

    this.state.manualCursor++;
    this.manualSyncCount.textContent = this.state.manualCursor.toString();

    this.updateManualPreview();

    if (this.state.lyrics.length > 0) {
      this.startRecordBtn.disabled = false;
    }
  }

  /**
   * Update the preview text indicator
   */
  updateManualPreview() {
    if (this.state.manualCursor < this.state.manualLines.length) {
      this.nextManualLinePreview.textContent = `Next: "${this.state.manualLines[this.state.manualCursor]}"`;
    } else {
      this.nextManualLinePreview.textContent = 'Done! All lines stamped.';
    }
  }

  /**
   * Assign active lyrics data structures to engine workspace
   */
  updateParsedLyricsWorkspace(lyrics) {
    this.state.lyrics = lyrics;
    this.syncEngine.setLyrics(lyrics);
    this.chatUI.clear();

    if (lyrics.length > 0) {
      this.startRecordBtn.disabled = false;
    } else {
      this.startRecordBtn.disabled = true;
      alert("Format verification warning: Parsed lrc structure is empty.");
    }
  }

  /**
   * Toggle fullscreen mode on the device wrapper element
   */
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      this.deviceWrapper.requestFullscreen().catch(err => {
        console.warn(`Fullscreen request failed: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  }

  /**
   * Update the fullscreen button icon to reflect current state
   */
  updateFullscreenIconState() {
    const icon = this.fullscreenBtn.querySelector('i');
    if (document.fullscreenElement) {
      icon.classList.remove('fa-expand');
      icon.classList.add('fa-compress');
      this.fullscreenBtn.title = 'Exit Fullscreen';
    } else {
      icon.classList.remove('fa-compress');
      icon.classList.add('fa-expand');
      this.fullscreenBtn.title = 'Toggle Fullscreen';
    }
  }

  /**
   * Set Status Badge styles
   */
  updateStatusBadge(text, colorClass) {
    this.statusBadge.innerHTML = `<span class="w-2 h-2 rounded-full ${colorClass} animate-pulse"></span> ${text}`;
  }

  /**
   * Capture and compile the canvas and Web Audio outputs into a video file
   */
  async initiateVideoRecord() {
    this.updateStatusBadge('Recording Video...', 'bg-rose-500');
    this.recordingProgress.classList.remove('hidden');
    this.startRecordBtn.disabled = true;
    this.stopRecordBtn.disabled = false;

    this.audioPlayer.currentTime = 0;
    this.chatUI.clear();
    this.syncEngine.resetState();

    await this.audioPlayer.play();
    await this.videoRecorder.startRecording();
  }

  /**
   * Process and export compiled assets
   */
  async terminateVideoRecord() {
    this.updateStatusBadge('Processing file...', 'bg-yellow-500');
    this.recordingProgress.classList.add('hidden');
    this.stopRecordBtn.disabled = true;

    this.audioPlayer.pause();
    const videoBlob = await this.videoRecorder.stopRecording();

    if (videoBlob) {
      const url = URL.createObjectURL(videoBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = `${this.state.trackTitle || 'simulation'}_whatsapp_sync.webm`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);
    }

    this.startRecordBtn.disabled = false;
    this.updateStatusBadge('Ready', 'bg-emerald-500');
  }
}

// Global initialization call on page ready state
window.addEventListener('DOMContentLoaded', () => {
  new AppController();
});