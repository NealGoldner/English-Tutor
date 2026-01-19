
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
    onError("无法获取麦克风。请确保已授权并使用 HTTPS 访问。");
    throw e;
  }

  // 严格按需初始化 SDK
  const apiKey = (process.env.API_KEY && process.env.API_KEY !== 'undefined') ? process.env.API_KEY : 'PROXY_KEY';
  const ai = new GoogleGenAI({ 
    apiKey: apiKey,
    baseUrl: `${window.location.origin}/api`
  } as any);
  
  const personalityPrompts: Record<string, string> = {
    '幽默达人': "幽默、爱开玩笑。每一句英文回复后必须紧跟中文翻译。",
    '电影编剧': "富有戏剧性。每一句英文回复后必须紧跟中文翻译。",
    '严厉教官': "严格纠正语法错误。每一句英文回复后必须紧跟中文翻译。"
  };

  const systemInstruction = `
    Identity: FluentGenie (${personalityPrompts[config.personality]})
    Task: Practice "${config.topic}" with user. Level: ${config.difficulty}.
    Rules: 
    1. Short responses.
    2. MANDATORY Chinese translation after EVERY English sentence.
  `.trim();

  try {
    const sessionPromise = ai.live.connect({
      // 使用最稳定的原生语音预览模型
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      callbacks: {
        onopen: () => {
          console.log("Channel established.");
          const source = inputAudioContext!.createMediaStreamSource(currentStream!);
          const scriptProcessor = inputAudioContext!.createScriptProcessor(4096, 1, 1);
          scriptProcessor.onaudioprocess = (e) => {
            if (!currentSession) return;
            const pcmBlob = createBlob(e.inputBuffer.getChannelData(0));
            sessionPromise.then(s => s?.sendRealtimeInput({ media: pcmBlob }));
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
          const reason = e.reason || e.message || "Connection refused by server.";
          console.error("Session Socket Error:", e);
          if (reason.includes("not implemented")) {
            onError("该 API 在您的 API Key 所属项目中未启用或不受支持。", "MODEL_NOT_READY");
          } else {
            onError("连接意外中断。请检查网络代理是否畅通。", reason);
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
    return { inputContext: inputAudioContext, outputContext: outputAudioContext };
  } catch (err: any) {
    onError("建立连接失败。建议更换网络或检查 API Key。", err.message);
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
