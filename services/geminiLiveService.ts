
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { TutorConfig } from '../types';

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
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
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

/**
 * 带有噪声抑制效果的 PCM 转换
 */
function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  
  // 噪声门限：如果最大振幅非常小，则视为静音
  let maxAmplitude = 0;
  for (let i = 0; i < l; i++) {
    maxAmplitude = Math.max(maxAmplitude, Math.abs(data[i]));
  }
  
  const isSilence = maxAmplitude < 0.008; // 极其微弱的声音会被判定为静音

  for (let i = 0; i < l; i++) {
    // 如果被判定为静音，则发送纯静音数据以保持流的连贯性
    int16[i] = isSilence ? 0 : data[i] * 32768;
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
  
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'FluentGenie - 英语口语练习',
      artist: `${config.topic} (${config.difficulty})`,
      album: 'AI 英语导师',
    });
  }

  // 强化麦克风流约束：开启硬件降噪和回声消除
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
    
    核心教学原则：
    1. ${config.isTranslationMode ? "务必在每句英文后立即提供准确的中文翻译。" : "以英文交流为主，仅在用户困惑或要求时提供中文翻译。"}
    2. ${config.isCorrectionMode ? `
    [实时纠错开启]：
    - 仔细监听用户的发音、语法和单词选择。
    - 如果用户出错，请礼貌地打断或在回答前先指出错误。
    - 详细解释为什么那是错的，并提供 2-3 种更地道的表达方式。
    - 针对发音问题，用文字描述纠音要点（如：注意 L 和 R 的区别）。
    ` : "保持对话流畅，只有在严重影响理解时才进行纠错。"}
    3. 环境适应：如果你在音频中听到背景杂音，请忽略它们，只关注并响应最响亮的、清晰的用户人声。
    4. 如果用户说中文，将其翻译成英文并引导用户模仿跟读。
    5. 视觉交互：收到照片时，用英文和中文描述内容，并以此展开教学。
    6. 回复要简练，适合语音交流。
  `;

  const sessionPromise = ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
    callbacks: {
      onopen: () => {
        const source = inputAudioContext!.createMediaStreamSource(stream);
        const scriptProcessor = inputAudioContext!.createScriptProcessor(4096, 1, 1);
        
        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
          if (inputAudioContext?.state === 'suspended') inputAudioContext.resume();
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
          if (outputAudioContext.state === 'suspended') await outputAudioContext.resume();
          
          nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
          const audioBuffer = await decodeAudioData(
            decode(base64EncodedAudioString),
            outputAudioContext,
            24000,
            1,
          );
          const source = outputAudioContext.createBufferSource();
          source.buffer = audioBuffer;
          const outputNode = outputAudioContext.createGain();
          source.connect(outputNode);
          outputNode.connect(outputAudioContext.destination);
          
          source.addEventListener('ended', () => {
            sources.delete(source);
          });

          source.start(nextStartTime);
          nextStartTime = nextStartTime + audioBuffer.duration;
          sources.add(source);
        }

        if (message.serverContent?.interrupted) {
          for (const source of sources.values()) {
            try { source.stop(); } catch(e) {}
            sources.delete(source);
          }
          nextStartTime = 0;
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
  
  return {
    inputContext: inputAudioContext,
    outputContext: outputAudioContext
  };
};

export const stopLiveSession = () => {
  if (currentSession) {
    if (inputAudioContext) inputAudioContext.close();
    if (outputAudioContext) outputAudioContext.close();
    currentSession = null;
    inputAudioContext = null;
    outputAudioContext = null;
    nextStartTime = 0;
    sources.forEach(s => { try { s.stop(); } catch(e) {} });
    sources.clear();
  }
};
