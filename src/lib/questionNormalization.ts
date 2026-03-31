export type QuestionType = 'mcq' | 'fillup' | 'match' | 'order' | 'flashcard' | 'video';

export type AnswerPayload =
  | { kind: 'mcq'; selectedOption: number | null }
  | { kind: 'fillup'; value: string }
  | { kind: 'match'; pairs: Record<string, string> }
  | { kind: 'order'; orderedIds: string[] }
  | { kind: 'flashcard'; flipped: boolean; completed: boolean }
  | { kind: 'video'; completed: boolean };

export interface MatchPair {
  id: string;
  left: string;
  right: string;
}

export interface OrderItem {
  id: string;
  text: string;
}

export interface ResolvedDiagram {
  ref: string;
  imageUrl: string | null;
  status: 'resolved' | 'missing' | 'error';
}

export interface NormalizedQuestion {
  _id?: string;
  id: string;
  questionId: string;
  type: QuestionType;
  question: string;
  explanation: string;
  options?: Record<string, any> | any[];
  questionDiagramRefs: string[];
  explanationDiagramRefs: string[];
  resolvedQuestionDiagrams: ResolvedDiagram[];
  resolvedExplanationDiagrams: ResolvedDiagram[];
  subject?: string;
  chapter?: string;
  topic?: string;
  difficulty?: string;
  imageUrl?: string | null;
  explanationImageUrl?: string | null;
  imageId?: string | null;
  videoUrl?: string | null;
  correctAnswer?: string | number | null;
  typeData: Record<string, any>;
  isSupported: boolean;
  unsupportedReason?: string | null;
}

const hasText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

const DIAGRAM_PATTERNS = [
  /(?:refer(?:\s+the|\s+below|\s+to)?\s+)?diagram\s*\(\s*([^)]+?)\s*\)/gi,
  /\(\s*([A-Za-z0-9_-]{3,})\s*\)\s*$/g,
];

const normalizeDiagramRef = (value: unknown): string =>
  String(value || '')
    .trim()
    .replace(/^diagram\s*\(/i, '')
    .replace(/\)\s*$/i, '')
    .trim();

export const extractDiagramRefs = (value: any): { cleanText: string; refs: string[] } => {
  const text = getText(value);
  if (!hasText(text)) return { cleanText: '', refs: [] };

  const refs: string[] = [];
  let cleanText = text;

  DIAGRAM_PATTERNS.forEach((pattern) => {
    cleanText = cleanText.replace(pattern, (_match, ref) => {
      const normalized = normalizeDiagramRef(ref);
      if (normalized) refs.push(normalized);
      return ' ';
    });
  });

  cleanText = cleanText
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+([,.;:?])/g, '$1')
    .trim();

  return {
    cleanText,
    refs: Array.from(new Set(refs)),
  };
};

export const getText = (value: any): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const resolved =
      value.en ||
      value.english ||
      value.hi ||
      value.hindi ||
      value.text ||
      value.value ||
      Object.values(value).find((item) => typeof item === 'string');
    return typeof resolved === 'string' ? resolved : '';
  }
  return String(value);
};

const normalizeType = (value: any): QuestionType => {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'fill-blank' || raw === 'fillblank' || raw === 'numeric') return 'fillup';
  if (raw === 'diagram-label') return 'match';
  if (raw === 'match' || raw === 'order' || raw === 'flashcard' || raw === 'video' || raw === 'fillup') return raw;
  return 'mcq';
};

const getOptionsArray = (question: any): string[] => {
  const typeOptions = Array.isArray(question?.typeData?.options) ? question.typeData.options : null;
  if (typeOptions?.length) return typeOptions.map((value: any) => getText(value));

  if (Array.isArray(question?.options)) {
    return question.options.map((opt: any) => getText(opt?.text || opt?.value || opt));
  }

  if (question?.options && typeof question.options === 'object') {
    return ['A', 'B', 'C', 'D'].map((label) => getText(question.options[label] ?? question.options[label.toLowerCase()] ?? ''));
  }

  return [];
};

const getOptionMap = (question: any) => {
  if (question?.typeData?.optionMap && typeof question.typeData.optionMap === 'object') {
    return question.typeData.optionMap;
  }

  if (question?.options && !Array.isArray(question.options) && typeof question.options === 'object') {
    return question.options;
  }

  const options = getOptionsArray(question);
  return ['A', 'B', 'C', 'D'].reduce((acc, key, index) => {
    acc[key] = options[index] || '';
    return acc;
  }, {} as Record<string, string>);
};

