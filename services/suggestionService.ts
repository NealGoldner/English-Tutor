
import { GoogleGenAI, Type } from "@google/genai";
import { TranscriptionEntry, TopicResource } from "../types";

// Always use {apiKey: process.env.API_KEY} for GoogleGenAI initialization.
// Removed 'baseUrl' as it is not a recognized property in GoogleGenAIOptions.
const getAI = () => {
  return new GoogleGenAI({ 
    apiKey: process.env.API_KEY
  });
};

export const generateLiveSuggestions = async (
  topic: string, 
  difficulty: string, 
  personality: string,
  history: TranscriptionEntry[]
): Promise<TopicResource[]> => {
  if (history.length === 0) return [];

  const ai = getAI();
  
  // 仅取最后 3 轮对话，减少上下文大小，加快生成速度
  const context = history.slice(-3).map(m => `${m.role === 'user' ? 'User' : 'Tutor'}: ${m.text}`).join('\n');
  const lastTutorMessage = history.filter(h => h.role === 'model').slice(-1)[0]?.text || "";
  
  const prompt = `
    As an English Coach, suggest 3 natural responses for the User.
    Context: Topic "${topic}", Level "${difficulty}", History:
    ${context}
    
    Last Tutor Message: "${lastTutorMessage}"
    
    Rules:
    1. Short, high-impact phrases.
    2. Provide natural Chinese translations.
    3. Category must be: 深层表达, 逻辑追问, or 地道俚语.
  `;

  try {
    const response = await ai.models.generateContent({
      // 使用更快速、配额更宽的 Flash Lite 模型
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
    console.warn("Suggestion service error:", err);
    // 如果是配额超限，向上抛出特定提示
    if (err.message?.includes('429') || err.message?.includes('quota')) {
      throw new Error("QUOTA_LIMIT");
    }
    return [];
  }
};
