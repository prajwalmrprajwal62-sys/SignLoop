// GeminiService.ts — Gemini-powered synthesis for the RAG tutor
// Uses gemini-2.5-flash for speed/cost efficiency in the tutor loop.
// Falls back gracefully when GEMINI_API_KEY is not set.

import { createRequire } from 'module';
import type { RetrievalResult } from '../../shared/types/retrieval';

const _require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const { GoogleGenerativeAI } = _require('@google/generative-ai') as typeof import('@google/generative-ai');

type GenAIClient = InstanceType<typeof GoogleGenerativeAI>;
let genAIClient: GenAIClient | null = null;

function getClient(): GenAIClient | null {
  if (genAIClient) return genAIClient;
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  genAIClient = new GoogleGenerativeAI(apiKey);
  return genAIClient;
}

export interface GeminiSynthesisParams {
  queryText: string;
  queryType: string;
  intentId?: string;
  retrievedSources: RetrievalResult[];
  hasGrounding: boolean;
  strugglingGestures?: string[];
  strongGestures?: string[];
}

export interface GeminiSynthesisResult {
  answer_text: string;
  used_gemini: boolean;
  grounding_level: 'GROUNDED' | 'GENERAL_KNOWLEDGE' | 'FALLBACK';
}

export class GeminiService {
  static isAvailable(): boolean {
    return !!(process.env.GEMINI_API_KEY?.trim());
  }

  static async synthesize(params: GeminiSynthesisParams): Promise<GeminiSynthesisResult> {
    const client = getClient();
    if (!client) {
      return {
        answer_text: GeminiService.buildTemplateFallback(params),
        used_gemini: false,
        grounding_level: params.hasGrounding ? 'GROUNDED' : 'FALLBACK',
      };
    }

    try {
      const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const prompt = GeminiService.buildPrompt(params);
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      return {
        answer_text: text || GeminiService.buildTemplateFallback(params),
        used_gemini: true,
        grounding_level: params.hasGrounding ? 'GROUNDED' : 'GENERAL_KNOWLEDGE',
      };
    } catch (err) {
      console.error('[GeminiService] synthesis failed:', err);
      return {
        answer_text: GeminiService.buildTemplateFallback(params),
        used_gemini: false,
        grounding_level: params.hasGrounding ? 'GROUNDED' : 'FALLBACK',
      };
    }
  }

  private static buildPrompt(params: GeminiSynthesisParams): string {
    const lines: string[] = [];

    lines.push('You are an expert sign language tutor assistant for SignLoop, helping students learn Indian Sign Language (ISL).');
    lines.push('Answer in 2–4 clear, practical, encouraging sentences. Be specific about technique. Do not say "I" repeatedly.');

    if (params.retrievedSources.length > 0) {
      lines.push('');
      lines.push('Use only the following knowledge base to answer. Do not add information not present below:');
      params.retrievedSources.forEach((s, i) => {
        lines.push(`[${i + 1}] ${s.content}`);
      });
    } else {
      lines.push('');
      lines.push('No specific notes found in the knowledge base. Answer from general ISL / sign language knowledge. If unsure about a specific technique, say so honestly and suggest the student ask their teacher in the "Ask Your Teacher" section of their Review page.');
    }

    if (params.strugglingGestures?.length) {
      lines.push('');
      lines.push(`Note: This student struggles with: ${params.strugglingGestures.join(', ')}. Keep this in mind to personalize advice.`);
    }
    if (params.strongGestures?.length) {
      lines.push(`This student is strong at: ${params.strongGestures.join(', ')}.`);
    }

    lines.push('');
    lines.push('---');

    // Build the user question based on query type
    const intent = params.intentId ? ` the ${params.intentId} sign` : ' this sign';
    switch (params.queryType) {
      case 'SHOW_REFERENCE':
        lines.push(`Student wants to know: How do I correctly perform${intent}?`);
        break;
      case 'WHY_TASK':
        lines.push(`Student asks: ${params.queryText || `Why am I practicing${intent}?`}`);
        break;
      case 'WHAT_NEXT':
        lines.push(`Student asks: What should I practice next?`);
        break;
      case 'PROGRESS':
        lines.push(`Student asks: How is my progress going?`);
        break;
      default:
        lines.push(`Student asks: ${params.queryText || `Tell me about${intent}.`}`);
    }

    lines.push('');
    lines.push('Give a direct, helpful answer:');

    return lines.join('\n');
  }

  /** Template-based fallback when Gemini is unavailable — still useful for demo */
  static buildTemplateFallback(params: GeminiSynthesisParams): string {
    if (params.retrievedSources.length === 0) {
      const label = params.queryText || (params.intentId ?? 'this gesture');
      return `I don't have specific notes on "${label}" yet. Try asking in the Ask Your Teacher section of your Review page — your teacher's answer will automatically train the tutor for future questions.`;
    }

    const top = params.retrievedSources[0]?.content ?? '';
    switch (params.queryType) {
      case 'SHOW_REFERENCE': return top;
      case 'WHY_TASK': return `About ${params.intentId ?? 'this gesture'}: ${top}`;
      case 'WHAT_NEXT': return `Next focus: ${top}`;
      default: return top;
    }
  }
}
