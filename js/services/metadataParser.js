/**
 * Service to read embedded audio metadata properties locally inside browser
 */
export const metadataParser = {
  /**
   * Parse ID3 Tags from a client-side File reference using jsmediatags
   * @param {File} file 
   * @returns {Promise<{title: string, artist: string, albumArt: string|null}>}
   */
  parseMp3(file) {
    return new Promise((resolve) => {
      if (!window.jsmediatags) {
        resolve(this.getFallbackMetadata(file));
        return;
      }

      window.jsmediatags.read(file, {
        onSuccess: (tag) => {
          const title = tag.tags.title || file.name.replace(/\.[^/.]+$/, "");
          const artist = tag.tags.artist || "Unknown Artist";
          let albumArt = null;

          // Convert binary image arrays if present in ID3 tag context
          if (tag.tags.picture) {
            const { data, format } = tag.tags.picture;
            let base64String = "";
            for (let i = 0; i < data.length; i++) {
              base64String += String.fromCharCode(data[i]);
            }
            albumArt = `data:${format};base64,${window.btoa(base64String)}`;
          }

          resolve({ title, artist, albumArt });
        },
        onError: () => {
          resolve(this.getFallbackMetadata(file));
        }
      });
    });
  },

  /**
   * Process name parsing for safe visual default values on metadata error
   * @param {File} file 
   */
  getFallbackMetadata(file) {
    const filenameNoExt = file.name.replace(/\.[^/.]+$/, "");
    const parts = filenameNoExt.split(" - ");
    
    if (parts.length > 1) {
      return {
        title: parts.slice(1).join(" - ").trim(),
        artist: parts[0].trim(),
        albumArt: null
      };
    }

    return {
      title: filenameNoExt,
      artist: "Unknown Artist",
      albumArt: null
    };
  }
};