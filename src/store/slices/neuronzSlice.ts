import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '@/lib/apiService';

export interface UserQuestion {
  _id: string;
  questionId: string;
  level: number;
  nextRevision: string;
  lastReviewed: string | null;
  streak: number;
  isMastered: boolean;
  totalAttempts: number;
  correctAttempts: number;
  source?: {
    subject?: string;
    chapterId?: string;
    topic?: string;
    subTopic?: string;
  };
  question?: string;
  options?: { A?: string; B?: string; C?: string; D?: string };
  correct_option?: string;
  explanation?: string;
  currentLevel?: number;
}

export interface NeuronzLevelCount {
  total: number;
  mastered: number;
}

export interface DueQuestionsData {
  total: number;
  byLevel: {
    L1: UserQuestion[];
    L2: UserQuestion[];
    L3: UserQuestion[];
    L4: UserQuestion[];
    L5: UserQuestion[];
    L6: UserQuestion[];
    L7: UserQuestion[];
  };
  totalByLevel: Record<string, NeuronzLevelCount>;
  masteredTotal: number;
  allTotal: number;
}

export interface MasteryProgress {
  totalQuestions: number;
  masteredQuestions: number;
  masteryPercentage: number;
  averageLevel: number;
}

interface LevelQuestionsData {
  questions: UserQuestion[];
  userQuestions: UserQuestion[];
}

interface NeuronzState {
  dueQuestions: DueQuestionsData | null;
  masteryProgress: MasteryProgress | null;
  levelQuestions: Record<number, LevelQuestionsData>;
  isLoading: boolean;
  isLevelLoading: boolean;
  error: string | null;
}

const initialState: NeuronzState = {
  dueQuestions: null,
  masteryProgress: null,
  levelQuestions: {},
  isLoading: false,
  isLevelLoading: false,
  error: null,
};

export const loadDueQuestions = createAsyncThunk('neuronz/loadDueQuestions', async () => {
  const response = await apiService.neuronz.getDueQuestions();
  return response.data.data;
});

export const getMasteryProgress = createAsyncThunk('neuronz/getMasteryProgress', async () => {
  const response = await apiService.neuronz.getMasteryProgress();
  return response.data.data;
});

export const loadLevelQuestions = createAsyncThunk(
  'neuronz/loadLevelQuestions',
  async (level: number) => {
    const response = await apiService.neuronz.getLevelQuestions(level);
    return { level, data: response.data.data };
  }
);

export const reviewQuestion = createAsyncThunk(
  'neuronz/reviewQuestion',
  async ({ questionId, wasCorrect, timeSpent = 0 }: { questionId: string; wasCorrect: boolean; timeSpent?: number }) => {
    const response = await apiService.neuronz.reviewQuestion({ questionId, wasCorrect, timeSpent });
    return response.data.data;
  }
);

export const reviewBatch = createAsyncThunk(
  'neuronz/reviewBatch',
  async (answers: { questionId: string; wasCorrect: boolean; timeSpent?: number }[]) => {
    const response = await apiService.neuronz.reviewBatch(answers);
    return response.data.data;
  }
);

export const trackChapter = createAsyncThunk(
  'neuronz/trackChapter',
  async (chapterId: string) => {
    const response = await apiService.neuronz.trackChapter(chapterId);
    return response.data.data;
  }
);

export const loadDueLines = createAsyncThunk('neuronz/loadDueLines', async () => {
  const response = await apiService.neuronz.getDueQuestions();
  return response.data.data;
});

const neuronzSlice = createSlice({
  name: 'neuronz',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearLevelQuestions: (state, action) => {
      delete state.levelQuestions[action.payload];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadDueQuestions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadDueQuestions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.dueQuestions = action.payload;
      })
      .addCase(loadDueQuestions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load due questions';
      })
      .addCase(getMasteryProgress.fulfilled, (state, action) => {
        state.masteryProgress = action.payload;
      })
      .addCase(getMasteryProgress.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to get mastery progress';
      })
      .addCase(loadLevelQuestions.pending, (state) => {
        state.isLevelLoading = true;
      })
      .addCase(loadLevelQuestions.fulfilled, (state, action) => {
        state.isLevelLoading = false;
        state.levelQuestions[action.payload.level] = action.payload.data;
      })
      .addCase(loadLevelQuestions.rejected, (state, action) => {
        state.isLevelLoading = false;
        state.error = action.error.message || 'Failed to load level questions';
      })
      .addCase(reviewQuestion.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to review question';
      })
      .addCase(reviewBatch.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to submit review batch';
      });
  },
});

export const { clearError, clearLevelQuestions } = neuronzSlice.actions;
export default neuronzSlice.reducer;
