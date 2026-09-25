// ClaudeService.ts — Claude-powered synthesis for the RAG tutor
// Uses claude-haiku-4-5 for speed/cost efficiency in the tutor loop.
// Falls back gracefully when ANTHROPIC_API_KEY is not set.
// Called AFTER retrieval — Claude synthesizes retrieved knowledge into a natural answer.

import type { RetrievalResult } from '../../shared/types/retrieval';

// Lazy-load Anthropic so the server starts without crashing when key is missing
let anthropicClient: import('@anthropic-ai/sdk').default | null = null;

function getClient(): import('@anthropic-ai/sdk').default | null {
  if (anthropicClient) return anthropicClient;
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return null;
  try {
    // Dynamic require to avoid crashing when package not installed
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Anthropic = require('@anthropic-ai/sdk').default as typeof import('@anthropic-ai/sdk').default;
    anthropicClient = new Anthropic({ apiKey });
    return anthropicClient;
  } catch {
    return null;
  }
}

export interface ClaudeSynthesisParams {
  queryText: string;
  queryType: string;
  intentId?: string;
  retrievedSources: RetrievalResult[];
  /** Whether retrieval found any sources */
  hasGrounding: boolean;
  /** Student's struggling gestures for personalization */
  strugglingGestures?: string[];
  /** Student's strong gestures for personalization */
  strongGestures?: string[];
}

export interface ClaudeSynthesisResult {
  answer_text: string;
  used_claude: boolean;
  grounding_level: 'GROUNDED' | 'GENERAL_KNOWLEDGE' | 'FALLBACK';
}

export class ClaudeService {
  static isAvailable(): boolean {
    return !!(process.env.ANTHROPIC_API_KEY?.trim());
  }

  static async synthesize(params: ClaudeSynthesisParams): Promise<ClaudeSynthesisResult> {
    const client = getClient();

    // No API key — return null signal so caller uses template fallback
    if (!client) {
      return {
        answer_text: ClaudeService.buildTemplateFallback(params),
        used_claude: false,
        grounding_level: params.hasGrounding ? 'GROUNDED' : 'FALLBACK',
      };
    }

    try {
      const systemPrompt = ClaudeService.buildSystemPrompt(params);
      const userMessage = ClaudeService.buildUserMessage(params);

      const response = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });

      const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '';

      return {
        answer_text: text || ClaudeService.buildTemplateFallback(params),
        used_claude: true,
        grounding_level: params.hasGrounding ? 'GROUNDED' : 'GENERAL_KNOWLEDGE',
      };
    } catch (err) {
      console.error('[ClaudeService] synthesis failed:', err);
      return {
        answer_text: ClaudeService.buildTemplateFallback(params),
        used_claude: false,
        grounding_level: params.hasGrounding ? 'GROUNDED' : 'FALLBACK',
      };
    }
  }

  private static buildSystemPrompt(params: ClaudeSynthesisParams): string {
    const contextLines: string[] = [
      'You are a sign language tutor assistant for SignLoop, helping students learn Indian Sign Language (ISL) gestures.',
      'Answer in 2–4 clear, encouraging sentences. Be specific and practical.',
      'Do NOT hallucinate technique details — only use what is provided in the knowledge context below.',
    ];

    if (params.retrievedSources.length > 0) {
      contextLines.push('');
      contextLines.push('KNOWLEDGE BASE (from teacher notes and approved training):');
      params.retrievedSources.forEach((s, i) => {
        contextLines.push(`[${i + 1}] ${s.content}`);
      });
    }

    if (params.strugglingGestures?.length) {
      contextLines.push('');
      contextLines.push(`This student struggles with: ${params.strugglingGestures.join(', ')} — keep this in mind when personalizing advice.`);
    }

    if (params.strongGestures?.length) {
      contextLines.push(`This student is strong at: ${params.strongGestures.join(', ')}.`);
    }

    if (params.retrievedSources.length === 0) {
      contextLines.push('');
      contextLines.push(
        'No specific teacher notes found for this question. ' +
        'Answer from general ISL / sign language knowledge. ' +
        'If unsure about specific technique, say so and encourage the student to ask their teacher directly.'
      );
    }

    return contextLines.join('\n');
  }

  private static buildUserMessage(params: ClaudeSynthesisParams): string {
    const intent = params.intentId ? ` (related gesture: ${params.intentId})` : '';
    switch (params.queryType) {
      case 'WHY_TASK':
        return `Why am I practicing ${params.intentId ?? 'this gesture'}? ${params.queryText}`;
      case 'SHOW_REFERENCE':
        return `How do I perform the ${params.intentId ?? 'gesture'} sign${intent}? ${params.queryText}`;
      case 'WHAT_NEXT':
        return `What should I practice next? ${params.queryText}`;
      case 'PROGRESS':
        return `How am I doing with my progress? ${params.queryText}`;
      case 'ASK_TEACHER':
        return params.queryText || 'The student has a question for their teacher.';
      default:
        return params.queryText || `Tell me about the ${params.intentId ?? 'sign language'} gesture.`;
    }
  }

  /** Template-based fallback when Claude is unavailable */
  private static buildTemplateFallback(params: ClaudeSynthesisParams): string {
    if (params.retrievedSources.length === 0) {
      const label = params.queryText || (params.intentId ?? 'this');
      return `No specific notes found yet for "${label}". Ask your teacher directly. They will add guidance that the tutor can use next time.`;
    }

    const topContent = params.retrievedSources[0]?.content ?? '';
    const intentTag = params.intentId ? ` for ${params.intentId}` : '';

    switch (params.queryType) {
      case 'SHOW_REFERENCE':
        return `Technique${intentTag}: ${topContent}`;
      case 'WHY_TASK':
        return `Your teacher wants you to practice ${params.intentId ?? 'this gesture'} because: ${topContent}`;
      case 'WHAT_NEXT':
        return `Next focus: ${topContent}`;
      default:
        return topContent;
    }
  }
}
