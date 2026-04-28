import type { Context } from '@netlify/functions';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({});
const MODEL = 'gemini-2.5-flash';

interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface ChatRequest {
  context: string;
  aiPersona: string;
  messages: ChatMessage[];
  isGreeting?: boolean;
}

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let body: ChatRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { context: scenarioContext, aiPersona, messages, isGreeting } = body;
  if (!scenarioContext || !aiPersona) {
    return Response.json({ error: 'Missing scenario context or persona' }, { status: 400 });
  }

  const systemInstruction = `You are a customer interacting with an HVAC technician.
Context: ${scenarioContext}.
Your Persona: ${aiPersona}.
Rules: Keep responses to 1-3 sentences. Be realistic. Do NOT be overly helpful unless the tech uses excellent empathy and logic. If they use jargon, get confused. If they are pushy, get defensive. Always reply with at least one sentence in character — never return an empty message.${isGreeting ? ' Initiate the conversation now based on the context.' : ''}`;

  const sanitized: ChatMessage[] = Array.isArray(messages)
    ? messages
        .filter((m) => m && (m.role === 'user' || m.role === 'model'))
        .map((m) => ({
          role: m.role,
          parts: (m.parts || [])
            .map((p) => ({ text: typeof p?.text === 'string' ? p.text : '' }))
            .filter((p) => p.text.trim().length > 0),
        }))
        .filter((m) => m.parts.length > 0)
    : [];

  const contents: ChatMessage[] = sanitized.length > 0
    ? sanitized
    : [{ role: 'user', parts: [{ text: 'Hello, I am the HVAC technician arriving on site.' }] }];

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: { systemInstruction },
    });
    const text = (response.text ?? '').trim();
    if (!text) {
      return Response.json({
        text: "Sorry, I'm not sure what to say to that. Could you rephrase?",
      });
    }
    return Response.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: 'AI Gateway request failed', detail: message }, { status: 502 });
  }
};

export const config = {
  path: '/api/roleplay',
};
