import Dexie, { type Table } from "dexie";

export interface OfflineAnswer {
  id?: number;
  sessionId: string;
  questionId: string;
  chosenOption: string;
  isFlagged: boolean;
  timestamp: number;
}

export interface OfflineQuestion {
  id: string;
  subjectId: string;
  examType: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  explanation?: string;
  year?: number | null;
  imageUrl?: string | null;
}

export interface OfflinePack {
  id: string;
  subjectId: string;
  subjectName: string;
  examType: string;
  questionCount: number;
  sizeBytes: number;
  version: number;
  downloadedAt: number;
}

class OfflineExamDatabase extends Dexie {
  offlineAnswers!: Table<OfflineAnswer>;
  offlineQuestions!: Table<OfflineQuestion>;
  offlinePacks!: Table<OfflinePack>;

  constructor() {
    super("NaijaPrepOfflineDB");
    this.version(2).stores({
      offlineAnswers: "++id, sessionId, questionId, [sessionId+questionId]",
      offlineQuestions: "id, subjectId, examType",
      offlinePacks: "id, subjectId, examType",
    });
  }
}

export const db = new OfflineExamDatabase();
