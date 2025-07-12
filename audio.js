export async function createAudio(url, audioContext) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        return audioBuffer;
    } catch (e) {
        console.error(`Failed to load or decode audio file: ${url}`, e);
        return null;
    }
}

