
import { GoogleGenAI, Modality } from "@google/genai";

const getAI = () => {
  return new GoogleGenAI({ 
    apiKey: process.env.API_KEY || 'PROXY_KEY',
    baseUrl: window.location.origin + '/api'
  } as any);
};

export const speakText = async (text: string, voiceName: string = 'Zephyr') => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Read: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const buffer = await decodeAudioData(decodeBase64(base64Audio), ctx);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
    }
  } catch (err) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  }
};

function decodeBase64(b64: string) {
  const s = atob(b64);
  const b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
  return b;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
  const d = new Int16Array(data.buffer);
  const b = ctx.createBuffer(1, d.length, 24000);
  const cd = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) cd[i] = d[i] / 32768.0;
  return b;
}
