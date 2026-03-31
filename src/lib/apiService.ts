import api from './api';

export const apiService = {
  // Auth APIs
  auth: {
    login: (credentials: {
      email: string;
      password: string;
      fcmToken?: string;
      timezone?: string;
      userAgent?: string;
    }) =>
      api.post('/auth/login', credentials),

    register: (userData: {
      name: string;
      email: string;
      password: string;
      phone?: string;
      fcmToken?: string;
      timezone?: string;
      userAgent?: string;
    }) =>
      api.post('/auth/register', userData),

    googleLogin: (data: {
      idToken: string;
      fcmToken?: string;
      timezone?: string;
      userAgent?: string;
    }) => api.post('/auth/google', data),

    logout: () => api.post('/auth/logout'),

    getProfile: () => api.get('/auth/me'),

    getTodayProgress: () => api.get('/auth/today-progress'),

    getTodayQuest: () => api.get('/auth/today-quest'),

    updateProfile: (data: any) => api.put('/auth/profile', data),

    updateOnboarding: (data: { step: number; completed?: boolean; data?: any }) =>
      api.put('/auth/onboarding', data),
  },

  billing: {
    initiateCheckout: (data: { planCode: 'PRO_MONTHLY'; couponCode?: string; referralCode?: string }) =>
      api.post('/billing/checkout/initiate', data),

    verifyCheckout: (data: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }) => api.post('/billing/checkout/verify', data),

    validateCoupon: (data: { code: string; planCode: 'PRO_MONTHLY' }) =>
      api.post('/billing/coupons/validate', data),

    getSubscriptionStatus: () => api.get('/billing/subscription/status'),
  },

  // NeuronZ APIs
  neuronz: {
    getDueQuestions: () => api.get('/neuronz/due'),

    getLevelQuestions: (level: number, limit = 50) =>
      api.get(`/neuronz/level/${level}/questions`, { params: { limit } }),

    reviewQuestion: (data: { questionId: string; wasCorrect: boolean; timeSpent?: number }) =>
      api.post('/neuronz/review', data),

    reviewBatch: (answers: { questionId: string; wasCorrect: boolean; timeSpent?: number }[]) =>
      api.post('/neuronz/review/batch', { answers }),

    getUserStats: () => api.get('/neuronz/stats'),

    getDueLines: () => api.get('/neuronz/due'),

    processLineSession: (data: { lineId: string; correctAnswers: number; totalQuizzes?: number; timeSpent?: number; review?: any[] }) =>
      api.post('/neuronz/session', data),

    generateMicroQuizzes: (lineId: string) => api.get(`/neuronz/quizzes/${lineId}`),

    getMasteryProgress: () => api.get('/neuronz/mastery'),

    checkDailyLimit: () => api.get('/neuronz/limit'),

    resetLineLevel: (lineId: string) => api.put(`/neuronz/reset/${lineId}`),

    getLinesByLevel: (level: number, limit = 20) =>
      api.get(`/neuronz/level/${level}?limit=${limit}`),

    getLinesByChapter: (chapterId: string, subject?: string, ncertClass?: number) =>
      api.get('/neuronz/chapter', { params: { chapterId, subject, class: ncertClass } }),

    trackChapter: (chapterId: string) =>
      api.post('/neuronz/track-chapter', { chapterId }),

    trackBySubjectAndTopic: (subject: string, topic: string) =>
      api.post('/neuronz/track-topic', { subject, topic }),

    adjustLineLevel: (lineId: string, data: { newLevel: number; reason?: string }) =>
      api.put(`/neuronz/${lineId}/level`, data),

    customizeLineSchedule: (lineId: string, data: { priority?: string; customSchedule?: any; autoSkipL7?: boolean }) =>
      api.put(`/neuronz/${lineId}/customize`, data),

    getLineAnalytics: (lineId: string) =>
      api.get(`/neuronz/${lineId}/analytics`),

    getTopicSummary: () =>
      api.get('/neuronz/topics/summary'),

    getTopicDueLines: (topicId: string, sessionSize = 6) =>
      api.get(`/neuronz/topics/${topicId}/due`, { params: { sessionSize } }),

    getTopicSubmissionHistory: (topicId: string, limit = 20) =>
      api.get(`/neuronz/topics/${topicId}/history`, { params: { limit } }),

    startTopicBaseline: (topicId: string, baselineSize = 20) =>
      api.post(`/neuronz/topics/${topicId}/baseline`, { baselineSize }),

    getTopicAvailability: (subject: string, topic: string) =>
      api.get('/neuronz/topics/availability', { params: { subject, topic } }),
  },

  // Questions APIs
  questions: {
    getQuestions: (filters?: any) => api.get('/questions', { params: filters }),

    getRandomQuestions: (filters: any) => api.post('/questions/random', filters),

    getPYQs: (filters: any) => api.get('/questions/pyq', { params: filters }),

    resolveDiagrams: (data: { items: Array<{ questionId: string; subject?: string | null; refs?: string[]; imageUrl?: string | null }> }) =>
      api.post('/questions/resolve-diagrams', data),
  },

  // Chapters APIs
  chapters: {
    getChapters: (subject?: string) => api.get('/chapters', { params: { subject } }),

    getChapterById: (chapterId: string) => api.get(`/chapters/${chapterId}`),
  },

  // Mock Tests APIs
  mocks: {
    getMockTests: (params?: { examType?: string; testType?: string; classCategory?: string; freeOnly?: boolean }) =>
      api.get('/mocks', { params }),

    getMockProgress: () => api.get('/mocks/progress'),

    markMockCompleted: (mockId: string, data?: { completed?: boolean; notes?: string }) =>
      api.post(`/mocks/${mockId}/complete`, data || { completed: true }),

    createMockTest: (data: any) => api.post('/mocks', data),

    submitMockTest: (mockId: string, answers: any) =>
      api.post(`/mocks/${mockId}/submit`, { answers }),
  },

  // Study Plan APIs
  studyPlan: {
    getStudyPlan: () => api.get('/study-plan'),

    generateStudyPlan: (data: { targetDate: string }) => api.post('/study-plan/generate', data),

    updateTaskStatus: (taskId: string, isCompleted: boolean) => api.put(`/study-plan/task/${taskId}`, { isCompleted }),
  },

  // Sessions APIs
  sessions: {
    createSession: (data: any) => api.post('/sessions/start', data),

    getSessions: () => api.get('/sessions'),

    updateSession: (sessionId: string, data: any) =>
      api.put(`/sessions/${sessionId}/end`, data),
  },

  // Formulas APIs
  formulas: {
    getSubjects: () => api.get('/formulas/subjects'),
    getTopics: (chapterTitle: string) => api.get('/formulas/topics', { params: { chapterTitle } }),
    getCards: (topicTitle: string) => api.get(`/formulas/topics/${encodeURIComponent(topicTitle)}/cards`),

    getChapterProgress: (chapterTitle: string) => api.get(`/formulas/progress/chapter/${encodeURIComponent(chapterTitle)}`),
    getTopicProgress: (topicTitle: string) => api.get(`/formulas/progress/topic/${encodeURIComponent(topicTitle)}`),
    updateCardProgress: (cardId: string, data: { status?: string; isBookmarked?: boolean; chapterTitle?: string; topicTitle?: string }) =>
      api.post(`/formulas/progress/${cardId}`, data),
  },

  chapterResources: {
    getChapters: (subject: 'biology' | 'chemistry' | 'physics') =>
      api.get(`/chapter-resources/${subject}/chapters`),

    getChapterDetail: (subject: 'biology' | 'chemistry' | 'physics', slug: string) =>
      api.get(`/chapter-resources/${subject}/chapters/${encodeURIComponent(slug)}`),
  },

  // Learning Paths APIs
  learningPaths: {
    createPath: (data: { title: string; description?: string; goals: any[]; dailyGoal?: number }) =>
      api.post('/learning-paths', data),

    getUserPaths: () => api.get('/learning-paths'),

    getPathById: (pathId: string) => api.get(`/learning-paths/${pathId}`),

    getNextContent: (pathId: string) => api.get(`/learning-paths/${pathId}/next`),

    markContentComplete: (pathId: string, contentIndex: number) =>
      api.post(`/learning-paths/${pathId}/complete/${contentIndex}`),

    updateProgress: (pathId: string, data: any) =>
      api.patch(`/learning-paths/${pathId}/progress`, data),

    deletePath: (pathId: string) => api.delete(`/learning-paths/${pathId}`),
  },

  // Challenges APIs
  challenges: {
    createChallenge: (data: { title: string; topic: string; subject: string; duration?: number }) =>
      api.post('/challenges', data),

    getUserChallenges: () => api.get('/challenges'),

    getChallengeById: (challengeId: string) => api.get(`/challenges/${challengeId}`),

    getTodaySchedule: (challengeId: string) => api.get(`/challenges/${challengeId}/today`),

    completeQuiz: (challengeId: string, dayNumber: number, quizIndex: number, data: { score: number; timeSpent?: number }) =>
      api.post(`/challenges/${challengeId}/complete/${dayNumber}/${quizIndex}`, data),

    deleteChallenge: (challengeId: string) => api.delete(`/challenges/${challengeId}`),
  },

  // Social APIs
  social: {
    searchUsers: (query: string) => api.get(`/social/users/search?query=${query}`),

    sendFriendRequest: (friendId: string) => api.post('/social/friends/request', { friendId }),

    acceptFriendRequest: (friendId: string) => api.post(`/social/friends/accept/${friendId}`),

    getFriends: () => api.get('/social/friends'),

    getFriendRequests: () => api.get('/social/friends/requests'),

    getFriendsLeaderboard: () => api.get('/social/friends/leaderboard'),

    createDirectChat: (friendId: string) => api.post('/social/chats/direct', { friendId }),

    createGroupChat: (data: { name: string; participants: string[] }) =>
      api.post('/social/chats/group', data),

    getChats: () => api.get('/social/chats'),

    sendMessage: (data: { chatId: string; text: string }) => api.post('/social/messages', data),

    getMessages: (chatId: string, limit?: number, skip?: number) =>
      api.get(`/social/messages/${chatId}?limit=${limit || 50}&skip=${skip || 0}`),
  },

  // Doubts APIs
  doubts: {
    getDoubts: (filters?: any) => api.get('/doubts', { params: filters }),

    getDoubtById: (doubtId: string) => api.get(`/doubts/${doubtId}`),

    createDoubt: (data: { title: string; body: string; subject: string; chapterId?: string; tags?: string[] }) =>
      api.post('/doubts', data),

    postAnswer: (doubtId: string, data: { body: string }) =>
      api.post(`/doubts/${doubtId}/answers`, data),

    upvoteDoubt: (doubtId: string) =>
      api.post(`/doubts/${doubtId}/upvote`),

    upvoteAnswer: (doubtId: string, answerId: string) =>
      api.post(`/doubts/${doubtId}/answers/${answerId}/upvote`),

    acceptAnswer: (doubtId: string, answerId: string) =>
      api.post(`/doubts/${doubtId}/answers/${answerId}/accept`),

    resolveDoubt: (doubtId: string) =>
      api.post(`/doubts/${doubtId}/resolve`),
  },

  // Revision APIs (7-Level System)
  revisions: {
    startRevision: (data: { subject: string; chapter: string; topic: string }) =>
      api.post('/revisions/start', data),

    completeRevision: (revisionId: string, data: { score: number; timeSpent?: number; confidence?: string }) =>
      api.post(`/revisions/${revisionId}/complete`, data),

    getDueRevisions: () => api.get('/revisions/due'),

    getRevisions: (filters?: any) => api.get('/revisions', { params: filters }),

    getAnalytics: () => api.get('/revisions/analytics'),

    setExamDates: (data: { preExamDate: string; finalBoostDate: string }) =>
      api.post('/revisions/exam-dates', data),
  },

  // Analytics APIs
  analytics: {
    getSubjectAccuracy: () => api.get('/analytics/subject-accuracy'),
    getAccuracyTrend: (weeks: number) => api.get('/analytics/accuracy-trend', { params: { weeks } }),
    getWeaknessHeatmap: (subject?: string) => api.get('/analytics/weakness-heatmap', { params: { subject } }),
  },

  // Test Series APIs
  tests: {
    getTests: (filters?: any) => api.get('/tests', { params: filters }),

    getTestById: (testId: string) => api.get(`/tests/${testId}`),

    startTest: (testId: string) => api.post(`/tests/${testId}/start`),

    saveAnswer: (
      attemptId: string,
      data: {
        questionId: string;
        selectedOption?: string | null;
        answerType?: string;
        answerPayload?: any;
        timeSpent: number;
        isMarkedForReview: boolean;
      }
    ) =>
      api.post(`/tests/attempts/${attemptId}/answer`, data),

    submitTest: (attemptId: string) => api.post(`/tests/attempts/${attemptId}/submit`),

    getAttempt: (attemptId: string) => api.get(`/tests/attempts/${attemptId}`),

    getUserAttempts: (status?: string) => api.get('/tests/my-attempts', { params: { status } }),

    createCustomTest: (data: any) => api.post('/tests/custom', data),
  },

  // Quiz Generator APIs (AI-powered)
  quizGenerator: {
    generateQuiz: (data: { topic: string; level: number; numberOfQuestions: number; quizType?: string }) =>
      api.post('/quiz-generator/generate', data),

    getQuiz: (quizId: string) => api.get(`/quiz-generator/${quizId}`),

    getUserQuizzes: (page?: number, limit?: number) =>
      api.get('/quiz-generator/quizzes/list', { params: { page: page || 1, limit: limit || 10 } }),

    submitQuizAttempt: (quizId: string, data: { answers: (number | number[] | null)[]; timeTaken: number }) =>
      api.post(`/quiz-generator/${quizId}/submit`, data),

    getQuizStats: (quizId: string) => api.get(`/quiz-generator/${quizId}/stats`),

    deleteQuiz: (quizId: string) => api.delete(`/quiz-generator/${quizId}`),
  },

  // Daily Challenge APIs
  dailyChallenge: {
    getTodaysChallenge: () => api.get('/daily-challenge'),

    submitChallenge: (data: { answers: number[]; challengeId: string }) =>
      api.post('/daily-challenge/submit', data),

    hasCompletedToday: () => api.get('/daily-challenge/completed'),
  },

  // NCERT Search + Topic Quiz APIs
  ncertSearch: {
    getSubjects: () => api.get('/ncert-search/subjects'),

    getChapters: (subject?: string, lang?: 'en' | 'hi', ncertClass?: 11 | 12) =>
      api.get('/ncert-search/chapters', { params: { subject, lang, class: ncertClass } }),

    getTopics: (params?: { subject?: string; chapterId?: string; query?: string; limit?: number; lang?: 'en' | 'hi'; class?: 11 | 12 }) =>
      api.get('/ncert-search/topics', { params }),

    getTopicQuiz: (topicObjectId: string, limit?: number) =>
      api.get(`/ncert-search/topics/${topicObjectId}/quiz`, { params: { limit: limit || 10 } }),

    submitTopicQuiz: (
      topicObjectId: string,
      data: {
        questionIds: string[];
        answers: Array<{ questionId: string; selectedOption: string | null }>;
        timeTaken?: number;
      }
    ) => api.post(`/ncert-search/topics/${topicObjectId}/quiz/submit`, data),
  },

  // Leaderboard APIs
  leaderboard: {
    getLeaderboard: (limit?: number) =>
      api.get('/daily-challenge/leaderboard', { params: { limit: limit || 10 } }),

    getUserStats: () => api.get('/daily-challenge/leaderboard/user-stats'),

    getDailyLeaderboard: (limit?: number) =>
      api.get('/daily-challenge/leaderboard/daily', { params: { limit: limit || 10 } }),

    getWeeklyLeaderboard: (limit?: number) =>
      api.get('/daily-challenge/leaderboard/weekly', { params: { limit: limit || 10 } }),

    getUserRank: () => api.get('/daily-challenge/leaderboard/user-rank'),
  },

  // PYQ Marked NCERT APIs
  pyqMarkedNCERT: {
    getAllPYQData: () => api.get('/pyq-marked-ncert/all'),

    getTopicsBySubject: (subject: string, stream?: string) =>
      api.get('/pyq-marked-ncert/topics', { params: { subject, stream } }),

    getTopicById: (topicId: string) =>
      api.get(`/pyq-marked-ncert/${topicId}`),
  },

  // Curriculum Browser APIs
  curriculum: {
    startRun: (data: {
      subject: 'biology' | 'chemistry' | 'physics';
      chapterId: string;
      topic: string;
      subTopic: string;
      mode: 'practice' | 'test';
      uids: number[];
    }) => api.post('/curriculum/runs/start', data),

    getRun: (runId: string) =>
      api.get(`/curriculum/runs/${runId}`),

    saveRunProgress: (
      runId: string,
      data: {
        currentIndex?: number;
        answers?: Array<number | null>;
        questionTimes?: number[];
        elapsedSeconds?: number;
        remainingSeconds?: number | null;
      }
    ) => api.put(`/curriculum/runs/${runId}/progress`, data),

    abandonRun: (runId: string) =>
      api.post(`/curriculum/runs/${runId}/abandon`),

    submitRun: (
      runId: string,
      data: {
        answers?: Array<number | null>;
        questionTimes?: number[];
        elapsedSeconds?: number;
        remainingSeconds?: number | null;
      }
    ) => api.post(`/curriculum/runs/${runId}/submit`, data),

    trackAttempt: (data: {
      subject: 'biology' | 'chemistry' | 'physics';
      chapterId: string;
      topic: string;
      subTopic: string;
      mode: 'practice' | 'test';
      totalQuestions: number;
      correctAnswers: number;
      timeTaken?: number;
      uids?: number[];
    }) => api.post('/curriculum/attempts', data),

    getSubjects: () => api.get('/curriculum/subjects'),

    getChapters: (subject: string) =>
      api.get(`/curriculum/${subject}/chapters`),

    getTopics: (subject: string, chapterId: string) =>
      api.get(`/curriculum/${subject}/chapters/${encodeURIComponent(chapterId)}/topics`),

    getSubTopics: (subject: string, chapterId: string, topic?: string) =>
      api.get(`/curriculum/${subject}/chapters/${encodeURIComponent(chapterId)}/subtopics`, {
        params: topic ? { topic } : {},
      }),

    getQuestionsByUIDs: (uids: number[], page = 1, limit = 20) =>
      api.get('/curriculum/questions', {
        params: { uids: uids.join(','), page, limit },
      }),

    logResource: (data: {
      chapterId: string;
      subject?: string;
      resourceType: string;
      durationSeconds?: number;
    }) => api.post('/curriculum/log-resource', data),

    toggleResourceReaction: (data: { chapterId: string; resourceType: string; reaction: 'like' | 'dislike' | 'none' }) =>
      api.post('/curriculum/toggle-reaction', data),

    getResourceReactions: (chapterId: string) =>
      api.get(`/curriculum/reactions/${encodeURIComponent(chapterId)}`),

    getImageFallback: (subject: string, questionId: string) =>
      api.get(`/curriculum/image-fallback/${subject}/${questionId}`),
  },

  // Test Series Hierarchy APIs
  testSeries: {
    getSeriesCatalog: (params?: { examType?: string; testType?: string; classCategory?: string; institution?: string; freeOnly?: boolean; provider?: string; search?: string }) =>
      api.get('/test-series/series', { params }),

    getTests: (params?: { page?: number; limit?: number; examType?: string; testType?: string; classCategory?: string; institution?: string; freeOnly?: boolean; provider?: string; seriesType?: string; search?: string }) =>
      api.get('/test-series/tests', { params }),

    getTestsBySeriesType: (seriesType: string, params?: { page?: number; limit?: number; examType?: string; testType?: string; classCategory?: string; institution?: string; freeOnly?: boolean; provider?: string; search?: string }) =>
      api.get(`/test-series/series/${encodeURIComponent(seriesType)}/tests`, { params }),

    getTestsBySubject: (subjectId: string, params?: any) =>
      api.get(`/test-series/subject/${subjectId}/tests`, { params }),

    getTestsByChapter: (chapterId: string, params?: any) =>
      api.get(`/test-series/chapter/${chapterId}/tests`, { params }),

    getTestsByTopic: (topicId: string, params?: any) =>
      api.get(`/test-series/topic/${topicId}/tests`, { params }),

    getHierarchySubjects: () => api.get('/test-series/hierarchy/subjects'),
    getHierarchyChapters: (subjectId: string) => api.get(`/test-series/hierarchy/subjects/${subjectId}/chapters`),
    getHierarchyTopics: (chapterId: string) => api.get(`/test-series/hierarchy/chapters/${chapterId}/topics`),
  },
};

export default apiService;
