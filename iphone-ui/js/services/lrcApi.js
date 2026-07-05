/**
 * Service to execute fetches against LRCLIB API definitions
 */
export const lrcApi = {
  /**
   * Query the LRCLIB tokenless instance API
   * @param {string} title 
   * @param {string} artist 
   * @returns {Promise<string|null>} Returns matching LRC string representation or null
   */
  async fetchLyrics(title, artist) {
    if (!title) return null;

    const queryUrl = `https://lrclib.net/api/search?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist || '')}`;
    
    try {
      const response = await fetch(queryUrl);
      if (!response.ok) {
        throw new Error(`LRCLIB Query Failed with Status ${response.status}`);
      }

      const results = await response.json();
      
      if (results && results.length > 0) {
        // Return first item containing synced lyrics, otherwise standard plain text text blocks
        const match = results.find(item => item.syncedLyrics);
        if (match) {
          return match.syncedLyrics;
        }
      }
      return null;
    } catch (error) {
      console.error('Error fetching lyrics from LRCLIB:', error);
      return null;
    }
  }
};