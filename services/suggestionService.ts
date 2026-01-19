
import { GoogleGenAI, Type } from "@google/genai";
import { TranscriptionEntry, TopicResource } from "../types.ts";

const getAI = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateLiveSuggestions = async (
  topic: string, 
  difficulty: string, 
  history: TranscriptionEntry[]
): Promise<TopicResource[]> => {
  if (history.length === 0) return [];

  const ai = getAI();
  
  // 提取最近的对话历史作为上下文
  const context = history.slice(-6).map(m => `${m.role === 'user' ? 'User' : 'Tutor'}: ${m.text}`).join('\n');
  
  const prompt = `
    You are an expert English Tutor. Based on the conversation history below about the topic "${topic}", 
    generate 3 high-quality, natural, and helpful response suggestions for the User to say next.
    
    Current Proficiency Level: ${difficulty}
    
    Rules for suggestions:
    1. MUST be contextually relevant to the LAST message from the Tutor.
    2. Provide 3 distinct types of responses:
       - Type A: A natural reaction or emotional response (Category: "情绪回应")
       - Type B: A follow-up question to keep the conversation going (Category: "继续追问")
       - Type C: A more complex statement or personal opinion (Category: "深层表达")
    3. Ensure the vocabulary and grammar match the "${difficulty}" level.
    4. Provide a natural Chinese translation for each.
    
    Conversation History:
    ${context}
    
    Output MUST be JSON.
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
              phrase: { type: Type.STRING, description: "The English phrase suggested." },
              translation: { type: Type.STRING, description: "Chinese translation." },
              category: { type: Type.STRING, description: "One of: 情绪回应, 继续追问, 深层表达" }
            },
            required: ["phrase", "translation", "category"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    
    // 清理可能存在的 markdown 代码块标记
    const cleanedJson = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanedJson);
  } catch (err) {
    console.error("Suggestion generation error:", err);
    return [];
  }
};
