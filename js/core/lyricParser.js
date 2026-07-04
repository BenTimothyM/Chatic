/**
 * Utility class to parse synchronized raw LRC script assets.
 */
export const lyricParser = {
  /**
   * Converts plain LRC string content to an array of objects
   * @param {string} rawLrc - Raw LRC string from file or API
   * @returns {Array<{time: number, text: string}>} Parsed timestamps sorted ascending
   */
  parse(rawLrc) {
    if (!rawLrc || typeof rawLrc !== 'string') return [];
    
    const lines = rawLrc.split(/\r?\n/);
    const parsedLyrics = [];
    
    // Pattern to capture single or multiple timestamps, e.g. [01:23.45][02:00.00] lyric text
    const timePattern = /\[(\d{2}):(\d{2})[.:](\d{2,3})\]/g;
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      // Extract raw text by stripping timestamp brackets
      const text = trimmedLine.replace(/\[\d{2}:\d{2}[.:]\d{2,3}\]/g, '').trim();
      
      let match;
      // Reset the regex state
      timePattern.lastIndex = 0;
      
      while ((match = timePattern.exec(trimmedLine)) !== null) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const msString = match[3];
        
        // Handle millisecond offsets with variable length (hundredths vs thousandths)
        const milliseconds = parseInt(msString.padEnd(3, '0').slice(0, 3), 10);
        
        const totalTime = (minutes * 60) + seconds + (milliseconds / 1000);
        
        parsedLyrics.push({
          time: Number(totalTime.toFixed(3)),
          text: text
        });
      }
    });

    // Sort lyrics array chronologically
    return parsedLyrics.sort((a, b) => a.time - b.time);
  }
};