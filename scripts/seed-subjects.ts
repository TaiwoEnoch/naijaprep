import { createClient } from "@supabase/supabase-js"
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
          // remove quotes if any
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const subjectsData = [
  { name: "Mathematics", slug: "mathematics", icon: "math", exam_types: ["JAMB", "WAEC", "NECO"], sort_order: 1 },
  { name: "English Language", slug: "english", icon: "book", exam_types: ["JAMB", "WAEC", "NECO"], sort_order: 2 },
  { name: "Physics", slug: "physics", icon: "atom", exam_types: ["JAMB", "WAEC", "NECO"], sort_order: 3 },
  { name: "Chemistry", slug: "chemistry", icon: "beaker", exam_types: ["JAMB", "WAEC", "NECO"], sort_order: 4 },
  { name: "Biology", slug: "biology", icon: "dna", exam_types: ["JAMB", "WAEC", "NECO"], sort_order: 5 },
  { name: "Economics", slug: "economics", icon: "trending-up", exam_types: ["JAMB", "WAEC", "NECO"], sort_order: 6 },
  { name: "Government", slug: "government", icon: "landmark", exam_types: ["JAMB", "WAEC", "NECO"], sort_order: 7 },
  { name: "Literature in English", slug: "literature", icon: "feather", exam_types: ["JAMB", "WAEC", "NECO"], sort_order: 8 },
  { name: "Civic Education", slug: "civic-education", icon: "users", exam_types: ["WAEC", "NECO"], sort_order: 9 },
  { name: "Geography", slug: "geography", icon: "globe", exam_types: ["JAMB", "WAEC", "NECO"], sort_order: 10 },
  { name: "Agricultural Science", slug: "agricultural-science", icon: "leaf", exam_types: ["JAMB", "WAEC", "NECO"], sort_order: 11 },
  { name: "Commerce", slug: "commerce", icon: "shopping-bag", exam_types: ["JAMB", "WAEC", "NECO"], sort_order: 12 },
  { name: "Financial Accounting", slug: "accounting", icon: "calculator", exam_types: ["JAMB", "WAEC", "NECO"], sort_order: 13 },
  { name: "History", slug: "history", icon: "hourglass", exam_types: ["JAMB", "WAEC", "NECO"], sort_order: 14 },
  { name: "Christian Religious Studies", slug: "crs", icon: "cross", exam_types: ["JAMB", "WAEC", "NECO"], sort_order: 15 },
  { name: "Islamic Religious Studies", slug: "irs", icon: "crescent", exam_types: ["JAMB", "WAEC", "NECO"], sort_order: 16 },
  { name: "Computer Studies", slug: "computer-studies", icon: "monitor", exam_types: ["JAMB", "WAEC", "NECO"], sort_order: 17 },
  { name: "Yoruba", slug: "yoruba", icon: "languages", exam_types: ["JAMB", "WAEC", "NECO"], sort_order: 18 },
  { name: "Igbo", slug: "igbo", icon: "languages", exam_types: ["JAMB", "WAEC", "NECO"], sort_order: 19 },
  { name: "Hausa", slug: "hausa", icon: "languages", exam_types: ["JAMB", "WAEC", "NECO"], sort_order: 20 },
]

async function seed() {
  console.log("Seeding subjects...")
  
  // Upsert subjects based on unique slug
  const { data, error } = await supabase
    .from("subjects")
    .upsert(subjectsData, { onConflict: "slug" })
    .select()

  if (error) {
    console.error("Error seeding subjects:", error)
    process.exit(1)
  }

  console.log(`Success! Seeded ${data.length} subjects.`)
}

seed()
