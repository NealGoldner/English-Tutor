
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { TutorConfig } from '../types.ts';

let currentSession: any = null;
let inputAudioContext: AudioContext | null = null;
let outputAudioContext: AudioContext | null = null;
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
  onClose: () => void;
  onError: (error: any) => void;
}

export const sendImageFrame = async (base64Data: string) => {
  if (currentSession) {
    currentSession.sendRealtimeInput({
      media: { data: base64Data, mimeType: 'image/jpeg' }
    });
  }
};

export const startLiveSession = async ({ config, onTranscription, onClose, onError }: StartSessionOptions) => {
  const proxyBaseUrl = `${window.location.origin}/api`;
  const ai = new GoogleGenAI({ 
    apiKey: process.env.API_KEY as string,
    baseUrl: proxyBaseUrl 
  });
  
  inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
  outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  
  const stream = await navigator.mediaDevices.getUserMedia({ 
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
      sampleRate: 16000
    } 
  });
  
  const systemInstruction = `
    你是一位专业的双语英语导师 FluentGenie。
    当前话题: ${config.topic}。 
    难度等级: ${config.difficulty}。
    务必在每句英文后提供准确的中文翻译。
  `;

  const sessionPromise = ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
    callbacks: {
      onopen: () => {
        const source = inputAudioContext!.createMediaStreamSource(stream);
        const scriptProcessor = inputAudioContext!.createScriptProcessor(4096, 1, 1);
        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
          const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
          const pcmBlob = createBlob(inputData);
          sessionPromise.then((session) => {
            session.sendRealtimeInput({ media: pcmBlob });
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

        const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
        if (base64EncodedAudioString && outputAudioContext) {
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
          source.start(nextStartTime);
          nextStartTime = nextStartTime + audioBuffer.duration;
          sources.add(source);
        }
      },
      onerror: (e) => onError(e),
      onclose: () => onClose()
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
    if (inputAudioContext) inputAudioContext.close();
    if (outputAudioContext) outputAudioContext.close();
    currentSession = null;
  }
};
