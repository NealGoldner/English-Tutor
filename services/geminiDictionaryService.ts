
import { GoogleGenAI } from "@google/genai";

const getAI = () => {
  // Use process.env.API_KEY directly and remove invalid baseUrl property to fix TypeScript error
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const dictionaryAction = async (input: any) => {
  const ai = getAI();
  const promptMap: any = { translate: "英汉词典。翻译并解析：", ocr: "识别并翻译：", handwriting: "识别并翻译：", identify: "识别物体并给英文名：" };
  const parts: any[] = [{ text: promptMap[input.mode] + (input.text || "") }];
  if (input.image) parts.push({ inlineData: { data: input.image, mimeType: input.mimeType || 'image/jpeg' } });

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ parts }],
  });
  return response.text;
};
