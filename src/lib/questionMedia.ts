import { apiService } from '@/lib/apiService';
import { applyResolvedDiagrams, NormalizedQuestion } from '@/lib/questionNormalization';

export async function resolveDiagramMediaForQuestions(
  questions: NormalizedQuestion[]
): Promise<NormalizedQuestion[]> {
  const unresolvedQuestions = questions.filter((question) => {
    const unresolvedQuestionRefs = (question.questionDiagramRefs || []).some((ref) => (
      !question.resolvedQuestionDiagrams?.some((entry) => entry.ref === ref && entry.imageUrl)
    ));
    const unresolvedExplanationRefs = (question.explanationDiagramRefs || []).some((ref) => (
      !question.resolvedExplanationDiagrams?.some((entry) => entry.ref === ref && entry.imageUrl)
    ));
    return unresolvedQuestionRefs || unresolvedExplanationRefs;
  });

  if (!unresolvedQuestions.length) return questions;

  const items = unresolvedQuestions
    .map((question) => {
      const refs = Array.from(new Set([
        ...(question.questionDiagramRefs || []),
        ...(question.explanationDiagramRefs || []),
      ]));
      return {
        questionId: String(question.questionId || question.id || ''),
        subject: question.subject || null,
        refs,
        imageUrl: question.imageUrl || null,
      };
    })
    .filter((item) => item.questionId && item.refs.length > 0);

  if (!items.length) return questions;

  try {
    const response = await apiService.questions.resolveDiagrams({ items });
    const resolvedItems = response?.data?.data?.items || response?.data?.items || [];
    return applyResolvedDiagrams(questions, resolvedItems);
  } catch (error) {
    console.error('Failed to resolve diagram media:', error);
    return questions;
  }
}
