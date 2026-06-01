"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"

const SUBJECTS = [
  "Accounting",
  "Agricultural Science",
  "Biology",
  "Business Studies",
  "Chemistry",
  "Christian Religious Studies",
  "Civic Education",
  "Commerce",
  "Computer Studies",
  "Data Processing",
  "Economics",
  "English Language",
  "Food and Nutrition",
  "French",
  "Further Mathematics",
  "Geography",
  "Government",
  "Hausa",
  "Health Education",
  "History",
  "Home Economics",
  "Igbo",
  "Islamic Religious Studies",
  "Literature in English",
  "Mathematics",
  "Music",
  "Physical Education",
  "Physics",
  "Technical Drawing",
  "Visual Art",
  "Yoruba",
]

const EXAM_TYPES = ["JAMB", "WAEC", "NECO"]

function buildFilename(subject: string, examType: string, year: string, imgNumber: string) {
  return `${subject.replace(/\s+/g, "_")}_${examType}_${year}_IMG${imgNumber}.png`
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
      title="Copy URL"
      className="shrink-0 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-[#1d9e75]/20 border border-white/10 hover:border-[#1d9e75]/40 text-slate-400 hover:text-[#5DCAA5] transition-all text-xs font-semibold"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  )
}

export default function UploadPage() {
  // --- Auth ---
  const [password, setPassword] = useState("")
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState("")
  const [authLoading, setAuthLoading] = useState(false)

  // --- Form fields ---
  const [subject, setSubject] = useState(SUBJECTS[0])
  const [examType, setExamType] = useState(EXAM_TYPES[0])
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [imgNumber, setImgNumber] = useState("1")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  // --- Upload state ---
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{ filename: string; url: string } | null>(null)
  const [uploadError, setUploadError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  // --- Image list ---
  const [images, setImages] = useState<{ name: string; url: string }[]>([])
  const [loadingImages, setLoadingImages] = useState(false)

  // Restore session on mount
  useEffect(() => {
    const saved = sessionStorage.getItem("upload_pw")
    if (saved) {
      setPassword(saved)
      setAuthed(true)
    }
  }, [])

  // Fetch images once authed
  useEffect(() => {
    if (authed) fetchImages()
  }, [authed])

  // Build object URL for preview; revoke old one to avoid memory leaks
  useEffect(() => {
    if (!file) { setPreview(null); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const filename = buildFilename(subject, examType, year, imgNumber)

  // ---- Handlers ----

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
      if (res.ok) {
        sessionStorage.setItem("upload_pw", password)
        setAuthed(true)
      } else {
        setAuthError("Wrong password. Try again.")
      }
    } catch {
      setAuthError("Network error. Try again.")
    } finally {
      setAuthLoading(false)
    }
  }

  const fetchImages = useCallback(async () => {
    setLoadingImages(true)
    try {
      const pw = sessionStorage.getItem("upload_pw") ?? password
      const res = await fetch("/api/upload", { headers: { "x-upload-password": pw } })
      if (res.ok) {
        const data = await res.json()
        setImages(data.files ?? [])
      }
    } catch {
      // non-fatal
    } finally {
      setLoadingImages(false)
    }
  }, [password])

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setUploadError("")
    setUploadResult(null)
    setUploading(true)

    try {
      const pw = sessionStorage.getItem("upload_pw") ?? password
      const form = new FormData()
      form.append("file", file)
      form.append("subject", subject)
      form.append("examType", examType)
      form.append("year", year)
      form.append("imageNumber", imgNumber)
      form.append("password", pw)

      const res = await fetch("/api/upload", { method: "POST", body: form })
      const data = await res.json()

      if (res.ok) {
        setUploadResult({ filename: data.filename, url: data.url })
        setFile(null)
        setPreview(null)
        if (fileRef.current) fileRef.current.value = ""
        setImgNumber((n) => String(Number(n) + 1))
        fetchImages()
      } else {
        setUploadError(data.error ?? "Upload failed.")
      }
    } catch {
      setUploadError("Network error. Try again.")
    } finally {
      setUploading(false)
    }
  }

  // ---- Password gate ----
  if (!authed) {
    return (
      <div className="min-h-screen bg-[#081810] flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/40">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#1d9e75] flex items-center justify-center font-extrabold text-white text-xl">
              N
            </div>
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
                required
                autoFocus
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

  // ---- Main upload UI ----
  return (
    <div className="min-h-screen bg-[#081810] text-white px-4 py-8 sm:py-12">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1d9e75] flex items-center justify-center font-extrabold text-white text-xl">
              N
            </div>
            <div>
              <p className="font-bold text-white text-base leading-none">NaijaPrep</p>
              <p className="text-xs text-slate-400 mt-0.5">Question Image Upload</p>
            </div>
          </div>
          <button
            onClick={() => { sessionStorage.removeItem("upload_pw"); setAuthed(false); setPassword("") }}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Sign out
          </button>
        </div>

        {/* Upload form card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl shadow-black/30">
          <h2 className="text-sm font-bold text-white mb-5">Upload Question Image</h2>

          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Subject — full width */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Subject</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-[#0a1f14] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#1d9e75]/50 transition-colors"
                >
                  {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Exam type */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Exam Type</label>
                <select
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                  className="w-full bg-[#0a1f14] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#1d9e75]/50 transition-colors"
                >
                  {EXAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Year */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  min={1990}
                  max={2099}
                  className="w-full bg-[#0a1f14] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#1d9e75]/50 transition-colors"
                  required
                />
              </div>

              {/* Image number */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Image Number</label>
                <input
                  type="number"
                  value={imgNumber}
                  onChange={(e) => setImgNumber(e.target.value)}
                  min={1}
                  className="w-full bg-[#0a1f14] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#1d9e75]/50 transition-colors"
                  required
                />
              </div>

              {/* File input */}
              <div className={preview ? "" : "sm:col-span-2"}>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Image File (JPG / PNG)</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="w-full bg-[#0a1f14] border border-white/10 rounded-xl px-4 py-3 text-slate-300 text-sm outline-none file:mr-3 file:bg-[#1d9e75] file:text-white file:text-xs file:font-bold file:border-0 file:rounded-lg file:px-3 file:py-1.5 file:cursor-pointer"
                  required
                />
              </div>

              {/* Image preview — shows when a file is selected */}
              {preview && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-semibold text-slate-400">Preview</p>
                  <div className="h-[120px] rounded-xl overflow-hidden border border-white/10 bg-[#0a1f14] flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt="preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Filename preview — always visible */}
            <div className="bg-[#0a1f14] border border-[#1d9e75]/20 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-slate-500 shrink-0">Filename:</span>
                <span className="text-xs font-mono text-[#5DCAA5] truncate">{filename}</span>
              </div>
              <CopyButton text={filename} />
            </div>

            {uploadError && <p className="text-red-400 text-xs">{uploadError}</p>}

            {/* Success banner */}
            {uploadResult && (
              <div className="bg-[#1d9e75]/10 border border-[#1d9e75]/30 rounded-xl px-4 py-3 space-y-2">
                <p className="text-[#5DCAA5] text-xs font-bold">Uploaded successfully</p>
                <p className="text-xs font-mono text-slate-300">{uploadResult.filename}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 truncate flex-1">{uploadResult.url}</span>
                  <CopyButton text={uploadResult.url} />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || !file}
              className="w-full bg-[#1d9e75] hover:bg-[#1d9e75]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-[#1d9e75]/20"
            >
              {uploading ? "Uploading..." : "Upload Image"}
            </button>
          </form>
        </div>

        {/* Uploaded images list */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl shadow-black/30">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-white">
              Uploaded Images
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
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {images.map((img) => (
                <div
                  key={img.name}
                  className="flex items-center gap-2 px-3 py-2.5 bg-[#0a1f14] border border-white/5 rounded-xl hover:border-[#1d9e75]/20 transition-colors"
                >
                  {/* Filename + open link */}
                  <a
                    href={img.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 min-w-0 flex-1 group"
                    title="Open image"
                  >
                    <svg className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#5DCAA5] shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    <span className="text-xs font-mono text-slate-300 group-hover:text-white truncate transition-colors">
                      {img.name}
                    </span>
                  </a>
                  {/* Copy URL */}
                  <CopyButton text={img.url} />
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}