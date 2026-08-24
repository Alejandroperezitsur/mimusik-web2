/** Quiet Analog Atelier: waveform cache stores compact amplitude bytes, never decoded audio buffers or image data. */
export const WAVEFORM_VERSION = 1;
export const WAVEFORM_SAMPLES = 256;
const MAX_DECODE_BYTES = 96 * 1024 * 1024;

export async function createWaveformCache(blob: Blob, signal?: AbortSignal): Promise<Uint8Array | undefined> {
  if (signal?.aborted) throw new DOMException("Operation cancelled", "AbortError");
  if (!blob.size || blob.size > MAX_DECODE_BYTES || typeof AudioContext === "undefined") return undefined;
  const context = new AudioContext();
  try {
    const buffer = await context.decodeAudioData(await blob.arrayBuffer());
    if (signal?.aborted) throw new DOMException("Operation cancelled", "AbortError");
    if (!buffer.length || !buffer.numberOfChannels) return undefined;
    const waveform = new Uint8Array(WAVEFORM_SAMPLES); const channel = buffer.getChannelData(0); const framesPerSample = Math.max(1, Math.ceil(channel.length / WAVEFORM_SAMPLES));
    for (let index = 0; index < WAVEFORM_SAMPLES; index += 1) {
      const start = index * framesPerSample; const end = Math.min(channel.length, start + framesPerSample); let peak = 0;
      for (let frame = start; frame < end; frame += 1) peak = Math.max(peak, Math.abs(channel[frame]));
      waveform[index] = Math.min(255, Math.round(peak * 255));
    }
    return waveform;
  } catch { return undefined; }
  finally { await context.close(); }
}
