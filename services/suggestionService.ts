
import { GoogleGenAI, Type } from "@google/genai";
import { TranscriptionEntry, TopicResource } from "../types";

const getAI = () => {
  const apiKey = (process.env.API_KEY && process.env.API_KEY !== 'undefined') 
    ? process.env.API_KEY 
    : 'PROXY_KEY';
    
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
  
  // 仅取最后三轮对话，减小 Context 压力
  const context = history.slice(-3).map(m => `${m.role === 'user' ? 'User' : 'Tutor'}: ${m.text}`).join('\n');
  
  const prompt = `
    Context: English tutor session about "${topic}" (${difficulty} level).
    History:
    ${context}
    
    Task: Suggest 3 very short English responses for the user to keep the conversation going.
    JSON Format: [{"phrase": "...", "translation": "...", "category": "继续追问|情绪回应|地道俚语"}]
  `;

  try {
    const response = await ai.models.generateContent({
      // 关键优化：改用 Lite 模型，拥有独立且更宽的配额
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
    console.warn("Suggestion engine busy:", err);
    if (err.message?.includes('429') || err.message?.includes('quota')) {
      throw new Error("QUOTA_LIMIT");
    }
    return [];
  }
};
