
import { GoogleGenAI, Type } from "@google/genai";
import { TranscriptionEntry, TopicResource } from "../types";

// Standard client initialization using environment API key
const getAI = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateLiveSuggestions = async (
  topic: string, 
  difficulty: string, 
  personality: string,
  history: TranscriptionEntry[]
): Promise<TopicResource[]> => {
  if (history.length === 0) return [];

  const ai = getAI();
  
  // Extract recent conversation context
  const context = history.slice(-5).map(m => `${m.role === 'user' ? 'User' : 'Tutor'}: ${m.text}`).join('\n');
  const lastTutorMessage = history.filter(h => h.role === 'model').pop()?.text || "";
  
  const prompt = `
    You are an Elite Language Coach. Your mission is to provide 3 "Killer Responses" for the User to use against their AI Tutor.
    
    [CONTEXT]
    Current Topic: ${topic}
    Current Proficiency Level: ${difficulty}
    AI Tutor Personality: ${personality}
    Last Tutor Message: "${lastTutorMessage}"
    
    [FULL HISTORY]
    ${context}
    
    [STRICT RULES FOR SUGGESTIONS]
    1. NO FLUFF: Strictly forbidden to use phrases like "I agree", "That's good", "Yes/No", "I don't know".
    2. LOGICAL ALIGNMENT: The suggestion MUST directly address the points raised in the [Last Tutor Message].
    3. ADVANCED VOCABULARY: Use collocations and idiomatic expressions suitable for "${difficulty}" level.
    4. VARIETY:
       - Response 1 (Analytical): A structured personal opinion starting with phrases like "From my perspective...", "One nuance to consider is..."
       - Response 2 (Inquisitive): A deep follow-up question that challenges the Tutor's logic or asks for details.
       - Response 3 (Native/Idiomatic): A very natural, colloquial expression an American/Brit would use in this specific scenario.
    5. TRANSLATION: Chinese translations must be natural and capture the "vibe" or underlying intent.
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
              phrase: { type: Type.STRING, description: "The sophisticated English response." },
              translation: { type: Type.STRING, description: "Nuanced Chinese translation." },
              category: { type: Type.STRING, description: "One of: 深层表达, 逻辑追问, 地道俚语" }
            },
            required: ["phrase", "translation", "category"]
          }
        }
      }
    });

    const jsonStr = response.text?.trim();
    if (!jsonStr) return [];
    
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error("High-quality suggestion generation error:", err);
    return [];
  }
};
