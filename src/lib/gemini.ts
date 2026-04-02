import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || "" });

export interface AgendaItem {
  title: string;
  description: string;
  duration: number; // in minutes
  stakeholders: string[];
}

export interface MeetingAgenda {
  title: string;
  stakeholders: string[];
  items: AgendaItem[];
  summary: string;
}

export async function generateAgendaFromDoc(fileData: string, mimeType: string): Promise<MeetingAgenda> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            inlineData: {
              data: fileData,
              mimeType: mimeType,
            },
          },
          {
            text: "Analyze this document and generate a structured meeting agenda. Identify the main stakeholders, the topics to cover, and suggest a duration for each topic. Return the result in JSON format.",
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          stakeholders: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                duration: { type: Type.NUMBER },
                stakeholders: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ["title", "description", "duration", "stakeholders"],
            },
          },
          summary: { type: Type.STRING },
        },
        required: ["title", "stakeholders", "items", "summary"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
}

export async function chatAboutAgenda(agenda: MeetingAgenda, history: { role: "user" | "model"; text: string }[], message: string) {
  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: `You are an expert meeting facilitator. You help users refine their meeting agendas. 
      The current agenda is: ${JSON.stringify(agenda)}. 
      Be concise, professional, and helpful. If the user asks to change something, explain how it would impact the timeline.`,
    },
  });

  // Convert history to the format expected by the SDK
  const formattedHistory = history.map(h => ({
    role: h.role,
    parts: [{ text: h.text }]
  }));

  // Note: In this version of the SDK, we might need to send the history as part of the contents or use a specific chat session.
  // For simplicity, we'll just send the message.
  const response = await chat.sendMessage({ message });
  return response.text;
}
