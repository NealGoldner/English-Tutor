
import { GoogleGenAI } from "@google/genai";

const getAI = () => {
  const isPreview = window.location.hostname.includes('google.com') || window.location.hostname === 'localhost';
  const apiKey = process.env.API_KEY || 'API_KEY_PLACEHOLDER';
  const aiConfig: any = { apiKey };
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
    translate: "英汉词典。翻译并解析：",
    ocr: "图片文字识别并翻译：",
    handwriting: "手写识别并翻译：",
    identify: "识别物体并给英文名："
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
