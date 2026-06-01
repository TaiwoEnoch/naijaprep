"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"

const SUBJECTS = [
  "Accounting", "Agricultural Science", "Biology", "Business Studies",
  "Chemistry", "Christian Religious Studies", "Civic Education", "Commerce",
  "Computer Studies", "Data Processing", "Economics", "English Language",
  "Food and Nutrition", "French", "Further Mathematics", "Geography",
  "Government", "Hausa", "Health Education", "History", "Home Economics",
  "Igbo", "Islamic Religious Studies", "Literature in English", "Mathematics",
  "Music", "Physical Education", "Physics", "Technical Drawing", "Visual Art",
  "Yoruba",
]

const EXAM_TYPES = ["JAMB", "WAEC", "NECO"]

type Status = "ready" | "uploading" | "done" | "error"

type FileEntry = {
  id: string
  file: File
  previewUrl: string
  name: string
  status: Status
  resultUrl?: string
  errorMsg?: string
}

type UploadedImage = {
  name: string
  url: string
  fading?: boolean
}

function buildName(subject: string, examType: string, year: string, n: number) {
  return `${subject.replace(/\s+/g, "_")}_${examType}_${year}_IMG${n}.png`
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="shrink-0 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-[#1d9e75]/20 border border-white/10 hover:border-[#1d9e75]/40 text-slate-400 hover:text-[#5DCAA5] transition-all text-xs font-semibold"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  )
}