const splitLegacyMatchPair = (value: any): { left: string; right: string } | null => {
  const text = getText(value).trim();
  if (!hasText(text)) return null;

  const separators = [',', '|', ':', ' - ', '\t'];
  for (const separator of separators) {
    const index = text.indexOf(separator);
    if (index === -1) continue;

    const left = text.slice(0, index).trim();
    const right = text.slice(index + separator.length).trim();
    if (hasText(left) && hasText(right)) return { left, right };
  }

  const lines = text.split(/\r?\n/).map((part) => part.trim()).filter(Boolean);
  if (lines.length >= 2) {
    return {
      left: lines[0],
      right: lines.slice(1).join(' '),
    };
  }

  return null;
};

const normalizeMatchPairs = (question: any): MatchPair[] => {
  const storedPairs = Array.isArray(question?.typeData?.pairs) ? question.typeData.pairs : [];
  const normalizedStoredPairs = storedPairs
    .map((pair: any, index: number) => ({
      id: String(pair?.id || pair?.left || index),
      left: getText(pair?.left),
      right: getText(pair?.right),
    }))
    .filter((pair: MatchPair) => hasText(pair.left) && hasText(pair.right));

  if (normalizedStoredPairs.length > 0) return normalizedStoredPairs;
  if (question?.options && typeof question.options === 'object' && !Array.isArray(question.options)) {
    return ['A', 'B', 'C', 'D']
      .map((label, index) => {
        const parsed = splitLegacyMatchPair(question.options[label] ?? question.options[label.toLowerCase()]);
        if (!parsed) return null;
        return {
          id: String(label || index),
          left: parsed.left,
          right: parsed.right,
        };
      })
      .filter((pair): pair is MatchPair => Boolean(pair));
  }

  return [];
};

const normalizeOrderItems = (question: any): { items: OrderItem[]; correctOrder: string[] } => {
  const rawItems = Array.isArray(question?.typeData?.items) ? question.typeData.items : [];
  const items = rawItems
    .map((item: any, index: number) => ({
      id: String(item?.id || index),
      text: getText(item?.text ?? item),
    }))
    .filter((item: OrderItem) => hasText(item.text));
  const correctOrder = Array.isArray(question?.typeData?.correctOrder)
    ? question.typeData.correctOrder.map((value: any) => String(value))
    : items.map((item) => item.id);
  return { items, correctOrder };
};

export const normalizeQuestion = (question: any): NormalizedQuestion => {
  const type = normalizeType(question?.type || question?.questionType);
  const id = String(question?._id || question?.id || question?.questionId || '');
  const questionId = String(question?.questionId || question?._id || question?.id || '');
  const questionText = extractDiagramRefs(question?.question);
  const explanationText = extractDiagramRefs(question?.explanation);
  const questionImageUrl = question?.questionImageUrl || question?.imageUrl || null;
  const explanationImageUrl = question?.typeData?.explanationImageUrl || question?.explanationImageUrl || null;
  const options = getOptionsArray(question);
  const optionMap = getOptionMap(question);
  const matchPairs = normalizeMatchPairs(question);
  const order = normalizeOrderItems(question);
  const typeData = (() => {
    switch (type) {
      case 'mcq':
        return {
          options,
          optionMap,
          correctOption: question?.typeData?.correctOption || question?.correctAnswer || question?.correct_option || null,
        };
      case 'fillup':
        return {
          primaryAnswer: question?.typeData?.primaryAnswer || question?.correctAnswer || question?.correct_answer || null,
          acceptedAnswers: Array.isArray(question?.typeData?.acceptedAnswers)
            ? question.typeData.acceptedAnswers
            : [question?.typeData?.primaryAnswer || question?.correctAnswer || question?.correct_answer].filter(Boolean),
        };
      case 'match':
        return { pairs: matchPairs };
      case 'order':
        return order;
      case 'flashcard':
        return {
          front: getText(question?.typeData?.front || question?.question),
          back: getText(question?.typeData?.back || question?.explanation),
        };
      case 'video':
        return {
          videoUrl: question?.typeData?.videoUrl || question?.videoUrl || null,
          prompt: getText(question?.typeData?.prompt || question?.question),
        };
      default:
        return {};
    }
  })();

  return {
    _id: question?._id ? String(question._id) : undefined,
    id,
    questionId,
    type,
    question: questionText.cleanText,
    explanation: explanationText.cleanText,
    options: question?.options || optionMap,
    questionDiagramRefs: questionText.refs,
    explanationDiagramRefs: explanationText.refs,
    resolvedQuestionDiagrams: questionText.refs.map((ref) => ({
      ref,
      imageUrl: questionImageUrl,
      status: questionImageUrl ? 'resolved' as const : 'missing' as const,
    })),
    resolvedExplanationDiagrams: explanationText.refs.map((ref) => ({
      ref,
      imageUrl: explanationImageUrl || questionImageUrl,
      status: (explanationImageUrl || questionImageUrl) ? 'resolved' as const : 'missing' as const,
    })),
    subject: question?.subject || '',
    chapter: question?.chapter || question?.chapterId || '',
    topic: question?.topic || question?.topicId || '',
    difficulty: question?.difficulty || '',
    imageUrl: questionImageUrl,
    explanationImageUrl,
    imageId: question?.imageId || null,
    videoUrl: question?.videoUrl || question?.typeData?.videoUrl || null,
    correctAnswer: question?.correctAnswer ?? question?.correct_option ?? null,
    typeData,
    isSupported: question?.isSupported !== false,
    unsupportedReason: question?.unsupportedReason || null,
  };
};

