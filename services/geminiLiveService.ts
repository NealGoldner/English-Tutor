
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { TutorConfig } from '../types';

let currentSession: any = null;
let inputAudioContext: AudioContext | null = null;
let outputAudioContext: AudioContext | null = null;
let currentStream: MediaStream | null = null;
let nextStartTime = 0;
const sources = new Set<AudioBufferSourceNode>();

function encode(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) { 
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0; 
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): Blob {
  const int16 = new Int16Array(data.length);
  for (let i = 0; i < data.length; i++) int16[i] = data[i] * 32768;
  return { 
    data: encode(new Uint8Array(int16.buffer)), 
    mimeType: 'audio/pcm;rate=16000' 
  };
}

export const startLiveSession = async ({ config, onTranscription, onClose, onError }: any) => {
  stopLiveSession();
  nextStartTime = 0;

  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  inputAudioContext = new AudioCtx({ sampleRate: 16000 });
  outputAudioContext = new AudioCtx({ sampleRate: 24000 });
  
  try {
    currentStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e: any) {
    onError("麦克风权限被拒绝", "请确保已开启麦克风权限并使用 HTTPS 环境。");
    throw e;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const personalityMap: Record<string, string> = {
    '幽默达人': "You are funny and lighthearted.",
    '电影编剧': "You speak like a character in a movie script.",
    '严厉教官': "You are strict and provide concise feedback."
  };

  const systemInstruction = `
    Role: English Oral Tutor (FluentGenie).
    Personality: ${personalityMap[config.personality || '幽默达人']}
    Current Topic: "${config.topic}".
    User Level: ${config.difficulty}.

    CRITICAL RULES:
    1. AUDIO: Speak ONLY English in your voice response. NEVER speak Chinese.
    2. TEXT: In the text transcription, provide your English response first, then a newline, and then the Chinese translation.
    3. FORMAT: 
       [English Sentence]
       [Chinese Translation]
    4. Keep sentences short and conversational to help the user practice speaking.
  `.trim();

  try {
    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      callbacks: {
        onopen: () => {
          console.log("WebSocket opened.");
          const source = inputAudioContext!.createMediaStreamSource(currentStream!);
          const scriptProcessor = inputAudioContext!.createScriptProcessor(4096, 1, 1);
          scriptProcessor.onaudioprocess = (e) => {
            const pcmBlob = createBlob(e.inputBuffer.getChannelData(0));
            sessionPromise.then(session => {
              session.sendRealtimeInput({ media: pcmBlob });
            });
          };
          source.connect(scriptProcessor);
          scriptProcessor.connect(inputAudioContext!.destination);
        },
        onmessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.outputTranscription) onTranscription('model', message.serverContent.outputTranscription.text);
          if (message.serverContent?.inputTranscription) onTranscription('user', message.serverContent.inputTranscription.text);

          const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (base64Audio && outputAudioContext) {
            nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
            const buffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
            const source = outputAudioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(outputAudioContext.destination);
            source.start(nextStartTime);
            nextStartTime += buffer.duration;
            sources.add(source);
            source.onended = () => sources.delete(source);
          }
        },
        onerror: (e: any) => {
          console.error("Gemini Live Error:", e);
          const msg = e.reason || e.message || "WebSocket Error";
          if (msg.includes("not implemented")) {
            onError("API 未启用", "当前项目未启用 Live API。");
          } else {
            onError("通话意外中断", msg);
          }
        },
        onclose: () => { onClose(); }
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voice } } },
        systemInstruction,
        outputAudioTranscription: {},
        inputAudioTranscription: {},
      },
    });

    currentSession = await sessionPromise;
    return { outputContext: outputAudioContext };
  } catch (err: any) {
    onError("初始化会话失败", err.message);
    throw err;
  }
};

export const stopLiveSession = () => {
  if (currentSession) {
    sources.forEach(s => { try { s.stop(); } catch(e){} });
    sources.clear();
    inputAudioContext?.close();
    outputAudioContext?.close();
    currentStream?.getTracks().forEach(t => t.stop());
    try { currentSession.close(); } catch(e) {}
    currentSession = null;
  }
};

export const sendImageFrame = (b64: string) => {
  if (currentSession) {
    try {
      currentSession.sendRealtimeInput({ media: { data: b64, mimeType: 'image/jpeg' } });
    } catch(e) {}
  }
};
