
import { GoogleGenAI } from "@google/genai";

const getAI = () => new GoogleGenAI({ 
  apiKey: process.env.API_KEY as string,
  baseUrl: `${window.location.origin}/api`
});

export const dictionaryAction = async (input: {
  text?: string;
  image?: string;
  mimeType?: string;
  mode: 'translate' | 'ocr' | 'handwriting' | 'identify';
}) => {
  const ai = getAI();
  const promptMap = {
    translate: "你是一个专业的英汉词典。请翻译以下内容，如果是单词，请给出音标、详细释义、例句。内容：",
    ocr: "请识别图片中的所有文字，并将其翻译成对应的中文（如果原文是中文则翻译成英文）。请保持段落结构，并列出其中的重点词汇。",
    handwriting: "这张图片里是我手写的文字，请识别它是什么词，并给出中文释义及英文例句。",
    identify: "请识别图片中的主要物体，告诉我在这种场景下相关的英文单词、常用短语及发音提示。"
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
