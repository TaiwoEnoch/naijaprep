import { Client } from "@upstash/qstash"

export const qstash = new Client({ token: process.env.QSTASH_TOKEN! })

export async function enqueue(
  endpoint: string,
  body: unknown,
  options?: { delay?: number; retries?: number }
) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}${endpoint}`
  return qstash.publishJSON({
    url,
    body,
    retries: options?.retries ?? 3,
    delay: options?.delay ?? 0,
  })
}
