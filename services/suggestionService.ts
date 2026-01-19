
import { GoogleGenAI, Type } from "@google/genai";
import { TranscriptionEntry, TopicResource } from "../types.ts";

const getAI = () => {
  const isPreview = window.location.hostname.includes('google.com') || window.location.hostname === 'localhost';
  const aiConfig: any = { apiKey: process.env.API_KEY as string };
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
  
  const prompt = `
    You are an English conversation assistant. 
    Topic: ${topic}
    Difficulty Level: ${difficulty}
    Recent Conversation:
    ${lastMessages}

    Based on the last message from the AI (model), provide 3 natural, short English responses for the user to continue the conversation smoothly.
    - One simple response.
    - One response that asks a follow-up question.
    - One response using a common idiom or advanced phrase.
    
    Return ONLY a JSON array of objects with 'phrase', 'translation', and 'category'.
    Category should be one of: '推荐回答', '追问引导', '地道表达'.
  `;

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

    const text = response.text;
    return JSON.parse(text || "[]");
  } catch (err) {
    console.error("Suggestion generation failed", err);
    return [];
  }
};
