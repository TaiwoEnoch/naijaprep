"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/layout/AppLayout";
import RoleGuard from "@/components/auth/RoleGuard";
import PageTransition from "@/components/ui/PageTransition";
import Skeleton from "@/components/ui/Skeleton";
import Confetti from "@/components/ui/Confetti";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calculator, 
  Languages, 
  Atom, 
  FlaskConical, 
  Dna, 
  TrendingUp, 
  Landmark, 
  Scroll,
  BookOpen, 
  ArrowRight,
  ArrowLeft,
  Check,
  Search,
  CheckSquare,
  Square,
  Sparkles,
  Users,
  Settings,
  Calendar,
  AlertTriangle,
  Loader
} from "lucide-react";
import { buttonPressVariants, staggerContainerVariants, staggerItemVariants } from "@/lib/animations";

interface Subject {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  readiness_pct: number;
}

const getSubjectIcon = (name: string) => {
  const lowercase = name.toLowerCase();
  if (lowercase.includes("math")) return Calculator;
  if (lowercase.includes("english") || lowercase.includes("lang")) return Languages;
  if (lowercase.includes("physic")) return Atom;
  if (lowercase.includes("chem")) return FlaskConical;
  if (lowercase.includes("biol")) return Dna;
  if (lowercase.includes("econ")) return TrendingUp;
  if (lowercase.includes("gov") || lowercase.includes("civic")) return Landmark;
  if (lowercase.includes("hist") || lowercase.includes("lit")) return Scroll;
  return BookOpen;
};

// Wizard steps
const STEPS = [
  { id: 1, label: "Subject" },
  { id: 2, label: "Configuration" },
  { id: 3, label: "Students" },
  { id: 4, label: "Review" }
];

function AssignExamForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentUrlId = searchParams.get("student");

  // Step state
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(0); // 1 = forward, -1 = backward

  // Form state
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [examType, setExamType] = useState<"JAMB" | "WAEC" | "NECO">("JAMB");
  const [mode, setMode] = useState<"practice" | "mock" | "topic" | "speed">("practice");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(30);
  const [questionCount, setQuestionCount] = useState(20);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Loading & success state
  const [isAssigning, setIsAssigning] = useState(false);
  const [assigningProgress, setAssigningProgress] = useState({ current: 0, total: 0 });
  const [isSuccess, setIsSuccess] = useState(false);

  // Fetch subjects
  const { data: subjects, isLoading: subjectsLoading } = useQuery<Subject[]>({
    queryKey: ["subjectsList"],
    queryFn: async () => {
      const res = await fetch("/api/subjects");
      if (!res.ok) throw new Error("Failed to load subjects.");
      const json = await res.json();
      return json.data || json;
    }
  });

  // Fetch school students
  const { data: profileData, isLoading: profileLoading } = useQuery<{ students: Student[] }>({
    queryKey: ["teacherProfileData"],
    queryFn: async () => {
      const res = await fetch("/api/user/profile");
      if (!res.ok) throw new Error("Failed to load students.");
      const json = await res.json();
      return json.data || json;
    }
  });

  const students = profileData?.students || [];

  // Update configuration defaults when study mode is changed
  useEffect(() => {
    if (mode === "mock") {
      setQuestionCount(60);
      setTimeLimitMinutes(120);
    } else if (mode === "topic") {
      setQuestionCount(10);
      setTimeLimitMinutes(15);
    } else if (mode === "speed") {
      setQuestionCount(15);
      setTimeLimitMinutes(10);
    } else {
      setQuestionCount(20);
      setTimeLimitMinutes(30);
    }
  }, [mode]);

  // Pre-select student if student URL parameter exists
  useEffect(() => {
    if (studentUrlId && students.length > 0) {
      const studentExists = students.some(s => s.id === studentUrlId);
      if (studentExists) {
        setSelectedStudentIds([studentUrlId]);
        // Automatically go to Configuration step if subject is already active, or step 3 directly
        setStep(3);
      }
    }
  }, [studentUrlId, students]);

  // Helper selectors
  const selectedSubject = subjects?.find(s => s.id === selectedSubjectId);
  const filteredStudents = students.filter(s => 
    `${s.first_name} ${s.last_name || ""}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelectAllStudents = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map(s => s.id));
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    if (selectedStudentIds.includes(studentId)) {
      setSelectedStudentIds(selectedStudentIds.filter(id => id !== studentId));
    } else {
      setSelectedStudentIds([...selectedStudentIds, studentId]);
    }
  };

  const handleNext = () => {
    if (step === 1 && !selectedSubjectId) return;
    if (step === 3 && selectedStudentIds.length === 0) return;
    setDirection(1);
    setStep(prev => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setDirection(-1);
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleAssign = async () => {
    if (!selectedSubjectId || selectedStudentIds.length === 0) return;
    setIsAssigning(true);
    setAssigningProgress({ current: 0, total: selectedStudentIds.length });

    try {
      for (let i = 0; i < selectedStudentIds.length; i++) {
        const sId = selectedStudentIds[i];
        setAssigningProgress({ current: i + 1, total: selectedStudentIds.length });

        const res = await fetch("/api/exam/start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            subjectId: selectedSubjectId,
            examType,
            mode,
            studentId: sId
          })
        });

        if (!res.ok) {
          throw new Error("Failed to assign exam to a student");
        }
      }
      
      setIsSuccess(true);
    } catch (err) {
      console.error(err);
      alert("An error occurred while assigning exams. Please try again.");
    } finally {
      setIsAssigning(false);
    }
  };

  // Step slider animations (mode wait)
  const slideVariants = {
    initial: (dir: number) => ({
      x: dir > 0 ? 100 : -100,
      opacity: 0
    }),
    animate: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.25, ease: "easeOut" as const }
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 100 : -100,
      opacity: 0,
      transition: { duration: 0.2, ease: "easeIn" as const }
    })
  };

  const progressPercentage = ((step - 1) / 3) * 100;

  return (
    <RoleGuard>
      <AppLayout>
        <PageTransition className="max-w-2xl mx-auto space-y-6">
          
          {/* Confetti Trigger */}
          <Confetti fire={isSuccess} type="burst" />

          {/* Page Header */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (isSuccess) {
                  router.push("/teacher");
                } else if (step > 1) {
                  handleBack();
                } else {
                  router.push("/teacher");
                }
              }}
              className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">Assign Exam</h2>
              <p className="text-xs text-slate-400">Distribute customized preparations to your students.</p>
            </div>
          </div>

          {/* Progress Indicator Row */}
          {!isSuccess && !isAssigning && (
            <div className="space-y-3">
              {/* Progress Line */}
              <div className="relative h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  className="absolute left-0 top-0 bottom-0 bg-brand-primary"
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                />
              </div>

              {/* Step Labels */}
              <div className="flex justify-between items-center px-1">
                {STEPS.map((s) => {
                  const isActive = step === s.id;
                  const isCompleted = step > s.id;
                  return (
                    <div 
                      key={s.id}
                      className={`text-xs font-semibold flex items-center gap-1.5 transition-colors duration-300 ${
                        isActive ? "text-brand-primary font-bold" : isCompleted ? "text-brand-soft" : "text-slate-500"
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${
                        isCompleted 
                          ? "bg-brand-primary border-brand-primary text-white" 
                          : isActive 
                          ? "border-brand-primary text-brand-primary ring-2 ring-brand-primary/20" 
                          : "border-slate-700 text-slate-500"
                      }`}>
                        {isCompleted ? <Check size={10} strokeWidth={3} /> : s.id}
                      </span>
                      <span className="hidden sm:inline">{s.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active step panel display */}
          <div className="relative min-h-[300px]">
            <AnimatePresence mode="wait" custom={direction}>
              {isAssigning && (
                <motion.div
                  key="assigning"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-panel p-8 rounded-2xl border border-white/5 text-center flex flex-col items-center justify-center space-y-4"
                >
                  <Loader size={40} className="animate-spin text-brand-primary" />
                  <div className="space-y-1">
                    <h3 className="text-md font-bold text-white">Assigning Exam Sessions</h3>
                    <p className="text-xs text-slate-400">
                      Assigning to student {assigningProgress.current} of {assigningProgress.total}...
                    </p>
                  </div>
                  {/* Progress Bar inside loading state */}
                  <div className="w-48 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-brand-primary transition-all duration-200" 
                      style={{ width: `${(assigningProgress.current / assigningProgress.total) * 100}%` }}
                    />
                  </div>
                </motion.div>
              )}

              {isSuccess && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-panel p-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-center space-y-5"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center">
                    <Check size={24} strokeWidth={3} />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white">Exams Assigned Successfully!</h3>
                    <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                      All selected students have been assigned this exam. It will appear on their dashboard when they log in to practice.
                    </p>
                  </div>

                  <div className="pt-2">
                    <motion.button
                      variants={buttonPressVariants}
                      whileTap="tap"
                      onClick={() => router.push("/teacher")}
                      className="bg-brand-primary text-white font-semibold text-sm py-2.5 px-6 rounded-xl hover:bg-brand-primary/95 transition-all shadow-md shadow-brand-primary/10"
                    >
                      Return to Dashboard
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {!isAssigning && !isSuccess && (
                <motion.div
                  key={step}
                  custom={direction}
                  variants={slideVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-4"
                >
                  {/* STEP 1: Select Subject */}
                  {step === 1 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Step 1: Select a Subject</h3>
                      {subjectsLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[1, 2, 3, 4].map(n => <Skeleton key={n} className="h-20 w-full rounded-2xl" />)}
                        </div>
                      ) : (
                        <motion.div 
                          variants={staggerContainerVariants}
                          initial="initial"
                          animate="animate"
                          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                        >
                          {subjects?.map((sub) => {
                            const SubjectIcon = getSubjectIcon(sub.name);
                            const isSelected = selectedSubjectId === sub.id;
                            return (
                              <motion.div
                                key={sub.id}
                                variants={staggerItemVariants}
                                onClick={() => setSelectedSubjectId(sub.id)}
                                whileHover={{ y: -2 }}
                                className={`glass-panel p-4 rounded-2xl border cursor-pointer flex items-center justify-between group transition-all duration-300 ${
                                  isSelected 
                                    ? "border-brand-primary bg-brand-primary/5 shadow-md shadow-brand-primary/5" 
                                    : "border-white/5 hover:border-white/10 hover:bg-white/5"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`p-2.5 rounded-xl transition-colors ${
                                    isSelected ? "bg-brand-primary text-white" : "bg-white/5 text-slate-400 group-hover:text-white"
                                  }`}>
                                    <SubjectIcon size={18} />
                                  </div>
                                  <span className="font-bold text-sm text-white">{sub.name}</span>
                                </div>
                                {isSelected && (
                                  <div className="w-5 h-5 rounded-full bg-brand-primary text-white flex items-center justify-center">
                                    <Check size={12} strokeWidth={3} />
                                  </div>
                                )}
                              </motion.div>
                            );
                          })}
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* STEP 2: Configure Settings */}
                  {step === 2 && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Step 2: Configure Exam</h3>
                      
                      <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
                        
                        {/* Exam Syllabus Type */}
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-400">Exam Type</label>
                          <div className="grid grid-cols-3 gap-2">
                            {(["JAMB", "WAEC", "NECO"] as const).map(type => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setExamType(type)}
                                className={`py-2 px-4 rounded-xl text-xs font-bold border transition-all ${
                                  examType === type 
                                    ? "bg-brand-primary border-brand-primary text-white shadow-md shadow-brand-primary/10" 
                                    : "bg-white/5 border-white/5 text-slate-400 hover:text-white"
                                }`}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Mode Selector */}
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-400">Study/Practice Mode</label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {(["practice", "mock", "topic", "speed"] as const).map(m => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setMode(m)}
                                className={`py-2 px-1 rounded-xl text-xs font-bold border capitalize transition-all ${
                                  mode === m 
                                    ? "bg-brand-primary border-brand-primary text-white shadow-md shadow-brand-primary/10" 
                                    : "bg-white/5 border-white/5 text-slate-400 hover:text-white"
                                }`}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Override Counters */}
                        <div className="grid grid-cols-2 gap-4 pt-2">
                          {/* Question Count */}
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400">Question Count</label>
                            <select 
                              value={questionCount}
                              onChange={(e) => setQuestionCount(Number(e.target.value))}
                              className="w-full bg-[#081e16] border border-white/5 text-white font-medium rounded-xl p-3 text-sm focus:border-brand-primary outline-none"
                            >
                              {[10, 15, 20, 30, 40, 50, 60].map(cnt => (
                                <option key={cnt} value={cnt}>{cnt} Questions</option>
                              ))}
                            </select>
                          </div>

                          {/* Time Limit */}
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400">Time Limit</label>
                            <select 
                              value={timeLimitMinutes}
                              onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                              className="w-full bg-[#081e16] border border-white/5 text-white font-medium rounded-xl p-3 text-sm focus:border-brand-primary outline-none"
                            >
                              {[10, 15, 30, 45, 60, 90, 120, 180].map(min => (
                                <option key={min} value={min}>{min} Minutes</option>
                              ))}
                            </select>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* STEP 3: Select Students */}
                  {step === 3 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Step 3: Select Students</h3>
                        
                        <button 
                          onClick={toggleSelectAllStudents}
                          className="text-xs font-semibold text-brand-primary hover:text-brand-soft transition-colors flex items-center gap-1.5"
                        >
                          {selectedStudentIds.length === filteredStudents.length ? "Deselect All" : "Select All Available"}
                        </button>
                      </div>

                      {/* Search Bar */}
                      <div className="relative">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input 
                          type="text" 
                          placeholder="Search students by name..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-white/5 border border-white/5 text-white placeholder-slate-500 rounded-xl py-3 pl-10 pr-4 text-sm focus:border-brand-primary outline-none"
                        />
                      </div>

                      {profileLoading ? (
                        <div className="space-y-2">
                          {[1, 2, 3].map(n => <Skeleton key={n} className="h-14 w-full rounded-xl" />)}
                        </div>
                      ) : filteredStudents.length === 0 ? (
                        <div className="glass-panel p-6 rounded-2xl border border-white/5 text-center text-slate-500 text-xs">
                          No students matching your search criteria.
                        </div>
                      ) : (
                        <motion.div 
                          variants={staggerContainerVariants}
                          initial="initial"
                          animate="animate"
                          className="space-y-2 max-h-60 overflow-y-auto pr-1"
                        >
                          {filteredStudents.map((student) => {
                            const isSelected = selectedStudentIds.includes(student.id);
                            return (
                              <motion.div
                                key={student.id}
                                variants={staggerItemVariants}
                                onClick={() => toggleStudentSelection(student.id)}
                                animate={{
                                  borderColor: isSelected ? "rgba(15,110,86,0.3)" : "rgba(255,255,255,0.05)",
                                  backgroundColor: isSelected ? "rgba(15,110,86,0.08)" : "rgba(255,255,255,0.02)",
                                }}
                                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                                className="p-3.5 rounded-xl border flex items-center justify-between cursor-pointer group"
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`p-1.5 rounded-lg border transition-colors ${
                                    isSelected 
                                      ? "bg-brand-primary border-brand-primary text-white" 
                                      : "bg-white/5 border-white/5 text-slate-500 group-hover:text-white"
                                  }`}>
                                    <Users size={14} />
                                  </div>
                                  <span className="font-bold text-xs text-white">
                                    {student.first_name} {student.last_name || ""}
                                  </span>
                                </div>

                                <div className="flex items-center gap-4">
                                  <span className="text-[10px] text-slate-400 font-bold bg-white/5 px-2 py-0.5 rounded">
                                    Score: {student.readiness_pct || 0}%
                                  </span>
                                  
                                  {isSelected ? (
                                    <CheckSquare size={18} className="text-brand-primary" />
                                  ) : (
                                    <Square size={18} className="text-slate-600" />
                                  )}
                                </div>
                              </motion.div>
                            );
                          })}
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* STEP 4: Summary Card */}
                  {step === 4 && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Step 4: Confirm Selections</h3>
                      
                      <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
                        <div className="flex items-center gap-3 bg-[#0F6E56]/10 border border-[#0F6E56]/20 p-4 rounded-xl">
                          <div className="p-2.5 bg-brand-primary text-white rounded-xl">
                            {React.createElement(getSubjectIcon(selectedSubject?.name || ""))}
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Assigned Subject</span>
                            <span className="text-sm font-bold text-white">{selectedSubject?.name}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Exam Format</span>
                            <span className="text-xs font-bold text-white mt-0.5 block">{examType} UTME/SSCE</span>
                          </div>

                          <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Practice Mode</span>
                            <span className="text-xs font-bold text-white capitalize mt-0.5 block">{mode}</span>
                          </div>

                          <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Duration</span>
                            <span className="text-xs font-bold text-white mt-0.5 block">{timeLimitMinutes} Minutes</span>
                          </div>

                          <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Questions</span>
                            <span className="text-xs font-bold text-white mt-0.5 block">{questionCount} Qs</span>
                          </div>
                        </div>

                        <div className="border-t border-white/5 pt-4 space-y-2">
                          <span className="text-xs font-bold text-slate-400 block">
                            Assigned to {selectedStudentIds.length} Students:
                          </span>
                          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                            {selectedStudentIds.map(id => {
                              const s = students.find(stud => stud.id === id);
                              return (
                                <span 
                                  key={id} 
                                  className="text-[10px] font-bold bg-white/5 border border-white/5 text-slate-300 px-2 py-0.5 rounded-lg"
                                >
                                  {s ? `${s.first_name} ${s.last_name || ""}`.trim() : "Unknown"}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Form Action Buttons */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    {step > 1 ? (
                      <motion.button
                        variants={buttonPressVariants}
                        whileTap="tap"
                        type="button"
                        onClick={handleBack}
                        className="bg-white/5 border border-white/5 text-white font-semibold text-xs py-2.5 px-5 rounded-xl hover:bg-white/10 transition-all flex items-center gap-1.5"
                      >
                        <ArrowLeft size={14} />
                        <span>Back</span>
                      </motion.button>
                    ) : (
                      <div />
                    )}

                    {step < 4 ? (
                      <motion.button
                        variants={buttonPressVariants}
                        whileTap="tap"
                        type="button"
                        onClick={handleNext}
                        disabled={step === 1 && !selectedSubjectId}
                        className={`font-semibold text-xs py-2.5 px-5 rounded-xl transition-all flex items-center gap-1.5 ${
                          (step === 1 && !selectedSubjectId) 
                            ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
                            : "bg-brand-primary text-white hover:bg-brand-primary/95 shadow-md shadow-brand-primary/10"
                        }`}
                      >
                        <span>Continue</span>
                        <ArrowRight size={14} />
                      </motion.button>
                    ) : (
                      <motion.button
                        variants={buttonPressVariants}
                        whileTap="tap"
                        type="button"
                        onClick={handleAssign}
                        className="bg-brand-primary text-white font-semibold text-xs py-2.5 px-6 rounded-xl hover:bg-brand-primary/95 transition-all flex items-center gap-1.5 shadow-md shadow-brand-primary/10"
                      >
                        <Sparkles size={14} />
                        <span>Assign Exam Now</span>
                      </motion.button>
                    )}
                  </div>

                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </PageTransition>
      </AppLayout>
    </RoleGuard>
  );
}

export default function AssignExamPage() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto py-8 space-y-6 px-6">
        <div className="flex items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    }>
      <AssignExamForm />
    </Suspense>
  );
}
