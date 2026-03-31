import type { NTAQuestion, NTASubmitData } from '@/components/NTATestPlayer';
import { AnswerPayload, getCorrectOptionIndex, isAnswerPayloadAttempted } from '@/lib/questionNormalization';

const GRADED_TYPES = new Set(['mcq', 'fillup', 'match', 'order']);

const normalizeTextAnswer = (value: unknown) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const levenshteinDistance = (source: string, target: string) => {
  const rows = source.length + 1;
  const cols = target.length + 1;
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = source[i - 1] === target[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[rows - 1][cols - 1];
};

const calculateSimilarity = (a: string, b: string) => {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  return maxLen > 0 ? 1 - (levenshteinDistance(a, b) / maxLen) : 0;
};

const evaluateLocalAnswer = (question: NTAQuestion, answerPayload: AnswerPayload | null) => {
  const attempted = isAnswerPayloadAttempted(answerPayload);
  const graded = GRADED_TYPES.has(question.type);

  if (!attempted) {
    return {
      attempted: false,
      graded,
      isCorrect: false,
      marksAwarded: 0,
      evaluationStatus: 'ungraded',
      evaluationReason: 'Question not attempted',
    };
  }

  if (question.type === 'mcq') {
    const selectedOption = answerPayload?.kind === 'mcq' ? answerPayload.selectedOption : null;
    const correctOption = getCorrectOptionIndex(question);
    const isCorrect = selectedOption !== null && correctOption !== null && selectedOption === correctOption;
    return {
      attempted: true,
      graded: true,
      isCorrect,
      marksAwarded: isCorrect ? 4 : -1,
      evaluationStatus: isCorrect ? 'correct' : 'incorrect',
      evaluationReason: isCorrect ? 'Correct option selected' : `Correct option is ${question.correctAnswer || 'N/A'}`,
    };
  }

  if (question.type === 'fillup') {
    const userValue = normalizeTextAnswer(answerPayload?.kind === 'fillup' ? answerPayload.value : '');
    const acceptedAnswers = Array.isArray(question.typeData?.acceptedAnswers) ? question.typeData.acceptedAnswers : [];
    const normalizedAccepted = acceptedAnswers.map((item: string) => normalizeTextAnswer(item)).filter(Boolean);
    const exactMatch = normalizedAccepted.some((item: string) => item === userValue);
    const similarity = exactMatch
      ? 1
      : normalizedAccepted.reduce((best: number, item: string) => Math.max(best, calculateSimilarity(item, userValue)), 0);
    const isCorrect = exactMatch || similarity >= 0.8;
    return {
      attempted: true,
      graded: true,
      isCorrect,
      marksAwarded: isCorrect ? 4 : -1,
      evaluationStatus: isCorrect ? 'correct' : 'incorrect',
      evaluationReason: isCorrect
        ? (exactMatch ? 'Accepted fillup answer matched' : `Accepted via fuzzy match (${Math.round(similarity * 100)}% similarity)`)
        : `Accepted answers: ${acceptedAnswers.join(', ') || 'N/A'}`,
    };
  }

  if (question.type === 'match') {
    const pairs = Array.isArray(question.typeData?.pairs) ? question.typeData.pairs : [];
    const userPairs = answerPayload?.kind === 'match' ? answerPayload.pairs : {};
    const correct = pairs.reduce((count: number, pair: any) => (
      userPairs?.[pair.id] === pair.right ? count + 1 : count
    ), 0);
    const total = pairs.length;
    const isCorrect = total > 0 && correct === total;
    return {
      attempted: true,
      graded: true,
      isCorrect,
      marksAwarded: isCorrect ? 4 : 0,
      evaluationStatus: isCorrect ? 'correct' : (correct > 0 ? 'partial' : 'incorrect'),
      evaluationReason: `${correct}/${total} matches correct`,
    };
  }

  if (question.type === 'order') {
    const correctOrder = Array.isArray(question.typeData?.correctOrder) ? question.typeData.correctOrder.map(String) : [];
    const orderedIds = answerPayload?.kind === 'order' ? answerPayload.orderedIds.map(String) : [];
    const matchedCount = orderedIds.reduce((count: number, value: string, index: number) => (
      value === correctOrder[index] ? count + 1 : count
    ), 0);
    const isCorrect = correctOrder.length > 0 && orderedIds.length === correctOrder.length && matchedCount === correctOrder.length;
    return {
      attempted: true,
      graded: true,
      isCorrect,
      marksAwarded: isCorrect ? 4 : 0,
      evaluationStatus: isCorrect ? 'correct' : (matchedCount > 0 ? 'partial' : 'incorrect'),
      evaluationReason: `${matchedCount}/${correctOrder.length} positions correct`,
    };
  }

  if (question.type === 'flashcard' || question.type === 'video') {
    return {
      attempted: true,
      graded: false,
      isCorrect: false,
      marksAwarded: 0,
      evaluationStatus: 'ungraded',
      evaluationReason: `${question.type} items are completion-based and not auto-graded`,
    };
  }

  return {
    attempted: true,
    graded: false,
    isCorrect: false,
    marksAwarded: 0,
    evaluationStatus: 'ungraded',
    evaluationReason: `Unsupported question type: ${question.type}`,
  };
};

export function buildLocalReportAttempt(
  questions: NTAQuestion[],
  submitData: NTASubmitData,
  title: string
) {
  const answers = questions.map((question, index) => {
    const answerPayload = submitData.answers[index];
    const evaluation = evaluateLocalAnswer(question, answerPayload);
    const selectedOption = answerPayload?.kind === 'mcq' && Number.isInteger(answerPayload.selectedOption)
      ? String.fromCharCode(65 + Number(answerPayload.selectedOption))
      : null;

    return {
      questionId: {
        _id: String(question._id || question.id || index),
      },
      selectedOption,
      answerPayload,
      timeSpent: Number(submitData.meta[index]?.timeSpent || 0),
      isMarkedForReview:
        submitData.meta[index]?.state === 'marked-review' ||
        submitData.meta[index]?.state === 'answered-marked',
      isCorrect: evaluation.isCorrect,
      marksAwarded: evaluation.marksAwarded,
      evaluationStatus: evaluation.evaluationStatus,
      evaluationReason: evaluation.evaluationReason,
    };
  });

  let correct = 0;
  let incorrect = 0;
  let partial = 0;
  let skipped = 0;
  let gradedQuestions = 0;
  let ungradedQuestions = 0;
  let attempted = 0;
  let attemptedGraded = 0;
  let attemptedUngraded = 0;
  let marksObtained = 0;
  let markedForReview = 0;

  const subjectMap = new Map<string, { correct: number; total: number; attempted: number; wrong: number; partial: number; marks: number }>();
  const chapterMap = new Map<string, { subject: string; correct: number; total: number; wrong: number; partial: number }>();
  const completionWise = {
    flashcardCompleted: 0,
    flashcardTotal: 0,
    videoCompleted: 0,
    videoTotal: 0,
  };

  questions.forEach((question, index) => {
    const answerPayload = submitData.answers[index] || null;
    const answer = answers[index];
    const isAttempted = isAnswerPayloadAttempted(answerPayload);
    const isGraded = GRADED_TYPES.has(question.type);
    const isCorrect = answer?.isCorrect === true;
    const isPartial = answer?.evaluationStatus === 'partial';

    if (isGraded) gradedQuestions += 1;
    else ungradedQuestions += 1;

    if (submitData.meta[index]?.state === 'marked-review' || submitData.meta[index]?.state === 'answered-marked') {
      markedForReview += 1;
    }

    if (!isAttempted) {
      skipped += 1;
    } else {
      attempted += 1;
      if (isGraded) attemptedGraded += 1;
      else attemptedUngraded += 1;

      if (isCorrect) correct += 1;
      else if (isPartial) partial += 1;
      else if (isGraded) incorrect += 1;
    }

    marksObtained += Number(answer?.marksAwarded || 0);

    if (!isGraded) {
      if (question.type === 'flashcard') {
        completionWise.flashcardTotal += 1;
        if (isAttempted) completionWise.flashcardCompleted += 1;
      } else if (question.type === 'video') {
        completionWise.videoTotal += 1;
        if (isAttempted) completionWise.videoCompleted += 1;
      }
      return;
    }

    const subjectKey = String(question.subject || 'General');
    const subjectEntry = subjectMap.get(subjectKey) || { correct: 0, total: 0, attempted: 0, wrong: 0, partial: 0, marks: 0 };
    subjectEntry.total += 1;
    if (isAttempted) subjectEntry.attempted += 1;
    if (isCorrect) subjectEntry.correct += 1;
    else if (isPartial) subjectEntry.partial += 1;
    else if (isAttempted) subjectEntry.wrong += 1;
    subjectEntry.marks += Number(answer?.marksAwarded || 0);
    subjectMap.set(subjectKey, subjectEntry);

    const chapterKey = String(question.chapter || question.topic || 'General');
    const chapterEntry = chapterMap.get(chapterKey) || {
      subject: subjectKey,
      correct: 0,
      total: 0,
      wrong: 0,
      partial: 0,
    };
    chapterEntry.total += 1;
    if (isCorrect) chapterEntry.correct += 1;
    else if (isPartial) chapterEntry.partial += 1;
    else if (isAttempted) chapterEntry.wrong += 1;
    chapterMap.set(chapterKey, chapterEntry);
  });

  const totalQuestions = questions.length;
  const totalMarks = gradedQuestions * 4;
  const totalTimeSpent = submitData.meta.reduce((sum, item) => sum + Number(item.timeSpent || 0), 0);
  const questionTimes = submitData.meta.map((item) => Number(item.timeSpent || 0));

  const subjectWise = Array.from(subjectMap.entries()).map(([subject, stats]) => ({
    subject,
    correct: stats.correct,
    total: stats.total,
    attempted: stats.attempted,
    incorrect: stats.wrong,
    partial: stats.partial,
    marks: stats.marks,
    accuracy: stats.attempted > 0 ? (stats.correct / stats.attempted) * 100 : 0,
  }));

  const chapterWise = Array.from(chapterMap.entries()).map(([chapter, stats]) => ({
    chapter,
    subject: stats.subject,
    correct: stats.correct,
    total: stats.total,
    incorrect: stats.wrong,
    partial: stats.partial,
    accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
  }));

  const weakAreas = chapterWise
    .filter((entry) => entry.total > 0 && entry.accuracy < 60)
    .sort((a, b) => a.accuracy - b.accuracy)
    .map((entry) => ({
      chapter: entry.chapter,
      subject: entry.subject,
      questionsWrong: chapterMap.get(entry.chapter)?.wrong || 0,
      accuracy: entry.accuracy,
    }));

  return {
    testId: {
      _id: 'curriculum',
      title,
      questions,
    },
    questions,
    answers,
    results: {
      totalQuestions,
      gradedQuestions,
      ungradedQuestions,
      attempted,
      attemptedGraded,
      attemptedUngraded,
      marksObtained,
      totalMarks,
      correct,
      incorrect,
      partial,
      skipped,
      markedForReview,
      percentage: totalMarks > 0 ? (marksObtained / totalMarks) * 100 : 0,
      timeAnalysis: {
        totalTime: totalTimeSpent,
        avgTimePerQuestion: totalQuestions > 0 ? totalTimeSpent / totalQuestions : 0,
        fastestQuestion: questionTimes.length > 0 ? Math.min(...questionTimes) : 0,
        slowestQuestion: questionTimes.length > 0 ? Math.max(...questionTimes) : 0,
      },
      subjectWise,
      chapterWise,
      completionWise,
    },
    weakAreas,
  };
}
