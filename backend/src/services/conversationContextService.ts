import { ConversationModel } from '../db/models/index.js';
import { isDbConnected } from '../db/connection.js';
import { StructuredAnswer } from '../types/index.js';

export interface ActiveConversationContext {
  activeEntityId?: string;
  activeEntityName?: string;
  activeEntityType?: 'department' | 'office' | 'hostel' | 'library' | 'facility' | 'school' | 'service';
  activeTopicCategory?: 'FEES' | 'ADMISSION' | 'LOCATION' | 'TIMINGS' | 'HOD' | 'CONTACT' | 'SYLLABUS' | 'HOSTEL' | 'GENERAL';
  activeCourse?: string;
  activeHostel?: string;
  lastUpdated?: Date;
}

export interface StoredChatMessage {
  messageId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  structuredData?: StructuredAnswer;
  createdAt: Date;
}

export interface ConversationSession {
  conversationId: string;
  messages: StoredChatMessage[];
  activeContext: ActiveConversationContext;
  updatedAt: Date;
}

// In-memory fallback session store for zero-latency / local mode
const memorySessions = new Map<string, ConversationSession>();

export class ConversationContextService {
  /**
   * Retrieves or initializes a conversation session
   */
  async getOrCreateSession(conversationId: string): Promise<ConversationSession> {
    if (!conversationId || conversationId.trim() === '') {
      conversationId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    // 1. Try from memory store
    let session = memorySessions.get(conversationId);
    if (session) {
      return session;
    }

    // 2. Try from MongoDB if connected
    if (isDbConnected()) {
      try {
        const doc: any = await ConversationModel.findOne({ conversationId }).lean();
        if (doc && !Array.isArray(doc)) {
          session = {
            conversationId: doc.conversationId,
            messages: (doc.messages || []).map((m: any) => ({
              messageId: m.messageId || `msg_${Date.now()}`,
              role: m.role,
              content: m.content,
              structuredData: m.structuredData,
              createdAt: m.createdAt ? new Date(m.createdAt) : new Date()
            })),
            activeContext: doc.activeContext || {},
            updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date()
          };
          memorySessions.set(conversationId, session);
          return session;
        }
      } catch (err) {
        console.warn(`[ConversationService] Error fetching conversation ${conversationId} from DB:`, err);
      }
    }

    // 3. Create fresh session
    const newSession: ConversationSession = {
      conversationId,
      messages: [],
      activeContext: {},
      updatedAt: new Date()
    };
    memorySessions.set(conversationId, newSession);
    return newSession;
  }

  /**
   * Appends a message to conversation and updates persistence
   */
  async appendMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    structuredData?: StructuredAnswer,
    clientMessageId?: string
  ): Promise<StoredChatMessage> {
    const session = await this.getOrCreateSession(conversationId);
    const messageId = clientMessageId || `${role}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const storedMsg: StoredChatMessage = {
      messageId,
      role,
      content,
      structuredData,
      createdAt: new Date()
    };

    session.messages.push(storedMsg);
    session.updatedAt = new Date();
    memorySessions.set(conversationId, session);

    // Persist to MongoDB asynchronously
    if (isDbConnected()) {
      ConversationModel.findOneAndUpdate(
        { conversationId },
        {
          $push: { messages: storedMsg },
          $set: { activeContext: session.activeContext, updatedAt: new Date() }
        },
        { upsert: true, new: true }
      ).catch(err => {
        console.warn(`[ConversationService] Async MongoDB persist error:`, err);
      });
    }

    return storedMsg;
  }

  /**
   * Completely clears a conversation from memory and database
   */
  async clearConversation(conversationId: string): Promise<boolean> {
    console.log(`[ConversationService] Clearing conversation: ${conversationId}`);
    memorySessions.delete(conversationId);

    if (isDbConnected()) {
      try {
        await ConversationModel.deleteOne({ conversationId });
      } catch (err) {
        console.warn(`[ConversationService] Failed to delete conversation ${conversationId} from DB:`, err);
      }
    }
    return true;
  }

  /**
   * Analyzes the query in relation to previous context and resolves follow-ups,
   * topic continuity, and entity switches.
   */
  resolveConversationContext(
    query: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    existingContext?: ActiveConversationContext
  ): {
    resolvedQuery: string;
    effectiveContext: ActiveConversationContext;
    isFollowUp: boolean;
    compactHistorySnippet: string;
  } {
    const qLower = query.toLowerCase().trim();
    const effectiveContext: ActiveConversationContext = { ...(existingContext || {}) };

    // ── 1. Detect Follow-Up Indicators ─────────────────────────────────────────
    const isAnaphoric = /\b(its|it|their|them|uske|unki|iska|inki|waha|wha|udhar|there|the\s+department|this\s+department|the\s+hostel|the\s+course)\b/i.test(query);
    const isTopicContinuation = /^(and\s+|aur\s+|what\s+about\s+|how\s+about\s+|timing\s+|timings\s+|fees\s+|fee\s+|hod\s+|who\s+is\s+|kaha\s+hai|location|address|contact|email|phone)\b/i.test(query);
    const isShortQuery = query.split(/\s+/).length <= 4;
    const isFollowUp = (isAnaphoric || isTopicContinuation || isShortQuery) && (history.length > 0 || !!effectiveContext.activeEntityName);

    // ── 2. Detect Department / Office / Entity from Query ───────────────────────
    const entityMatches = this.extractExplicitEntities(qLower);

    if (entityMatches.department) {
      // User explicitly specified a department -> Switch Active Entity!
      effectiveContext.activeEntityName = entityMatches.department;
      effectiveContext.activeEntityType = 'department';
      effectiveContext.lastUpdated = new Date();
    } else if (entityMatches.office) {
      // User explicitly specified an office -> Switch Active Entity!
      effectiveContext.activeEntityName = entityMatches.office;
      effectiveContext.activeEntityType = 'office';
      effectiveContext.lastUpdated = new Date();
    } else if (entityMatches.hostel) {
      // User explicitly specified a hostel -> Switch Active Entity!
      effectiveContext.activeHostel = entityMatches.hostel;
      effectiveContext.activeEntityName = entityMatches.hostel;
      effectiveContext.activeEntityType = 'hostel';
      effectiveContext.lastUpdated = new Date();
    }

    // ── 3. Detect Course / Topic from Query ─────────────────────────────────────
    if (entityMatches.course) {
      effectiveContext.activeCourse = entityMatches.course;
    }

    if (/\b(fee|fees|kitni|charge|cost)\b/i.test(query)) {
      effectiveContext.activeTopicCategory = 'FEES';
    } else if (/\b(where|kaha|kahan|kidhar|location|address|building|map|campus)\b/i.test(query)) {
      effectiveContext.activeTopicCategory = 'LOCATION';
    } else if (/\b(timing|timings|open|close|samay|kab\s+khulta)\b/i.test(query)) {
      effectiveContext.activeTopicCategory = 'TIMINGS';
    } else if (/\b(hod|head|incharge|pramukh)\b/i.test(query)) {
      effectiveContext.activeTopicCategory = 'HOD';
    } else if (/\b(contact|phone|number|email|helpline)\b/i.test(query)) {
      effectiveContext.activeTopicCategory = 'CONTACT';
    } else if (/\b(hostel|mess|room|warden)\b/i.test(query)) {
      effectiveContext.activeTopicCategory = 'HOSTEL';
    }

    // ── 4. Build Resolved Natural Query for Downstream Retrievers ───────────────
    let resolvedQuery = query;
    if (isFollowUp && !entityMatches.department && !entityMatches.office && !entityMatches.hostel) {
      if (effectiveContext.activeEntityName) {
        resolvedQuery = `${query} (in reference to ${effectiveContext.activeEntityName})`;
      } else if (effectiveContext.activeCourse) {
        resolvedQuery = `${query} (in reference to ${effectiveContext.activeCourse})`;
      }
    }

    // ── 5. Build Compact Relevant History (Token-Efficient, No Unbounded Bloat) ─
    const recentTurns = history.slice(-4);
    const compactHistorySnippet = recentTurns
      .map(h => `${h.role === 'user' ? 'Student' : 'Assistant'}: ${h.content.substring(0, 150)}`)
      .join('\n');

    return {
      resolvedQuery,
      effectiveContext,
      isFollowUp,
      compactHistorySnippet
    };
  }

  /**
   * Helper to extract explicit university entities from a text
   */
  private extractExplicitEntities(text: string): {
    department?: string;
    office?: string;
    hostel?: string;
    course?: string;
  } {
    const result: { department?: string; office?: string; hostel?: string; course?: string } = {};

    // Departments
    if (/\b(computer\s+science|computer\s+applications|csa|mca\s+dept)\b/i.test(text)) {
      result.department = 'Department of Computer Science & Applications';
    } else if (/\b(physics|bhautik)\b/i.test(text)) {
      result.department = 'Department of Physics';
    } else if (/\b(chemistry|rasayan)\b/i.test(text)) {
      result.department = 'Department of Chemistry';
    } else if (/\b(biotechnology|biotech)\b/i.test(text)) {
      result.department = 'Department of Biotechnology';
    } else if (/\b(microbiology)\b/i.test(text)) {
      result.department = 'Department of Microbiology';
    } else if (/\b(botany|vanaspati)\b/i.test(text)) {
      result.department = 'Department of Botany';
    } else if (/\b(zoology|prani)\b/i.test(text)) {
      result.department = 'Department of Zoology';
    } else if (/\b(criminology|forensic\s+science)\b/i.test(text)) {
      result.department = 'Department of Criminology & Forensic Science';
    } else if (/\b(pharmacy|pharmaceutical)\b/i.test(text)) {
      result.department = 'Department of Pharmaceutical Sciences';
    } else if (/\b(mathematics|maths|ganit)\b/i.test(text)) {
      result.department = 'Department of Mathematics and Statistics';
    } else if (/\b(music|performing\s+arts)\b/i.test(text)) {
      result.department = 'Department of Music (Performing Arts)';
    } else if (/\b(communication|journalism)\b/i.test(text)) {
      result.department = 'Department of Communication and Journalism';
    } else if (/\b(law|vidhi)\b/i.test(text)) {
      result.department = 'Department of Law';
    } else if (/\b(commerce)\b/i.test(text)) {
      result.department = 'Department of Commerce';
    } else if (/\b(business\s+management|mba\s+dept)\b/i.test(text)) {
      result.department = 'Institute of Management Studies (Business Management)';
    } else if (/\b(education|school\s+of\s+education)\b/i.test(text)) {
      result.department = 'School of Education (Department of Education)';
    }

    // Hostels
    if (/\b(tagore|rabindranath\s+tagore)\b/i.test(text)) {
      result.hostel = 'Rabindranath Tagore Boys\' Hostel';
    } else if (/\b(raman|c\.?v\.?\s+raman)\b/i.test(text)) {
      result.hostel = 'C.V. Raman Boys\' Hostel';
    } else if (/\b(vivekananda|swami\s+vivekananda)\b/i.test(text)) {
      result.hostel = 'Swami Vivekananda Boys\' Hostel';
    } else if (/\b(gour\s+boys|harisingh\s+gour\s+boys)\b/i.test(text)) {
      result.hostel = 'Dr. Harisingh Gour Boys\' Hostel';
    } else if (/\b(saraswati|saraswati\s+girls)\b/i.test(text)) {
      result.hostel = 'Saraswati Girls\' Hostel';
    } else if (/\b(laxmibai|rani\s+laxmibai)\b/i.test(text)) {
      result.hostel = 'Rani Laxmibai Girls\' Hostel';
    } else if (/\b(nivedita|sister\s+nivedita)\b/i.test(text)) {
      result.hostel = 'Sister Nivedita Girls\' Hostel';
    } else if (/\b(priyadarshini)\b/i.test(text)) {
      result.hostel = 'Priyadarshini Girls\' Hostel';
    }

    // Offices
    if (/\b(scholarship|chhatravritti)\b/i.test(text)) {
      result.office = 'Scholarship Cell';
    } else if (/\b(exam\s+cell|pariksha\s+bhawan|controller\s+of\s+examinations|coe)\b/i.test(text)) {
      result.office = 'Examination Cell (Pariksha Niyantrak)';
    } else if (/\b(dsw|dean\s+student\s+welfare)\b/i.test(text)) {
      result.office = 'Dean Students\' Welfare (DSW)';
    } else if (/\b(academic\s+section|admission\s+cell)\b/i.test(text)) {
      result.office = 'Academic Section / Admissions Cell';
    } else if (/\b(health\s+centre|hospital|dispensary)\b/i.test(text)) {
      result.office = 'University Hospital / Health Centre';
    } else if (/\b(central\s+library|library|pustakalaya)\b/i.test(text)) {
      result.office = 'Jawaharlal Nehru Central Library';
    }

    // Courses
    if (/\b(bca)\b/i.test(text)) result.course = 'BCA';
    else if (/\b(mca)\b/i.test(text)) result.course = 'MCA';
    else if (/\b(b\.?pharm)\b/i.test(text)) result.course = 'B.Pharm';
    else if (/\b(mba)\b/i.test(text)) result.course = 'MBA';
    else if (/\b(b\.?sc\.?\s+maths|bsc\s+maths)\b/i.test(text)) result.course = 'B.Sc. Mathematics';
    else if (/\b(b\.?sc\.?\s+bio|bsc\s+bio)\b/i.test(text)) result.course = 'B.Sc. Biology';
    else if (/\b(ba\s+llb|b\.?a\.?\s+ll\.?b\.?)\b/i.test(text)) result.course = 'B.A. LL.B.';
    else if (/\b(llb|ll\.?b\.?)\b/i.test(text)) result.course = 'LL.B.';
    else if (/\b(b\.?com)\b/i.test(text)) result.course = 'B.Com';
    else if (/\b(b\.?a\b)\b/i.test(text)) result.course = 'B.A.';

    return result;
  }
}

export const conversationContextService = new ConversationContextService();
