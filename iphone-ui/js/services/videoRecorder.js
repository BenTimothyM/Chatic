/**
 * Client-Side canvas execution frame recorder capturing audio stream outputs into movie blobs
 */
export class VideoRecorder {
  constructor(canvasWrapperElement, audioElement) {
    this.wrapper = canvasWrapperElement;
    this.audio = audioElement;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.canvasFrame = null;
    this.rafId = null;
  }

  /**
   * Setup active recorder graph merging Web Audio API context and Canvas streams
   */
  async startRecording() {
    if (this.isRecording) return;
    this.recordedChunks = [];

    // Construct secondary rendering offscreen capture canvas
    const width = this.wrapper.clientWidth;
    const height = this.wrapper.clientHeight;

    this.canvasFrame = document.createElement('canvas');
    this.canvasFrame.width = width;
    this.canvasFrame.height = height;
    const ctx = this.canvasFrame.getContext('2d');

    // Canvas frame capture rendering process
    const renderLoop = async () => {
      if (!this.isRecording) return;
      try {
        const canvas = await html2canvas(this.wrapper, {
          width: width,
          height: height,
          scale: 1.5, // Enhances layout resolution
          logging: false,
          useCORS: true
        });
        ctx.drawImage(canvas, 0, 0, width, height);
      } catch (err) {
        console.error("Frame capture failure during rendering step:", err);
      }
      this.rafId = requestAnimationFrame(renderLoop);
    };

    this.isRecording = true;
    renderLoop();

    // Capture WebGL/Canvas frame stream at standard 24fps target rate
    const canvasStream = this.canvasFrame.captureStream(24);

    // Audio Graph routing setup avoiding CORS context locks (using local objects)
    const audioStreamDestination = this.establishAudioRouting();
    const combinedStream = new MediaStream();

    // Merge video and audio tracks
    canvasStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));

    if (audioStreamDestination) {
      audioStreamDestination.stream.getAudioTracks().forEach(track => {
        combinedStream.addTrack(track);
      });
    }

    // Capture standard webm codec types, fallback cleanly
    let options = { mimeType: 'video/webm;codecs=vp8,opus' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'video/webm' };
    }

    this.mediaRecorder = new MediaRecorder(combinedStream, options);
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(100); // Record chunks of data periodically
  }

  /**
   * Safely instantiate Web Audio API context mapping audio node destinations
   */
  establishAudioRouting() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;

      // Re-use or instantiate audio context graphs cleanly
      if (!window.audioCtxInstance) {
        window.audioCtxInstance = new AudioContextClass();
      }
      const ctx = window.audioCtxInstance;

      // Clean/Reconstruct source nodes mapping
      if (!window.audioSourceNode) {
        window.audioSourceNode = ctx.createMediaElementSource(this.audio);
      }
      const source = window.audioSourceNode;
      const destination = ctx.createMediaStreamDestination();

      source.disconnect();
      // Ensure audio plays out of local speakers while routing to canvas stream recording
      source.connect(ctx.destination);
      source.connect(destination);

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      return destination;
    } catch (e) {
      console.warn("Failed audio Routing setup (Check browser limits):", e);
      return null;
    }
  }

  /**
   * Stop processes and export constructed video blob element
   */
  stopRecording() {
    return new Promise((resolve) => {
      if (!this.isRecording) {
        resolve(null);
        return;
      }

      this.isRecording = false;
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
      }

      this.mediaRecorder.onstop = () => {
        const videoBlob = new Blob(this.recordedChunks, { type: 'video/webm' });
        resolve(videoBlob);
      };

      this.mediaRecorder.stop();
    });
  }
}