export const normalizeQuestions = (questions: any[]): NormalizedQuestion[] =>
  Array.isArray(questions) ? questions.map((question) => normalizeQuestion(question)) : [];

export const applyResolvedDiagrams = (
  questions: NormalizedQuestion[],
  resolvedItems: Array<{ questionId?: string | null; resolved?: ResolvedDiagram[] }>
): NormalizedQuestion[] => {
  const resolvedMap = new Map<string, ResolvedDiagram[]>();
  resolvedItems.forEach((item) => {
    const questionId = String(item?.questionId || '').trim();
    if (!questionId) return;
    resolvedMap.set(
      questionId,
      Array.isArray(item?.resolved)
        ? item.resolved.map((entry) => ({
            ref: normalizeDiagramRef(entry?.ref),
            imageUrl: entry?.imageUrl || null,
            status: entry?.status === 'resolved' || entry?.status === 'missing' ? entry.status : 'error',
          }))
        : []
    );
  });

  return questions.map((question) => {
    const resolved = resolvedMap.get(String(question.questionId || question.id)) || [];
    const resolvedByRef = new Map(resolved.map((entry) => [normalizeDiagramRef(entry.ref), entry]));
    return {
      ...question,
      resolvedQuestionDiagrams: question.questionDiagramRefs.map((ref) => (
        resolvedByRef.get(normalizeDiagramRef(ref)) || { ref, imageUrl: null, status: 'missing' as const }
      )),
      resolvedExplanationDiagrams: question.explanationDiagramRefs.map((ref) => (
        resolvedByRef.get(normalizeDiagramRef(ref)) || { ref, imageUrl: null, status: 'missing' as const }
      )),
    };
  });
};

export const answerPayloadFromAttempt = (question: NormalizedQuestion, answer: any): AnswerPayload | null => {
  if (!answer) return null;
  const payload = answer?.answerPayload;
  if (payload && typeof payload === 'object' && payload.kind) {
    return payload as AnswerPayload;
  }

  if (question.type === 'mcq') {
    const selected = typeof answer?.selectedOption === 'string'
      ? answer.selectedOption.toUpperCase().charCodeAt(0) - 65
      : typeof answer?.selectedOption === 'number'
        ? answer.selectedOption
        : null;
    return { kind: 'mcq', selectedOption: Number.isInteger(selected) && selected >= 0 ? selected : null };
  }

  return null;
};

export const isAnswerPayloadAttempted = (payload: AnswerPayload | null | undefined): boolean => {
  if (!payload) return false;
  switch (payload.kind) {
    case 'mcq':
      return Number.isInteger(payload.selectedOption);
    case 'fillup':
      return hasText(payload.value);
    case 'match':
      return Object.keys(payload.pairs || {}).length > 0;
    case 'order':
      return Array.isArray(payload.orderedIds) && payload.orderedIds.length > 0;
    case 'flashcard':
      return Boolean(payload.flipped || payload.completed);
    case 'video':
      return Boolean(payload.completed);
    default:
      return false;
  }
};

export const getCorrectOptionIndex = (question: NormalizedQuestion): number | null => {
  const correctAnswer = question.typeData?.correctOption ?? question.correctAnswer;
  if (typeof correctAnswer === 'number' && Number.isFinite(correctAnswer)) return correctAnswer;
  if (typeof correctAnswer === 'string') {
    const upper = correctAnswer.trim().toUpperCase();
    if (/^[A-D]$/.test(upper)) return upper.charCodeAt(0) - 65;
    const numeric = Number(upper);
    return Number.isFinite(numeric) ? numeric : null;
  }
  return null;
};
