
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { TutorConfig } from '../types.ts';

let currentSession: any = null;
let inputAudioContext: AudioContext | null = null;
let outputAudioContext: AudioContext | null = null;
let currentStream: MediaStream | null = null;
let nextStartTime = 0;
const sources = new Set<AudioBufferSourceNode>();

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
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
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

interface StartSessionOptions {
  config: TutorConfig;
  onTranscription: (role: 'user' | 'model', text: string) => void;
  onClose: (wasIntentional: boolean) => void;
  onError: (error: any) => void;
}

export const startLiveSession = async ({ config, onTranscription, onClose, onError }: StartSessionOptions) => {
  // 清理现有资源
  stopLiveSession();

  nextStartTime = 0;

  const isPreview = window.location.hostname.includes('google.com') || window.location.hostname === 'localhost';
  const aiConfig: any = { apiKey: process.env.API_KEY as string };
  if (!isPreview) {
    aiConfig.baseUrl = `${window.location.origin}/api`;
  }

  const ai = new GoogleGenAI(aiConfig);
  
  inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
  outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  
  if (outputAudioContext.state === 'suspended') {
    await outputAudioContext.resume();
  }

  currentStream = await navigator.mediaDevices.getUserMedia({ 
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
      sampleRate: 16000
    } 
  });
  
  const systemInstruction = `
    你是一位极具耐心且专业的双语英语导师 FluentGenie。
    当前话题: ${config.topic}。 
    难度等级: ${config.difficulty}。
    
    交互规则:
    1. 务必在每句英文后提供括号包裹的中文翻译。
    2. 如果用户超过10秒没有说话，请主动用英文询问用户是否还在，并尝试提供一个新的话题切入点。
    3. 保持会话持续活跃，不要主动结束对话。
    4. 实时纠正用户的语法错误，但要以鼓励的方式进行。
  `;

  const sessionPromise = ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
    callbacks: {
      onopen: () => {
        const source = inputAudioContext!.createMediaStreamSource(currentStream!);
        const scriptProcessor = inputAudioContext!.createScriptProcessor(4096, 1, 1);
        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
          const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
          const pcmBlob = createBlob(inputData);
          sessionPromise.then((session) => {
            if (session) session.sendRealtimeInput({ media: pcmBlob });
          });
        };
        source.connect(scriptProcessor);
        scriptProcessor.connect(inputAudioContext!.destination);
      },
      onmessage: async (message: LiveServerMessage) => {
        if (message.serverContent?.outputTranscription) {
          onTranscription('model', message.serverContent.outputTranscription.text);
        } else if (message.serverContent?.inputTranscription) {
          onTranscription('user', message.serverContent.inputTranscription.text);
        }

        const base64EncodedAudioString = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
        if (base64EncodedAudioString && outputAudioContext) {
          if (outputAudioContext.state === 'suspended') {
            await outputAudioContext.resume();
          }

          nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
          const audioBuffer = await decodeAudioData(
            decode(base64EncodedAudioString),
            outputAudioContext,
            24000,
            1,
          );
          const source = outputAudioContext.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(outputAudioContext.destination);
          
          source.onended = () => {
            sources.delete(source);
          };

          source.start(nextStartTime);
          nextStartTime = nextStartTime + audioBuffer.duration;
          sources.add(source);
        }

        if (message.serverContent?.interrupted) {
          sources.forEach(s => { try { s.stop(); } catch(e){} });
          sources.clear();
          nextStartTime = 0;
        }
      },
      onerror: (e) => {
        console.error("Live Session Error:", e);
        onError(e);
      },
      onclose: () => {
        // 通知 App 组件会话已关闭
        onClose(false); 
      }
    },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voice } },
      },
      systemInstruction,
      outputAudioTranscription: {},
      inputAudioTranscription: {},
    },
  });

  currentSession = await sessionPromise;
  return { inputContext: inputAudioContext, outputContext: outputAudioContext };
};

export const stopLiveSession = () => {
  if (currentSession) {
    sources.forEach(s => { try { s.stop(); } catch(e){} });
    sources.clear();
    if (inputAudioContext) inputAudioContext.close();
    if (outputAudioContext) outputAudioContext.close();
    if (currentStream) currentStream.getTracks().forEach(t => t.stop());
    try {
      currentSession.close();
    } catch(e) {}
    currentSession = null;
    inputAudioContext = null;
    outputAudioContext = null;
    currentStream = null;
  }
};

export const sendImageFrame = async (base64Data: string) => {
  if (currentSession) {
    currentSession.sendRealtimeInput({
      media: { data: base64Data, mimeType: 'image/jpeg' }
    });
  }
};
