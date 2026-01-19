
import { GoogleGenAI, Type } from "@google/genai";
import { TranscriptionEntry, TopicResource } from "../types";

const getAI = () => {
  const apiKey = (process.env.API_KEY && process.env.API_KEY !== 'undefined') 
    ? process.env.API_KEY 
    : 'EMPTY_KEY_USE_PROXY_INJECTION';
    
  return new GoogleGenAI({ 
    apiKey: apiKey,
    baseUrl: `${window.location.origin}/api`
  } as any);
};

export const generateLiveSuggestions = async (
  topic: string, 
  difficulty: string, 
  personality: string,
  history: TranscriptionEntry[]
): Promise<TopicResource[]> => {
  if (history.length === 0) return [];

  const ai = getAI();
  
  // 提取最后几轮对话作为背景
  const context = history.slice(-3).map(m => `${m.role === 'user' ? 'User' : 'Tutor'}: ${m.text}`).join('\n');
  
  const prompt = `
    Based on the conversation context, provide 3 high-quality English response suggestions for the Learner.
    Topic: "${topic}", Level: "${difficulty}"
    History:
    ${context}
    
    Rules:
    1. Return JSON array.
    2. Category MUST be: '继续追问', '情绪回应', '地道俚语'.
    3. Keep responses natural and very short.
  `;

  try {
    const response = await ai.models.generateContent({
      // 使用 Flash Lite 模型：更省配额，响应极快
      model: 'gemini-flash-lite-latest',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              phrase: { type: Type.STRING },
              translation: { type: Type.STRING },
              category: { type: Type.STRING }
            },
            required: ["phrase", "translation", "category"]
          }
        }
      }
    });

    const jsonStr = response.text?.trim();
    if (!jsonStr) return [];
    
    return JSON.parse(jsonStr);
  } catch (err: any) {
    console.warn("Suggestion fetch error:", err);
    if (err.message?.includes('429') || err.message?.includes('quota')) {
      throw new Error("QUOTA_LIMIT");
    }
    return [];
  }
};
