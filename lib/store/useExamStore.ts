import { create } from "zustand";

export interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  year?: string;
  image_url?: string;
}

interface ExamState {
  sessionId: string | null;
  questions: Question[];
  serverStartTime: string | null;
  timeLimitSeconds: number;
  currentQuestionIndex: number;
  answers: Record<string, string>; // questionId -> A/B/C/D
  flagged: Record<string, boolean>; // questionId -> isFlagged
  integrityFlags: number;
  
  startExam: (sessionId: string, questions: Question[], serverStartTime: string, timeLimitSeconds: number) => void;
  setAnswer: (questionId: string, answer: string) => void;
  toggleFlag: (questionId: string) => void;
  incrementIntegrityFlags: () => void;
  setCurrentQuestionIndex: (index: number) => void;
  clearExam: () => void;
}

export const useExamStore = create<ExamState>((set) => ({
  sessionId: null,
  questions: [],
  serverStartTime: null,
  timeLimitSeconds: 0,
  currentQuestionIndex: 0,
  answers: {},
  flagged: {},
  integrityFlags: 0,

  startExam: (sessionId, questions, serverStartTime, timeLimitSeconds) => set({
    sessionId,
    questions,
    serverStartTime,
    timeLimitSeconds,
    currentQuestionIndex: 0,
    answers: {},
    flagged: {},
    integrityFlags: 0,
  }),
  setAnswer: (questionId, answer) => set((state) => ({
    answers: { ...state.answers, [questionId]: answer }
  })),
  toggleFlag: (questionId) => set((state) => ({
    flagged: { ...state.flagged, [questionId]: !state.flagged[questionId] }
  })),
  incrementIntegrityFlags: () => set((state) => ({
    integrityFlags: state.integrityFlags + 1
  })),
  setCurrentQuestionIndex: (index) => set({
    currentQuestionIndex: index
  }),
  clearExam: () => set({
    sessionId: null,
    questions: [],
    serverStartTime: null,
    timeLimitSeconds: 0,
    currentQuestionIndex: 0,
    answers: {},
    flagged: {},
    integrityFlags: 0,
  })
}));
