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
    // FIX P0.2: Gemini is a rewriting layer over retrieved evidence, NOT an evidence source.
    // If no local sources were retrieved, skip Gemini entirely — return FALLBACK immediately.
    // This prevents GENERAL_KNOWLEDGE answers from being mislabelled as GROUNDED.
    if (!params.hasGrounding) {
      return {
        answer_text: GeminiService.buildTemplateFallback(params),
        used_gemini: false,
        grounding_level: 'FALLBACK',
      };
    }

    const client = getClient();
    if (!client) {
      return {
        answer_text: GeminiService.buildTemplateFallback(params),
        used_gemini: false,
        grounding_level: 'GROUNDED', // Has local sources — template answer is grounded
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
        grounding_level: 'GROUNDED', // We only reach here when local sources exist
      };
    } catch (err) {
      console.error('[GeminiService] synthesis failed:', err);
      return {
        answer_text: GeminiService.buildTemplateFallback(params),
        used_gemini: false,
        grounding_level: 'GROUNDED', // Local sources exist — template answer is grounded
      };
    }
  }

  private static buildPrompt(params: GeminiSynthesisParams): string {
    const lines: string[] = [];

    // System role + STRICT formatting instructions
    lines.push('You are an expert Sign Language tutor for SignLoop, helping students learn Indian Sign Language (ISL).');
    lines.push('');
    lines.push('STRICT OUTPUT FORMAT — You MUST follow these rules exactly:');
    lines.push('1. Use **bold** (double asterisks) for all key terms, gesture names, hand positions, and important instructions.');
    lines.push('2. Use numbered steps (1., 2., 3.) for any sequence or technique. Never write a wall of text.');
    lines.push('3. Start each major section with a relevant emoji. Use these emojis:');
    lines.push('   🤚 for hand position/shape');
    lines.push('   👆 for finger placement');
    lines.push('   🔄 for movement/motion');
    lines.push('   ⚠️ for common mistakes');
    lines.push('   💡 for tips/advice');
    lines.push('   ✅ for correct technique');
    lines.push('   📍 for location/placement');
    lines.push('   🎯 for practice goal');
    lines.push('4. Keep the total response under 150 words. Be concise and specific.');
    lines.push('5. End with one short encouraging sentence using ✨.');
    lines.push('6. Do NOT use paragraphs. Use only numbered steps and emoji-prefixed lines.');

    if (params.retrievedSources.length > 0) {
      lines.push('');
      lines.push('KNOWLEDGE BASE — Use ONLY this content. Do not add anything not present here:');
      params.retrievedSources.forEach((s, i) => {
        lines.push(`[Source ${i + 1}]: ${s.content}`);
      });
    }

    if (params.strugglingGestures?.length) {
      lines.push('');
      lines.push(`PERSONALIZATION: This student struggles with **${params.strugglingGestures.join('**, **')}**. Address these specifically if relevant.`);
    }
    if (params.strongGestures?.length) {
      lines.push(`This student is already strong at: ${params.strongGestures.join(', ')}. Build on their strengths.`);
    }

    lines.push('');
    lines.push('---');
    lines.push('STUDENT QUESTION:');

    // Build the user question based on query type
    const intent = params.intentId ? ` the **${params.intentId}** sign` : ' this sign';
    switch (params.queryType) {
      case 'SHOW_REFERENCE':
        lines.push(`How do I correctly perform${intent}? Give me step-by-step technique with hand position, movement, and common mistakes.`);
        break;
      case 'WHY_TASK':
        lines.push(params.queryText
          ? `${params.queryText} — Answer using step-by-step format with emojis.`
          : `Why am I practicing${intent}? What should I focus on?`);
        break;
      case 'WHAT_NEXT':
        lines.push(`What should I practice next to improve${intent}?`);
        break;
      case 'PROGRESS':
        lines.push(`Student asks: How is my progress going?`);
        break;
      default:
        lines.push(`${params.queryText || `Tell me about${intent}.`} — Use step-by-step format with emojis and bold key terms.`);
    }

    lines.push('');
    lines.push('Answer now using the format rules above (emojis, numbered steps, **bold** key terms, under 150 words):');

    return lines.join('\n');
  }

  /** Template-based fallback when Gemini is unavailable — still useful for demo */
  static buildTemplateFallback(params: GeminiSynthesisParams): string {
    if (params.retrievedSources.length === 0) {
      const label = params.queryText || (params.intentId ?? 'this gesture');
      return `💡 **No notes found yet** for "${label}".\n\n🎯 **Next step:** Head to **My Review → Ask Your Teacher** to send a question. Your teacher's answer will automatically train the tutor for future students!`;
    }

    const top = params.retrievedSources[0]?.content ?? '';
    switch (params.queryType) {
      case 'SHOW_REFERENCE': return `✅ **Technique — ${params.intentId ?? 'Sign'}:**\n\n${top}`;
      case 'WHY_TASK': return `🎯 **About ${params.intentId ?? 'this gesture'}:**\n\n${top}`;
      case 'WHAT_NEXT': return `📍 **Next focus:**\n\n${top}`;
      default: return top;
    }
  }
}
