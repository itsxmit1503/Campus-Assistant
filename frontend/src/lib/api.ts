import { StructuredAnswer } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://campus-assistant-qcxy.onrender.com';

export interface ChatApiResponse extends StructuredAnswer {
  conversationId?: string;
  messageId?: string;
  serverTimestamp?: string;
}

export interface StoredChatHistoryResponse {
  conversationId: string;
  messages: Array<{
    messageId: string;
    role: 'user' | 'assistant';
    content: string;
    structuredData?: StructuredAnswer;
    createdAt: string;
  }>;
  activeContext?: any;
}

/**
 * Sends chat message with session tracking, deduplication IDs, and synchronization
 */
export async function sendChatMessage(
  message: string,
  conversationId: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  language: string = 'auto',
  clientMessageId?: string
): Promise<ChatApiResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for Render cold start & Gemini processing

    const res = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        conversationId,
        clientMessageId,
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

    const data: ChatApiResponse = await res.json();
    return data;
  } catch (error: any) {
    console.error('[Frontend API] Error reaching backend:', error);
    
    const isHindi = /[\u0900-\u097F]/.test(message) || /\b(kaha|kya|hai|batao|karna|chahiye)\b/i.test(message);

    return {
      answer: isHindi
        ? `अभी कैंपस असिस्टेंट सर्वर से कनेक्ट करने में समस्या आ रही है। कृपया कुछ देर बाद पुनः प्रयास करें या आधिकारिक वेबसाइट **dhsgsu.edu.in** देखें।`
        : `I'm having trouble connecting to the campus assistant server right now. Please try again in a moment or visit **dhsgsu.edu.in** for official university information.`,
      language: isHindi ? 'hindi' : 'english',
      intent: 'service_unavailable',
      intentCategory: 'INFORMATION',
      conversationId,
      messageId: `err_${Date.now()}`,
      serverTimestamp: new Date().toISOString(),
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

/**
 * Fetches persisted conversation history from backend
 */
export async function getChatHistory(conversationId: string): Promise<StoredChatHistoryResponse | null> {
  if (!conversationId) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/api/chat/history/${encodeURIComponent(conversationId)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('[Frontend API] Failed to fetch chat history:', err);
    return null;
  }
}

/**
 * Clears conversation data from backend session & database
 */
export async function clearChatConversation(conversationId: string): Promise<boolean> {
  if (!conversationId) return true;
  try {
    const res = await fetch(`${API_BASE_URL}/api/chat/history/${encodeURIComponent(conversationId)}`, {
      method: 'DELETE'
    });
    return res.ok;
  } catch (err) {
    console.warn('[Frontend API] Failed to delete conversation on server:', err);
    return false;
  }
}
