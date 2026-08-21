/**
 * Anti-Spam & Duplicate Query Management Service
 * Protects API quotas, prevents flood attacks, and gracefully handles repetitive user queries.
 */

import { StructuredAnswer } from '../types/index.js';

interface ClientRateLimitRecord {
  timestamps: number[];
  lastQuery: string;
  repeatCount: number;
}

const clientTracking = new Map<string, ClientRateLimitRecord>();

// Clean up stale client records every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of clientTracking.entries()) {
    if (record.timestamps.length === 0 || now - record.timestamps[record.timestamps.length - 1] > 10 * 60 * 1000) {
      clientTracking.delete(key);
    }
  }
}, 10 * 60 * 1000);

export class SpamProtectionService {
  /**
   * Checks if the incoming request is spamming / rate-limited
   */
  checkRateLimit(clientId: string): { isRateLimited: boolean; retryAfterSeconds?: number; reason?: string } {
    const now = Date.now();
    let record = clientTracking.get(clientId);

    if (!record) {
      record = { timestamps: [now], lastQuery: '', repeatCount: 0 };
      clientTracking.set(clientId, record);
      return { isRateLimited: false };
    }

    // Filter timestamps within sliding 30-second window
    record.timestamps = record.timestamps.filter(t => now - t <= 30000);
    record.timestamps.push(now);

    // Limit: Max 15 messages per 30 seconds
    if (record.timestamps.length > 15) {
      const oldestInWindow = record.timestamps[0];
      const waitTime = Math.ceil((30000 - (now - oldestInWindow)) / 1000);
      return {
        isRateLimited: true,
        retryAfterSeconds: Math.max(waitTime, 1),
        reason: 'Too many messages sent in a short period.'
      };
    }

    return { isRateLimited: false };
  }

  /**
   * Checks if the user is asking the exact same question repeatedly
   */
  checkRepeatedQuery(
    clientId: string,
    query: string,
    lastAssistantAnswer?: StructuredAnswer
  ): {
    isRepeated: boolean;
    repeatCount: number;
    customResponse?: StructuredAnswer;
  } {
    const cleanQ = query.trim().toLowerCase();
    let record = clientTracking.get(clientId);

    if (!record) {
      record = { timestamps: [Date.now()], lastQuery: cleanQ, repeatCount: 1 };
      clientTracking.set(clientId, record);
      return { isRepeated: false, repeatCount: 1 };
    }

    if (record.lastQuery === cleanQ) {
      record.repeatCount += 1;
    } else {
      record.lastQuery = cleanQ;
      record.repeatCount = 1;
      return { isRepeated: false, repeatCount: 1 };
    }

    const isHindi = /[\u0900-\u097F]/.test(query) || /\b(kaha|kya|hai|batao|karna|chahiye)\b/i.test(query);

    // 1st Repeat: Return previous verified response instantly from cache
    if (record.repeatCount === 2 && lastAssistantAnswer) {
      return {
        isRepeated: true,
        repeatCount: 2,
        customResponse: lastAssistantAnswer
      };
    }

    // 2nd Repeat: Return polite reminder with the verified details
    if (record.repeatCount === 3 && lastAssistantAnswer) {
      const reminderText = isHindi
        ? `मैंने इस प्रश्न का आधिकारिक उत्तर ऊपर साझा कर दिया है:\n\n${lastAssistantAnswer.answer}\n\nयदि आपको किसी विशेष विवरण (जैसे समय, HOD संपर्क या रास्ता) की आवश्यकता है, तो कृपया पूछें!`
        : `I've shared the official details for this above:\n\n${lastAssistantAnswer.answer}\n\nIf you need specific follow-up details (like office hours, HOD contact, or directions), please feel free to ask!`;

      return {
        isRepeated: true,
        repeatCount: 3,
        customResponse: {
          ...lastAssistantAnswer,
          answer: reminderText
        }
      };
    }

    // 3+ Repeats: Return helpful spam throttle
    if (record.repeatCount >= 4) {
      const spamResponse: StructuredAnswer = {
        answer: isHindi
          ? `ऐसा लगता है कि आपने यह प्रश्न कई बार दोहराया है। आप इसका पूरा उत्तर ऊपर देख सकते हैं। यदि आपके पास किसी अन्य विभाग या सुविधा के बारे में नया प्रश्न है, तो बेझिझक पूछें!`
          : `It looks like you've asked this question multiple times. You can see the full verified response right above. Feel free to ask a new question about any other department, course, or facility!`,
        language: isHindi ? 'hindi' : 'english',
        intent: 'repeated_query_throttle',
        intentCategory: 'CASUAL_CONVERSATION',
        display: {
          responsibleUnit: false,
          location: false,
          contact: false,
          documents: false,
          nextSteps: false,
          sources: false,
          relatedTopics: false
        }
      };

      return {
        isRepeated: true,
        repeatCount: record.repeatCount,
        customResponse: spamResponse
      };
    }

    return { isRepeated: false, repeatCount: record.repeatCount };
  }
}

export const spamProtectionService = new SpamProtectionService();
