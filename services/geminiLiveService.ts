
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
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) { bytes[i] = binaryString.charCodeAt(i); }
  return bytes;
}

// Custom PCM decoding function for raw audio streams
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

  const isPreviewEnv = window.location.hostname.includes('de5.net') || window.location.hostname.includes('aistudio');
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  inputAudioContext = new AudioCtx({ sampleRate: 16000 });
  outputAudioContext = new AudioCtx({ sampleRate: 24000 });
  
  try { 
    await Promise.all([inputAudioContext.resume(), outputAudioContext.resume()]);
  } catch (e) { console.warn("音频上下文启动受阻", e); }

  try {
    currentStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e: any) {
    const msg = e.name === 'NotAllowedError' ? "请在浏览器地址栏点击锁头图标，授权麦克风权限。" : "无法访问麦克风。";
    onError(msg);
    throw new Error(msg);
  }

  // Guidelines: Always use new GoogleGenAI({apiKey: process.env.API_KEY})
  const ai = new GoogleGenAI({ 
    apiKey: process.env.API_KEY,
    ...(isPreviewEnv ? {} : { baseUrl: window.location.origin + '/api' })
  } as any);
  
  // Personality definitions for the tutor
  const personalityPrompts: Record<string, string> = {
    '幽默达人': "你是一个极其幽默、爱开玩笑且充满活力的英语导师。你会使用有趣的表情符号和地道的俚语。如果对话变得枯燥，请立刻通过讲冷笑话或分享趣事来打破僵局。翻译也要翻译得有梗一些。",
    '电影编剧': "你是一个富有戏剧感的创意编剧。对话中你喜欢随时开启角色扮演模式（比如：突然假装我们在太空旅行）。你会用丰富的辞藻描述场景，引导用户进入虚构故事中学习英文。",
    '严厉教官': "你是一个极其追求完美的英语教官，虽然严厉但很有魅力。你会纠正用户每一个细微的发音或语法错误，要求用户重新朗读。你的赞美非常珍贵，但一旦给出，说明用户表现真的棒极了。"
  };

  const systemInstruction = `
    你现在是 FluentGenie，身份是：${personalityPrompts[config.personality || '幽默达人']}。
    
    核心规则：
    1. 话题背景："${config.topic}"。难度等级：${config.difficulty}。
    2. 禁止枯燥：绝对不要只说“How are you?”或重复用户的话。要主动挑起话题，提出意想不到的后续问题。
    3. 双语教学：每一句英文回复后必须紧跟对应的中文翻译。
    4. 情绪互动：在文本回复中适度加入 emoji，增加视觉上的亲和力。
    5. 视觉分析：如果用户上传了照片，请用最惊叹的语气进行描述并教学。
  `.trim();

  try {
    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      callbacks: {
        onopen: () => {
          console.log("WebSocket 连接成功");
          const source = inputAudioContext!.createMediaStreamSource(currentStream!);
          const scriptProcessor = inputAudioContext!.createScriptProcessor(4096, 1, 1);
          scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmBlob = createBlob(inputData);
            // CRITICAL: Ensure data is streamed only after session promise resolves
            sessionPromise.then(session => {
              if (session) session.sendRealtimeInput({ media: pcmBlob });
            });
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
            
            source.onended = () => sources.delete(source);
          }

          if (message.serverContent?.interrupted) {
            sources.forEach(s => s.stop());
            sources.clear();
            nextStartTime = 0;
          }
        },
        onerror: (e: any) => onError(`通话中断: ${e.message || '请检查您的网络连接'}`),
        onclose: () => onClose(false)
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voice } } },
        systemInstruction,
        outputAudioTranscription: {},
        inputAudioTranscription: {},
      },
    });

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("连接服务超时，请确保网络环境。")), 15000)
    );

    currentSession = await Promise.race([sessionPromise, timeoutPromise]);
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
    inputAudioContext = null;
    outputAudioContext = null;
    currentStream = null;
  }
};

export const sendImageFrame = (b64: string) => {
  if (currentSession) {
    currentSession.sendRealtimeInput({ media: { data: b64, mimeType: 'image/jpeg' } });
  }
};
