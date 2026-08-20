import { StructuredAnswer } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function sendChatMessage(
  message: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  language: string = 'auto'
): Promise<StructuredAnswer> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout for Gemini + cold start

    const res = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        conversationHistory,
        language
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `API responded with status: ${res.status}`);
    }

    const data: StructuredAnswer = await res.json();
    return data;
  } catch (error: any) {
    console.error('[Frontend API] Error reaching backend:', error);
    
    // Honest error reporting — NEVER fake canned "Haan bolo" or "Sure, go ahead" replies!
    const isHindi = /[\u0900-\u097F]/.test(message) || /\b(kaha|kya|hai|batao|karna|chahiye)\b/i.test(message);

    return {
      answer: isHindi
        ? `अभी कैंपस असिस्टेंट सर्वर से कनेक्ट करने में समस्या आ रही है। कृपया कुछ देर बाद पुनः प्रयास करें या आधिकारिक वेबसाइट **dhsgsu.edu.in** देखें।`
        : `I'm having trouble connecting to the campus assistant server right now. Please try again in a moment or visit **dhsgsu.edu.in** for official university information.`,
      language: isHindi ? 'hindi' : 'english',
      intent: 'service_unavailable',
      intentCategory: 'INFORMATION',
      display: {
        responsibleUnit: false,
        location: false,
        contact: false,
        documents: false,
        nextSteps: false,
        sources: true,
        relatedTopics: false
      },
      sources: [
        {
          title: 'DHSGSU Official Website',
          url: 'https://dhsgsu.edu.in',
          sourceType: 'official',
          verified: true
        }
      ]
    };
  }
}
