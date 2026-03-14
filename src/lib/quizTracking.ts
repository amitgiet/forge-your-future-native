import apiService from './apiService';
import { storage } from './storage';

export type QuizAttemptType = 'normal_practice' | 'normal_test' | 'neuronz';

interface TrackQuizAttemptPayload {
  quizType: QuizAttemptType;
  totalQuestions: number;
  correctAnswers: number;
  timeTaken: number;
  subject?: string;
  topic?: string;
  lineId?: string;
  metadata?: Record<string, unknown>;
}

const LOCAL_BUFFER_KEY = 'quiz_attempt_tracking_buffer';

const pushToLocalBuffer = async (payload: TrackQuizAttemptPayload) => {
  try {
    const current = await storage.getObject<any[]>(LOCAL_BUFFER_KEY);
    const buffered = Array.isArray(current) ? current : [];
    buffered.push({
      ...payload,
      trackedAt: new Date().toISOString(),
    });
    await storage.setObject(LOCAL_BUFFER_KEY, buffered.slice(-100));
  } catch {
    // Ignore storage errors to avoid blocking quiz flow.
  }
};

export const trackQuizAttempt = async (payload: TrackQuizAttemptPayload): Promise<void> => {
  try {
    await apiService.sessions.createSession({
      sessionType: 'quiz',
      quizType: payload.quizType,
      totalQuestions: payload.totalQuestions,
      correctAnswers: payload.correctAnswers,
      accuracy:
        payload.totalQuestions > 0
          ? Math.round((payload.correctAnswers / payload.totalQuestions) * 100)
          : 0,
      timeTaken: payload.timeTaken,
      subject: payload.subject,
      topic: payload.topic,
      lineId: payload.lineId,
      metadata: payload.metadata || {},
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    await pushToLocalBuffer(payload);
    console.error('Quiz tracking failed, buffered locally:', error);
  }
};