function StatusIcon({ status }: { status: Status }) {
  if (status === "done") return <span className="text-[#5DCAA5] text-base leading-none">✓</span>
  if (status === "error") return <span className="text-red-400 text-base leading-none">✗</span>
  if (status === "uploading")
    return (
      <svg className="w-4 h-4 animate-spin text-[#1d9e75]" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
    )
  return <span className="text-slate-500 text-[10px]">Ready</span>
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

// ─── Confirmation dialog ────────────────────────────────────────────────────
function DeleteConfirmDialog({
  filename,
  onConfirm,
  onCancel,
}: {
  filename: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-[#0a1f14] border border-white/10 rounded-2xl p-6 shadow-2xl shadow-black/50 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center shrink-0 mt-0.5">
            <TrashIcon />
          </div>
          <div>
            <p className="font-bold text-white text-sm">Delete image?</p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Are you sure you want to delete{" "}
              <span className="font-mono text-slate-200 break-all">{filename}</span>?
              {" "}This cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function UploadPage() {
  // Auth
  const [password, setPassword] = useState("")
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState("")
  const [authLoading, setAuthLoading] = useState(false)

  // Batch settings
  const [subject, setSubject] = useState(SUBJECTS[0])
  const [examType, setExamType] = useState(EXAM_TYPES[0])
  const [year, setYear] = useState(String(new Date().getFullYear()))

  // File entries
  const [entries, setEntries] = useState<FileEntry[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  // Upload state
  const [progress, setProgress] = useState<string | null>(null)
  const [uploadDone, setUploadDone] = useState(false)

  // Uploaded images list + delete confirmation
  const [images, setImages] = useState<UploadedImage[]>([])
  const [loadingImages, setLoadingImages] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Restore session
  useEffect(() => {
    const saved = sessionStorage.getItem("upload_pw")
    if (saved) { setPassword(saved); setAuthed(true) }
  }, [])

  useEffect(() => { if (authed) fetchImages() }, [authed])

  // Regenerate names when batch settings change (only for ready entries)
  useEffect(() => {
    setEntries((prev) => {
      let n = 0
      return prev.map((e) => {
        if (e.status === "ready") { n++; return { ...e, name: buildName(subject, examType, year, n) } }
        return e
      })
    })
  }, [subject, examType, year])

  const fetchImages = useCallback(async () => {
    setLoadingImages(true)
    try {
      const pw = sessionStorage.getItem("upload_pw") ?? password
      const res = await fetch("/api/upload", { headers: { "x-upload-password": pw } })
      if (res.ok) { const d = await res.json(); setImages(d.files ?? []) }
    } catch { /* non-fatal */ } finally { setLoadingImages(false) }
  }, [password])

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setAuthError("")
    setAuthLoading(true)
    try {
      const res = await fetch("/api/upload/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      if (res.ok) { sessionStorage.setItem("upload_pw", password); setAuthed(true) }
      else setAuthError("Wrong password. Try again.")
    } catch { setAuthError("Network error. Try again.") }
    finally { setAuthLoading(false) }
  }

  function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    entries.forEach((entry) => URL.revokeObjectURL(entry.previewUrl))
    const newEntries: FileEntry[] = files.map((file, i) => ({
      id: `${Date.now()}-${i}`,
      file,
      previewUrl: URL.createObjectURL(file),
      name: buildName(subject, examType, year, i + 1),
      status: "ready",
    }))
    setEntries(newEntries)
    setUploadDone(false)
    setProgress(null)
  }

  function removeEntry(id: string) {
    setEntries((prev) => {
      const target = prev.find((e) => e.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      const remaining = prev.filter((e) => e.id !== id)
      // Renumber ready entries in their new positions
      let n = 0
      return remaining.map((e) => {
        if (e.status === "ready") { n++; return { ...e, name: buildName(subject, examType, year, n) } }
        return e
      })
    })
  }

  function updateName(id: string, newName: string) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, name: newName } : e)))
  }

  async function handleUploadAll() {
    const pw = sessionStorage.getItem("upload_pw") ?? password
    const queue = entries.filter((e) => e.status === "ready")
    if (!queue.length) return
    setUploadDone(false)

    for (let i = 0; i < queue.length; i++) {
      const entry = queue[i]
      setProgress(`Uploading ${i + 1} of ${queue.length}...`)
      setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, status: "uploading" } : e)))

      try {
        const form = new FormData()
        form.append("file", entry.file)
        form.append("filename", entry.name)
        form.append("password", pw)
        const res = await fetch("/api/upload", { method: "POST", body: form })
        const data = await res.json()
        if (res.ok) {
          setEntries((prev) => prev.map((e) => e.id === entry.id ? { ...e, status: "done", resultUrl: data.url } : e))
        } else {
          setEntries((prev) => prev.map((e) => e.id === entry.id ? { ...e, status: "error", errorMsg: data.error ?? "Failed" } : e))
        }
      } catch {
        setEntries((prev) => prev.map((e) => e.id === entry.id ? { ...e, status: "error", errorMsg: "Network error" } : e))
      }
    }

    setProgress(null)
    setUploadDone(true)
    fetchImages()
  }

  function clearBatch() {
    entries.forEach((e) => URL.revokeObjectURL(e.previewUrl))
    setEntries([])
    setUploadDone(false)
    setProgress(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  async function handleDelete(filename: string) {
    const pw = sessionStorage.getItem("upload_pw") ?? password
    // Start fade-out immediately
    setImages((prev) => prev.map((img) => img.name === filename ? { ...img, fading: true } : img))
    setConfirmDelete(null)

    try {
      await fetch("/api/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, password: pw }),
      })
    } catch { /* still remove from UI */ }

    // Remove after fade animation completes
    setTimeout(() => {
      setImages((prev) => prev.filter((img) => img.name !== filename))
    }, 300)
  }

  // ── Derived ──────────────────────────────────────────────────────────────────
  const doneCount = entries.filter((e) => e.status === "done").length
  const errorCount = entries.filter((e) => e.status === "error").length
  const readyCount = entries.filter((e) => e.status === "ready").length
  const isUploading = entries.some((e) => e.status === "uploading")
  const allSettled = entries.length > 0 && entries.every((e) => e.status === "done" || e.status === "error")

  // ── Password gate ─────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-[#081810] flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/40">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#1d9e75] flex items-center justify-center font-extrabold text-white text-xl">N</div>
            <div>
              <p className="font-bold text-white text-base leading-none">NaijaPrep</p>
              <p className="text-xs text-slate-400 mt-0.5">Image Upload Tool</p>
            </div>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter upload password"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-500 outline-none focus:border-[#1d9e75]/50 transition-colors"
                required autoFocus
              />
            </div>
            {authError && <p className="text-red-400 text-xs">{authError}</p>}
            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-[#1d9e75] hover:bg-[#1d9e75]/90 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all"
            >
              {authLoading ? "Checking..." : "Enter"}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Main UI ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#081810] text-white px-4 py-8 sm:py-12">
      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <DeleteConfirmDialog
          filename={confirmDelete}
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1d9e75] flex items-center justify-center font-extrabold text-white text-xl">N</div>
            <div>
              <p className="font-bold text-white text-base leading-none">NaijaPrep</p>
              <p className="text-xs text-slate-400 mt-0.5">Bulk Image Upload</p>
            </div>
          </div>
          <button
            onClick={() => { sessionStorage.removeItem("upload_pw"); setAuthed(false); setPassword("") }}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Sign out
          </button>
        </div>

        {/* Batch settings + file picker */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl shadow-black/30">
          <h2 className="text-sm font-bold text-white mb-5">Batch Settings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-[#0a1f14] border border-white/10 rounded-xl px-3 py-3 text-white text-sm outline-none focus:border-[#1d9e75]/50 transition-colors"
              >
                {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Exam Type</label>
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
                className="w-full bg-[#0a1f14] border border-white/10 rounded-xl px-3 py-3 text-white text-sm outline-none focus:border-[#1d9e75]/50 transition-colors"
              >
                {EXAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                min={1990} max={2099}
                className="w-full bg-[#0a1f14] border border-white/10 rounded-xl px-3 py-3 text-white text-sm outline-none focus:border-[#1d9e75]/50 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Select Images (JPG / PNG — multiple allowed)
            </label>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              onChange={handleFilesChange}
              className="w-full bg-[#0a1f14] border border-white/10 rounded-xl px-4 py-3 text-slate-300 text-sm outline-none file:mr-3 file:bg-[#1d9e75] file:text-white file:text-xs file:font-bold file:border-0 file:rounded-lg file:px-3 file:py-1.5 file:cursor-pointer"
            />
          </div>
        </div>

        {/* Preview table — only shown when files are selected */}
        {entries.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl shadow-xl shadow-black/30 overflow-hidden">

            {/* Table header bar */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <h2 className="text-sm font-bold text-white">
                Files to Upload
                <span className="ml-2 text-xs font-normal text-slate-500">
                  {readyCount > 0 && `${readyCount} image${readyCount !== 1 ? "s" : ""} ready`}
                  {doneCount > 0 && ` · ${doneCount} done`}
                  {errorCount > 0 && ` · ${errorCount} failed`}
                </span>
              </h2>
              {!isUploading && (
                <button onClick={clearBatch} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                  Clear all
                </button>
              )}
            </div>

            {/* Column headers — desktop only */}
            <div className="hidden sm:grid sm:grid-cols-[28px_60px_1fr_1fr_64px_36px] gap-3 px-5 py-2 border-b border-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <span>#</span>
              <span>Preview</span>
              <span>Original filename</span>
              <span>Generated filename</span>
              <span className="text-center">Status</span>
              <span />
            </div>

            {/* Rows */}
            <div className="divide-y divide-white/5">
              {entries.map((entry, idx) => (
                <div
                  key={entry.id}
                  className="grid grid-cols-1 sm:grid-cols-[28px_60px_1fr_1fr_64px_36px] gap-3 px-5 py-3 items-center"
                >
                  {/* Row number — desktop */}
                  <span className="hidden sm:block text-xs text-slate-500 font-mono">{idx + 1}</span>

                  {/* Thumbnail — desktop */}
                  <div className="hidden sm:flex w-[60px] h-[60px] rounded-lg overflow-hidden border border-white/10 bg-[#0a1f14] items-center justify-center shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={entry.previewUrl} alt="" className="max-w-full max-h-full object-contain" />
                  </div>

                  {/* Mobile layout: thumbnail + text stacked */}
                  <div className="flex items-start gap-3 sm:hidden">
                    <span className="text-[10px] text-slate-500 font-mono pt-1 w-5 shrink-0">{idx + 1}</span>
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 bg-[#0a1f14] flex items-center justify-center shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={entry.previewUrl} alt="" className="max-w-full max-h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-400 truncate">{entry.file.name}</p>
                      <input
                        type="text"
                        value={entry.name}
                        onChange={(e) => updateName(entry.id, e.target.value)}
                        disabled={entry.status !== "ready"}
                        className="mt-1 w-full bg-[#0a1f14] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#5DCAA5] outline-none focus:border-[#1d9e75]/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      {entry.status === "error" && entry.errorMsg && (
                        <p className="text-red-400 text-[10px] mt-0.5">{entry.errorMsg}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-center gap-1.5 pt-0.5">
                      <StatusIcon status={entry.status} />
                      {entry.status === "ready" && (
                        <button
                          onClick={() => removeEntry(entry.id)}
                          className="text-slate-600 hover:text-red-400 transition-colors"
                          title="Remove"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Desktop: original filename */}
                  <p className="hidden sm:block text-xs text-slate-400 truncate" title={entry.file.name}>
                    {entry.file.name}
                  </p>

                  {/* Desktop: editable generated name + result URL */}
                  <div className="hidden sm:block min-w-0">
                    <input
                      type="text"
                      value={entry.name}
                      onChange={(e) => updateName(entry.id, e.target.value)}
                      disabled={entry.status !== "ready"}
                      className="w-full bg-[#0a1f14] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#5DCAA5] outline-none focus:border-[#1d9e75]/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    {entry.status === "error" && entry.errorMsg && (
                      <p className="text-red-400 text-[10px] mt-0.5">{entry.errorMsg}</p>
                    )}
                    {entry.status === "done" && entry.resultUrl && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <a href={entry.resultUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-slate-500 hover:text-white truncate">
                          {entry.resultUrl}
                        </a>
                        <CopyButton text={entry.resultUrl} />
                      </div>
                    )}
                  </div>

                  {/* Desktop: status */}
                  <div className="hidden sm:flex items-center justify-center">
                    <StatusIcon status={entry.status} />
                  </div>

                  {/* Desktop: remove button — only for ready entries */}
                  <div className="hidden sm:flex items-center justify-center">
                    {entry.status === "ready" && (
                      <button
                        onClick={() => removeEntry(entry.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-all"
                        title="Remove"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Upload All button — only shown when readyCount > 0 */}
            {readyCount > 0 && (
              <div className="px-5 py-4 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {progress ? (
                  <div className="flex items-center gap-2 flex-1">
                    <svg className="w-4 h-4 animate-spin text-[#1d9e75] shrink-0" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span className="text-sm font-semibold text-white">{progress}</span>
                  </div>
                ) : <div className="flex-1" />}
                <button
                  onClick={handleUploadAll}
                  disabled={isUploading}
                  className="w-full sm:w-auto bg-[#1d9e75] hover:bg-[#1d9e75]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg shadow-[#1d9e75]/20 text-sm"
                >
                  {isUploading ? "Uploading..." : `Upload All (${readyCount})`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Summary banner */}
        {uploadDone && allSettled && (
          <div className={`border rounded-2xl px-5 py-4 space-y-3 ${
            errorCount === 0 ? "bg-[#1d9e75]/10 border-[#1d9e75]/30" : "bg-amber-500/10 border-amber-500/30"
          }`}>
            <div>
              <p className="font-bold text-white text-sm">Upload complete</p>
              <p className="text-xs text-slate-300 mt-0.5">
                {doneCount} image{doneCount !== 1 ? "s" : ""} uploaded successfully
                {errorCount > 0 ? ` · ${errorCount} failed` : ""}
              </p>
            </div>
            {doneCount > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {entries.filter((e) => e.status === "done" && e.resultUrl).map((e) => (
                  <div key={e.id} className="flex items-center gap-2">
                    <span className="text-[#5DCAA5] text-xs font-mono truncate flex-1">{e.name}</span>
                    <CopyButton text={e.resultUrl!} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* All uploaded images */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl shadow-black/30">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-white">
              All Uploaded Images
              {images.length > 0 && (
                <span className="ml-2 text-xs font-normal text-slate-500">({images.length})</span>
              )}
            </h2>
            <button
              onClick={fetchImages}
              disabled={loadingImages}
              className="text-xs text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            >
              {loadingImages ? "Loading..." : "Refresh"}
            </button>
          </div>

          {loadingImages ? (
            <p className="text-xs text-slate-500 text-center py-8">Loading...</p>
          ) : images.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">No images uploaded yet.</p>
          ) : (
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {images.map((img) => (
                <div
                  key={img.name}
                  style={{ transition: "opacity 0.3s, transform 0.3s" }}
                  className={`flex items-center gap-3 px-3 py-2.5 bg-[#0a1f14] border border-white/5 rounded-xl hover:border-[#1d9e75]/20 transition-colors ${
                    img.fading ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 bg-[#081810] flex items-center justify-center shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt=""
                      className="max-w-full max-h-full object-contain"
                      loading="lazy"
                    />
                  </div>

                  {/* Filename link */}
                  <a
                    href={img.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-0 group"
                  >
                    <span className="text-xs font-mono text-slate-300 group-hover:text-white truncate block transition-colors">
                      {img.name}
                    </span>
                  </a>

                  {/* Copy URL */}
                  <CopyButton text={img.url} />

                  {/* Delete */}
                  <button
                    onClick={() => setConfirmDelete(img.name)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-all shrink-0"
                    title="Delete image"
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}