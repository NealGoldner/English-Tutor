
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
  for (let i = 0; i < len; i++) { binary += String.fromCharCode(bytes[i]); }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) { bytes[i] = binaryString.charCodeAt(i); }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) { channelData[i] = dataInt16[i * numChannels + channel] / 32768.0; }
  }
  return buffer;
}

function createBlob(data: Float32Array): Blob {
  const int16 = new Int16Array(data.length);
  for (let i = 0; i < data.length; i++) { int16[i] = data[i] * 32768; }
  return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
}

export const startLiveSession = async ({ config, onTranscription, onClose, onError }: any) => {
  stopLiveSession();
  nextStartTime = 0;

  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  inputAudioContext = new AudioCtx({ sampleRate: 16000 });
  outputAudioContext = new AudioCtx({ sampleRate: 24000 });
  
  // 关键修复：同时恢复输入和输出上下文，解决移动端无声问题
  try { 
    await Promise.all([
      inputAudioContext.resume(),
      outputAudioContext.resume()
    ]);
    console.log("AudioContext 已激活");
  } catch (e) {
    console.warn("AudioContext 激活失败:", e);
  }

  try {
    currentStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log("麦克风流已获取");
  } catch (e: any) {
    const msg = e.name === 'NotAllowedError' ? "请授权麦克风权限" : "麦克风启动失败";
    onError(msg);
    throw new Error(msg);
  }

  const ai = new GoogleGenAI({ 
    apiKey: process.env.API_KEY || 'PROXY_KEY',
    baseUrl: window.location.origin + '/api'
  } as any);
  
  const systemInstruction = `你是一位专业的双语英语导师 FluentGenie。话题: "${config.topic}"。请务必在每句英文后提供中文翻译。`;

  console.log("正在通过安全隧道建立 WebSocket...");

  try {
    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      callbacks: {
        onopen: () => {
          console.log("WebSocket 通道已开启，流媒体传输启动");
          const source = inputAudioContext!.createMediaStreamSource(currentStream!);
          const scriptProcessor = inputAudioContext!.createScriptProcessor(4096, 1, 1);
          scriptProcessor.onaudioprocess = (e) => {
            if (currentSession) {
              const pcmBlob = createBlob(e.inputBuffer.getChannelData(0));
              sessionPromise.then(s => s?.sendRealtimeInput({ media: pcmBlob }));
            }
          };
          source.connect(scriptProcessor);
          scriptProcessor.connect(inputAudioContext!.destination);
        },
        onmessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.outputTranscription) onTranscription('model', message.serverContent.outputTranscription.text);
          if (message.serverContent?.inputTranscription) onTranscription('user', message.serverContent.inputTranscription.text);

          const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audioData && outputAudioContext) {
            nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
            const buffer = await decodeAudioData(decode(audioData), outputAudioContext, 24000, 1);
            const source = outputAudioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(outputAudioContext.destination);
            source.start(nextStartTime);
            nextStartTime += buffer.duration;
            sources.add(source);
          }
        },
        onerror: (e: any) => {
          console.error("WebSocket 运行时错误:", e);
          onError(`实时通话异常: ${e.message || '网络连接不稳定'}`);
        },
        onclose: () => {
          console.log("会话已正常关闭");
          onClose(false);
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

    // 延长超时时间到 25 秒，以应对跨国握手延迟
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("连接握手超时，请尝试切换网络环境（如切换 4G/5G 或 WiFi）")), 25000)
    );

    currentSession = await Promise.race([sessionPromise, timeoutPromise]);
    console.log("握手成功，Genie 已就绪");
    return { inputContext: inputAudioContext, outputContext: outputAudioContext };
  } catch (err: any) {
    console.error("连接建立过程被阻断:", err);
    onError(err.message || "由于网络环境受限，无法建立安全连接。");
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
    inputAudioContext = null;
    outputAudioContext = null;
    currentStream = null;
  }
};

export const sendImageFrame = (b64: string) => {
  currentSession?.sendRealtimeInput({ media: { data: b64, mimeType: 'image/jpeg' } });
};
