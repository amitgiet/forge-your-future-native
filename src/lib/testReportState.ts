type StoredReportState = {
  attemptData?: any;
  questions?: any[];
  meta?: any[];
  timeTaken?: number;
  returnTo?: string | null;
  returnLabel?: string;
  retryTo?: string | null;
};

const reportStateMap = new Map<string, StoredReportState>();

export const setTestReportState = (attemptId: string, value: StoredReportState) => {
  reportStateMap.set(String(attemptId), value);
};

export const getTestReportState = (attemptId: string): StoredReportState | null => {
  return reportStateMap.get(String(attemptId)) || null;
};

export const clearTestReportState = (attemptId: string) => {
  reportStateMap.delete(String(attemptId));
};
