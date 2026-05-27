import { createClient } from "@supabase/supabase-js"
import { Redis } from "@upstash/redis"
import * as fs from "fs"
import * as path from "path"

// Simple dotenv parsing for local run
function loadEnv() {
  const envPath = path.join(__dirname, "../.env.local")
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, "utf-8")
    envFile.split("\n").forEach((line) => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith("#")) {
        const index = trimmed.indexOf("=")
        if (index !== -1) {
          const key = trimmed.slice(0, index).trim()
          let val = trimmed.slice(index + 1).trim()
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1)
          }
          process.env[key] = val
        }
      }
    })
  }
}

loadEnv()

const baseUrl = process.argv[2] || "http://localhost:3000"
const testPhone = "08098765432" // dedicated test phone number
const testPin = "1234"

console.log(`Starting NaijaPrep Smoke Tests against: ${baseUrl}`)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

if (!supabaseUrl || !supabaseServiceKey || !redisUrl || !redisToken) {
  console.error("Missing configuration in .env.local")
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const redis = new Redis({
  url: redisUrl,
  token: redisToken,
})

async function runTests() {
  let passed = 0
  let failed = 0

  // 0. Cleanup Test User from DB & Supabase Auth to ensure clean run
  console.log("\n[0/5] Cleaning up test user...")
  try {
    const { data: users } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("phone", testPhone)
    
    if (users && users.length > 0) {
      for (const u of users) {
        await supabaseAdmin.from("users").delete().eq("id", u.id)
        await supabaseAdmin.auth.admin.deleteUser(u.id).catch(() => {})
      }
      console.log("Existing test user deleted successfully.")
    } else {
      console.log("No pre-existing test user found.")
    }
  } catch (e) {
    console.warn("Cleanup warning:", e)
  }

  // Test 1: Health Check API
  console.log("\n[1/5] Testing Health Check API...")
  try {
    const res = await fetch(`${baseUrl}/api/health`)
    const data = await res.json()
    console.log(`Response status: ${res.status}`)
    console.log("Response payload:", data)
    if (res.status === 200 && data.success === true && data.data && data.data.ok === true && data.data.db === true && data.data.redis === true) {
      console.log("✅ Test 1: Health Check Passed!")
      passed++
    } else {
      throw new Error(`Invalid response payload: ${JSON.stringify(data)}`)
    }
  } catch (e: any) {
    console.error("❌ Test 1: Health Check Failed!", e.message)
    failed++
  }

  // Test 2: Auth Flow - Send OTP & Retrieve from Redis
  console.log("\n[2/5] Testing Auth - Send OTP...")
  let otpCode: string | null = null
  try {
    const res = await fetch(`${baseUrl}/api/auth/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: testPhone }),
    })
    const data = await res.json()
    console.log(`Response status: ${res.status}`)
    console.log("Response payload:", data)

    if (res.status === 200 && data.success === true) {
      // Fetch OTP from Redis directly
      const hashedOtp = await redis.get<string>(`otp:${testPhone}`)
      console.log(`Hashed OTP retrieved from Redis: ${hashedOtp}`)
      
      // Let's search for the raw OTP from the log or mock it.
      // Wait! Because the system generates OTP and hashes it, we cannot reverse a SHA-256 hash.
      // So let's insert a known raw OTP hash directly in Redis to bypass Termii for testing!
      otpCode = "999999"
      const crypto = require("crypto")
      const newHash = crypto.createHash("sha256").update(otpCode).digest("hex")
      await redis.setex(`otp:${testPhone}`, 600, newHash)
      console.log(`Overrode OTP in Redis with test code "999999" (hash: ${newHash})`)
      
      console.log("✅ Test 2: Send OTP Passed!")
      passed++
    } else {
      throw new Error(`Invalid response: ${JSON.stringify(data)}`)
    }
  } catch (e: any) {
    console.error("❌ Test 2: Send OTP Failed!", e.message)
    failed++
  }

  // Test 3: Auth Flow - Verify OTP, Register, and Login
  console.log("\n[3/5] Testing Auth - Verification, Registration, and Login...")
  let authHeaders: Record<string, string> = {}
  try {
    if (!otpCode) throw new Error("Skipping Test 3: OTP was not generated.")

    // A. Verify OTP
    console.log("A. Verifying OTP...")
    const verifyRes = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: testPhone, otp: otpCode }),
    })
    const verifyData = await verifyRes.json()
    console.log(`Verify OTP response status: ${verifyRes.status}`)
    console.log("Verify OTP response payload:", verifyData)
    if (verifyRes.status !== 200 || !verifyData.success) {
      throw new Error("OTP verification failed")
    }

    // B. Register User
    console.log("B. Registering User...")
    const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: testPhone,
        firstName: "Test",
        lastName: "User",
        pin: testPin,
        examTypes: ["JAMB", "WAEC"],
        targetScore: 310,
      }),
    })
    const registerData = await registerRes.json()
    console.log(`Register response status: ${registerRes.status}`)
    console.log("Register response payload:", registerData)
    if (registerRes.status !== 200 || !registerData.success) {
      throw new Error("Registration failed")
    }

    // C. Login User to get access token
    console.log("C. Logging in...")
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: testPhone, pin: testPin }),
    })
    const loginData = await loginRes.json()
    console.log(`Login response status: ${loginRes.status}`)
    console.log("Login response payload:", loginData)
    if (loginRes.status !== 200 || !loginData.success) {
      throw new Error("Login failed")
    }

    const { accessToken, session } = loginData.data
    const refreshToken = session.refresh_token
    
    // Construct standard Supabase SSR cookies to pass in request
    const projectRef = "ouskruinmnukrwwbvtgo"
    const cookieName = `sb-${projectRef}-auth-token`
    const cookieVal = encodeURIComponent(JSON.stringify([accessToken, refreshToken]))

    authHeaders = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
      "Cookie": `${cookieName}=${cookieVal}`,
    }

    console.log("✅ Test 3: Auth Verification, Registration, and Login Passed!")
    passed++
  } catch (e: any) {
    console.error("❌ Test 3: Auth Flow Failed!", e.message)
    failed++
  }

  // Test 4: Subjects & Questions Fetching
  console.log("\n[4/5] Testing Subjects & Questions Fetching...")
  let subjectId: string | null = null
  try {
    if (!authHeaders.Authorization) throw new Error("Skipping Test 4: Unauthenticated.")

    // A. Fetch Subjects
    console.log("A. Fetching Subjects...")
    const subRes = await fetch(`${baseUrl}/api/subjects`, {
      method: "GET",
      headers: authHeaders,
    })
    const subData = await subRes.json()
    console.log(`Subjects response status: ${subRes.status}`)
    console.log(`Subjects returned: ${subData.data?.length || 0}`)
    
    if (subRes.status !== 200 || !subData.success || !subData.data || subData.data.length === 0) {
      throw new Error("Failed to retrieve subjects")
    }

    subjectId = subData.data[0].id
    console.log(`First subject ID: ${subjectId} (${subData.data[0].name})`)

    // Ensure we have at least one question in database for testing
    const { data: qData } = await supabaseAdmin
      .from("questions")
      .select("id")
      .eq("subject_id", subjectId)
      .limit(1)

    let testQuestionId: string
    if (!qData || qData.length === 0) {
      console.log("No questions found in database. Inserting a dummy question for testing...")
      const { data: newQ, error: insertErr } = await supabaseAdmin
        .from("questions")
        .insert({
          subject_id: subjectId,
          exam_type: "JAMB",
          year: 2024,
          question_text: "What is the capital of Nigeria?",
          option_a: "Lagos",
          option_b: "Abuja",
          option_c: "Ibadan",
          option_d: "Enugu",
          correct_option: "B",
          difficulty: "easy",
          is_active: true,
        })
        .select("id")
        .single()

      if (insertErr) {
        throw new Error(`Failed to insert dummy question: ${insertErr.message}`)
      }
      testQuestionId = newQ.id
      console.log(`Inserted dummy question ID: ${testQuestionId}`)
    } else {
      testQuestionId = qData[0].id
      console.log(`Using existing question ID: ${testQuestionId}`)
    }

    // B. Fetch Questions via API
    console.log("B. Fetching Questions...")
    const qRes = await fetch(`${baseUrl}/api/questions?subjectId=${subjectId}&examType=JAMB&count=5`, {
      method: "GET",
      headers: authHeaders,
    })
    const questionsData = await qRes.json()
    console.log(`Questions response status: ${qRes.status}`)
    console.log(`Questions returned: ${questionsData.data?.length || 0}`)

    if (qRes.status !== 200 || !questionsData.success || !questionsData.data) {
      throw new Error("Failed to retrieve questions via API")
    }

    console.log("✅ Test 4: Subjects and Questions Fetching Passed!")
    passed++
  } catch (e: any) {
    console.error("❌ Test 4: Subjects & Questions Fetching Failed!", e.message)
    failed++
  }

  // Test 5: AI Explanation Route
  console.log("\n[5/5] Testing AI Explanations...")
  try {
    if (!authHeaders.Authorization) throw new Error("Skipping Test 5: Unauthenticated.")
    if (!subjectId) throw new Error("Skipping Test 5: Subject ID missing.")

    // Give user a subscription to bypass Pro plan check
    const { data: userProfile } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("phone", testPhone)
      .single()

    if (userProfile) {
      await supabaseAdmin
        .from("users")
        .update({ plan: "student" }) // Pro plan check checks for "student" or "school"
        .eq("id", userProfile.id)
      console.log(`Upgraded user ${userProfile.id} to "student" plan for explanation testing.`)
    }

    const { data: qData } = await supabaseAdmin
      .from("questions")
      .select("id")
      .eq("subject_id", subjectId)
      .limit(1)

    if (!qData || qData.length === 0) {
      throw new Error("No question available to request explanation for.")
    }

    const questionId = qData[0].id
    console.log(`Requesting explanation for Question ID: ${questionId}`)

    // Clear explanation cache in Redis first to force AI path test
    await redis.del(`explanation:${questionId}:v1`)
    console.log("Cleared Redis explanation cache for force check.")

    const expRes = await fetch(`${baseUrl}/api/explanations/${questionId}`, {
      method: "GET",
      headers: authHeaders,
    })
    const expData = await expRes.json()
    console.log(`Explanation response status: ${expRes.status}`)
    console.log("Explanation response payload:", expData)

    if (expRes.status !== 200 || !expData.success || !expData.data || !expData.data.explanation) {
      throw new Error(`Failed explanation retrieval: ${JSON.stringify(expData)}`)
    }

    console.log("✅ Test 5: AI Explanations Route Passed!")
    passed++
  } catch (e: any) {
    console.error("❌ Test 5: AI Explanations Route Failed!", e.message)
    failed++
  }

  // Final summary
  console.log("\n==================================")
  console.log(`SMOKE TESTS COMPLETED: ${passed} Passed, ${failed} Failed`)
  console.log("==================================")

  // Exit code reflecting tests success
  process.exit(failed > 0 ? 1 : 0)
}

runTests()
