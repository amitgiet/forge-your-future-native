import { configureStore } from '@reduxjs/toolkit';
import neuronzReducer from './slices/neuronzSlice';

export const store = configureStore({
  reducer: {
    neuronz: neuronzReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
