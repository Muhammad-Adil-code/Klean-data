/**
 * Records a live Klean Data demo:
 * Login → Chat → Select "data" SQLite DB → Query 1 → Results → Query 2 → Results
 * Outputs: screenshots/demo.gif
 *
 * Requires: backend on :8766 (with "data" SQLite connector), vite preview on :4174
 */
import puppeteer from 'puppeteer-core'
import { mkdir, readdir, unlink } from 'fs/promises'
import path from 'path'

const CHROME       = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const BASE         = 'http://localhost:4174'
const CONNECTOR_ID = '23c27118'   // "data" — SQLite sample_store.db
const FRAMES       = path.resolve('./screenshots/demo_frames')

// ── setup ──────────────────────────────────────────────────────────────────

await mkdir(FRAMES, { recursive: true })
const old = await readdir(FRAMES).catch(() => [])
for (const f of old) await unlink(path.join(FRAMES, f)).catch(() => {})

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--window-size=1440,900'],
  defaultViewport: { width: 1440, height: 900 },
})
const page = await browser.newPage()

let idx = 0
const snap     = () => page.screenshot({ path: `${FRAMES}/${String(idx++).padStart(5,'0')}.png` })
const wait     = ms  => new Promise(r => setTimeout(r, ms))
const hold     = async (n, ms = 120) => { for (let i = 0; i < n; i++) { await snap(); await wait(ms) } }
const typeChar = async (ch, delay = 55) => { await page.keyboard.type(ch); await snap(); await wait(delay) }

// Snap continuously while awaiting a condition
async function snapWhile(fn, interval = 160) {
  let done = false
  const loop = async () => { while (!done) { await snap(); await wait(interval) } }
  const loopP = loop()
  await fn()
  done = true
  await loopP
}

// ── Scene 1: Login ─────────────────────────────────────────────────────────
console.log('Scene 1: Login page')
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' })
await hold(10)

// Type email
await page.focus('input[type="email"]')
for (const ch of 'adil@kleandata.com') await typeChar(ch)
await hold(4)

// Tab to password
await page.keyboard.press('Tab')
for (const ch of 'password123') await typeChar(ch, 60)
await hold(4)

// Submit
await snapWhile(async () => {
  await page.click('button[type="submit"]')
  await wait(1200)
}, 130)
await hold(8)

// ── Scene 2: Chat tab already active — show empty "no source" state ────────
console.log('Scene 2: Chat — no source selected')
await hold(10)

// ── Scene 3: Click the DB icon to select data source ──────────────────────
console.log('Scene 3: Select the SQLite "data" connector')
// Change the hidden select in the chat bar to pick our connector
await page.evaluate((id) => {
  const selects = document.querySelectorAll('select')
  for (const s of selects) {
    const opt = Array.from(s.options).find(o => o.value === id)
    if (opt) {
      s.value = id
      s.dispatchEvent(new Event('change', { bubbles: true }))
      break
    }
  }
}, CONNECTOR_ID)
await hold(10) // show empty state with DB selected

// ── Scene 4: Type first query ──────────────────────────────────────────────
console.log('Scene 4: Type first query')
await page.focus('textarea')
await hold(4)
for (const ch of 'Show me top 5 customers by total spend') await typeChar(ch, 52)
await hold(6)

// ── Scene 5: Send and wait for Action Plan ─────────────────────────────────
console.log('Scene 5: Send query, wait for plan...')
await snapWhile(async () => {
  await page.keyboard.press('Enter')
  await page.waitForFunction(
    () => document.body.innerText.includes('Action Plan'),
    { timeout: 25000 }
  ).catch(() => {})
  await wait(600)
}, 160)
await hold(14)

// ── Scene 6: Click Run ─────────────────────────────────────────────────────
console.log('Scene 6: Run the plan')
await snapWhile(async () => {
  await page.evaluate(() => {
    document.querySelectorAll('button').forEach(b => {
      if (b.textContent?.includes('Run') && b.textContent?.includes('step')) b.click()
    })
  })
  await page.waitForFunction(
    () => {
      const t = document.body.innerText
      return t.includes(' rows') && (t.includes('David') || t.includes('Carol') || t.includes('Alice') || t.includes('rows\n'))
    },
    { timeout: 20000 }
  ).catch(() => {})
  await wait(700)
}, 160)
await hold(22) // hold on results table

// ── Scene 7: Second query ──────────────────────────────────────────────────
console.log('Scene 7: Second query')
await page.focus('textarea')
await hold(5)
for (const ch of 'Which products are low on stock?') await typeChar(ch, 52)
await hold(5)

await snapWhile(async () => {
  await page.keyboard.press('Enter')
  await page.waitForFunction(
    () => (document.body.innerText.match(/Action Plan/g) || []).length >= 2,
    { timeout: 25000 }
  ).catch(() => {})
  await wait(600)
}, 160)
await hold(12)

// click Run on last plan
await snapWhile(async () => {
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
      .filter(b => b.textContent?.includes('Run') && b.textContent?.includes('step'))
    if (btns.length) btns[btns.length - 1].click()
  })
  await page.waitForFunction(
    () => (document.body.innerText.match(/ rows/g) || []).length >= 2,
    { timeout: 20000 }
  ).catch(() => {})
  await wait(700)
}, 160)
await hold(24) // final hold

await browser.close()
console.log(`\n✓ ${idx} frames → ${FRAMES}`)
