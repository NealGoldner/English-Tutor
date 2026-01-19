
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
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) { binary += String.fromCharCode(bytes[i]); }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); }
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
  for (let i = 0; i < data.length; i++) { int16[i] = data[i] * 32768; }
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
    await Promise.all([inputAudioContext.resume(), outputAudioContext.resume()]);
  } catch (e) { console.warn("音频启动受阻", e); }

  try {
    currentStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e: any) {
    const msg = e.name === 'NotAllowedError' ? "请授权麦克风权限。" : "无法访问麦克风。";
    onError(msg);
    throw new Error(msg);
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const personalityPrompts: Record<string, string> = {
    '幽默达人': "你是一个及其幽默的导师。每一句英文回复后必须紧跟中文翻译。",
    '电影编剧': "你是一个编剧。每一句英文回复后必须紧跟中文翻译。",
    '严厉教官': "你是一个严厉的英语教官。每一句英文回复后必须紧跟中文翻译。"
  };

  const systemInstruction = `
    Identity: FluentGenie (${personalityPrompts[config.personality || '幽默达人']})
    Task: Interactive English Practice. Topic: "${config.topic}". Level: ${config.difficulty}.
    Rules: 
    1. ALWAYS provide Chinese translation after English sentences. 
    2. Be interactive, ask deep questions.
  `.trim();

  try {
    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      callbacks: {
        onopen: () => {
          console.log("Session Opened");
          const source = inputAudioContext!.createMediaStreamSource(currentStream!);
          const scriptProcessor = inputAudioContext!.createScriptProcessor(4096, 1, 1);
          scriptProcessor.onaudioprocess = (e) => {
            if (!currentSession) return;
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmBlob = createBlob(inputData);
            sessionPromise.then(session => {
              if (session) session.sendRealtimeInput({ media: pcmBlob });
            });
          };
          source.connect(scriptProcessor);
          scriptProcessor.connect(inputAudioContext!.destination);
        },
        onmessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.outputTranscription) {
            onTranscription('model', message.serverContent.outputTranscription.text);
          }
          if (message.serverContent?.inputTranscription) {
            onTranscription('user', message.serverContent.inputTranscription.text);
          }

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
          console.error("Session Error:", e);
          onError(e.message?.includes('quota') ? "API 配额用尽" : "网络连接不稳定");
        },
        onclose: (e: any) => {
          console.log("Session Closed", e);
          onClose(); // 通知 App 进行重连或重置
        }
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
    return { inputContext: inputAudioContext, outputContext: outputAudioContext };
  } catch (err: any) {
    onError(err.message);
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
