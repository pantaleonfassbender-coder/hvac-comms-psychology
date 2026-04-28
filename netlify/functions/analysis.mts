import type { Context } from '@netlify/functions';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({});
const MODEL = 'gemini-2.5-flash';

interface AnalysisRequest {
  transcript: string;
}

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    round1: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          agent: { type: Type.STRING },
          message: { type: Type.STRING },
        },
        required: ['agent', 'message'],
      },
    },
    round2: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          agent: { type: Type.STRING },
          message: { type: Type.STRING },
        },
        required: ['agent', 'message'],
      },
    },
    conclusion: {
      type: Type.OBJECT,
      properties: {
        agent: { type: Type.STRING },
        evaluation: { type: Type.STRING },
        advice: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['agent', 'evaluation', 'advice'],
    },
  },
  required: ['round1', 'round2', 'conclusion'],
};

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let body: AnalysisRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { transcript } = body;
  if (!transcript || transcript.trim().length === 0) {
    return Response.json({ error: 'Missing transcript' }, { status: 400 });
  }

  const promptText = `Analyze the following HVAC role-play transcript.
Transcript:
${transcript}

Generate a 2-round panel discussion evaluating the technician's performance, followed by a conclusion.
The agents are:
- "Customer": Focuses on their emotional reaction to the tech.
- "HVAC Tech": An experienced veteran focusing on field tactics and practicality.
- "Psychologist": An expert in Cialdini's principles of persuasion and communication models.

CRITICAL INSTRUCTION FOR CONCLUSION:
The 'conclusion' object MUST be authored by the Psychologist.
- 'evaluation': Provide a summative evaluation of the technician's performance.
- 'advice': Provide an array containing EXACTLY THREE (3) specific, actionable pieces of behavioral advice for the technician, heavily referencing Cialdini's principles of persuasion (e.g., Reciprocity, Authority, Liking, etc.).

Format the response strictly using the requested JSON schema. ALL FIELDS ARE REQUIRED.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
        responseSchema,
      },
    });

    const text = response.text ?? '';
    let analysis: unknown;
    try {
      analysis = JSON.parse(text);
    } catch {
      return Response.json({ error: 'AI returned invalid JSON', raw: text }, { status: 502 });
    }

    return Response.json(analysis);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: 'AI Gateway request failed', detail: message }, { status: 502 });
  }
};

export const config = {
  path: '/api/analysis',
};
