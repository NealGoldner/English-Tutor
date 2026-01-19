
import { GoogleGenAI, Type } from "@google/genai";
import { TranscriptionEntry, TopicResource } from "../types.ts";

const getAI = () => {
  const isPreview = window.location.hostname.includes('google.com') || window.location.hostname === 'localhost';
  const apiKey = process.env.API_KEY || 'API_KEY_PLACEHOLDER';
  const aiConfig: any = { apiKey };
  if (!isPreview) {
    aiConfig.baseUrl = `${window.location.origin}/api`;
  }
  return new GoogleGenAI(aiConfig);
};

export const generateLiveSuggestions = async (
  topic: string,
  difficulty: string,
  history: TranscriptionEntry[]
): Promise<TopicResource[]> => {
  if (history.length === 0) return [];

  const ai = getAI();
  const lastMessages = history.slice(-3).map(m => `${m.role}: ${m.text}`).join('\n');
  
  const prompt = `Based on the English conversation about "${topic}", provide 3 short response options. JSON only.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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

    return JSON.parse(response.text || "[]");
  } catch (err) {
    return [];
  }
};
