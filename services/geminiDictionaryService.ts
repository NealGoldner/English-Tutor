
import { GoogleGenAI } from "@google/genai";

const getAI = () => {
  const isPreview = window.location.hostname.includes('google.com') || window.location.hostname === 'localhost';
  const aiConfig: any = { apiKey: process.env.API_KEY as string };
  if (!isPreview) {
    aiConfig.baseUrl = `${window.location.origin}/api`;
  }
  return new GoogleGenAI(aiConfig);
};

export const dictionaryAction = async (input: {
  text?: string;
  image?: string;
  mimeType?: string;
  mode: 'translate' | 'ocr' | 'handwriting' | 'identify';
}) => {
  const ai = getAI();
  const promptMap = {
    translate: "你是一个专业的英汉词典。请翻译以下内容，如果是单词，请给出音标、详细释义、例句。内容：",
    ocr: "请识别图片中的所有文字，并将其翻译成对应的中文。请列出重点词汇。",
    handwriting: "这张图片里是我手写的文字，请识别它是什么，并给出中文释义。",
    identify: "请识别图片中的物体，给出英文单词及发音提示。"
  };

  const parts: any[] = [{ text: promptMap[input.mode] + (input.text || "") }];
  
  if (input.image) {
    parts.push({
      inlineData: {
        data: input.image,
        mimeType: input.mimeType || 'image/jpeg'
      }
    });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ parts }],
  });

  return response.text;
};
