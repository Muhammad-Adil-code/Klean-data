/**
 * Records a live interaction demo of Klean Data:
 * Login → Add SQLite DB → Chat query → Results
 * Outputs: screenshots/demo.gif
 *
 * Requires: backend on :8766, vite preview on :4174
 */
import puppeteer from 'puppeteer-core'
import { mkdir, readdir, unlink } from 'fs/promises'
import path from 'path'

const CHROME  = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const BASE    = 'http://localhost:4174'
const DB_PATH = '/Users/primeteaser/Desktop/own/datalib/sample_data/sample_store.db'
const FRAMES  = path.resolve('./screenshots/demo_frames')

// ── helpers ────────────────────────────────────────────────────────────────

await mkdir(FRAMES, { recursive: true })
// clear old frames
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
const snap = () => page.screenshot({ path: `${FRAMES}/${String(idx++).padStart(5,'0')}.png` })
const wait = ms => new Promise(r => setTimeout(r, ms))

// Hold current frame for N×interval ms
async function hold(frames, interval = 120) {
  for (let i = 0; i < frames; i++) { await snap(); await wait(interval) }
}

// Snap continuously while action runs
async function snapWhile(fn, interval = 150) {
  let done = false
  const loop = async () => { while (!done) { await snap(); await wait(interval) } }
  const loopP = loop()
  await fn()
  done = true
  await loopP
}

async function typeSlowly(selector, text, delay = 55) {
  await page.focus(selector)
  for (const ch of text) { await page.keyboard.type(ch); await snap(); await wait(delay) }
}

// ── Scene 1: Login page ────────────────────────────────────────────────────
console.log('Scene 1: Login')
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' })
await hold(12) // show login

// type email
await typeSlowly('input[type="email"]', 'adil@kleandata.com')
await hold(4)
// type password
await typeSlowly('input[type="password"]', 'password123')
await hold(4)

// click sign in
await snapWhile(async () => {
  await page.click('button[type="submit"]')
  await wait(1400)
}, 130)
await hold(6)

// ── Scene 2: App loaded — connectors tab ───────────────────────────────────
console.log('Scene 2: Connectors')
await page.evaluate(() => {
  document.querySelectorAll('button').forEach(b => {
    if (b.textContent?.trim() === 'Connectors') b.click()
  })
})
await hold(8)

// open Add Database form
await page.evaluate(() => {
  document.querySelectorAll('button').forEach(b => {
    if (b.textContent?.includes('Add Database')) b.click()
  })
})
await hold(6)

// select SQLite
await page.select('select', 'sqlite')
await hold(3)

// type the path
await typeSlowly('input[placeholder*="absolute"]', DB_PATH, 40)
await hold(4)

// click Add & Test
console.log('  Testing connection...')
await snapWhile(async () => {
  await page.evaluate(() => {
    document.querySelectorAll('button').forEach(b => {
      if (b.textContent?.includes('Add & Test')) b.click()
    })
  })
  await wait(4000)
}, 180)
await hold(10) // show connected state

// click the connector card to make it active
await page.evaluate(() => {
  const cards = document.querySelectorAll('button.btn')
  // click the connector card itself (first card in the grid)
  const grid = document.querySelector('[style*="auto-fill"]')
  if (grid) {
    const card = grid.firstElementChild
    if (card) card.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  }
})
// Try clicking by finding the card div
await page.evaluate(() => {
  document.querySelectorAll('div').forEach(d => {
    if (d.style && d.style.borderRadius === '16px') { d.click(); }
  })
})
await hold(6)

// ── Scene 3: Chat tab ──────────────────────────────────────────────────────
console.log('Scene 3: Chat')
await page.evaluate(() => {
  document.querySelectorAll('button').forEach(b => {
    if (b.textContent?.trim() === 'AI Chat') b.click()
  })
})
await hold(10)

// select the connector from the DB dropdown in chat bar
await page.evaluate(() => {
  const selects = document.querySelectorAll('select')
  for (const s of selects) {
    const opts = Array.from(s.options)
    const db = opts.find(o => o.text.includes('sqlite') || o.text.includes('sample') || (o.value && o.value.length > 5))
    if (db) { s.value = db.value; s.dispatchEvent(new Event('change', { bubbles: true })); break }
  }
})
await hold(8)

// ── Scene 4: Type query ────────────────────────────────────────────────────
console.log('Scene 4: Typing query...')
const query = 'Show me top 5 customers by total spend'
await page.focus('textarea')
await hold(4)
for (const ch of query) {
  await page.keyboard.type(ch)
  await snap()
  await wait(52)
}
await hold(6)

// ── Scene 5: Send & wait for plan ─────────────────────────────────────────
console.log('Scene 5: Sending...')
await snapWhile(async () => {
  await page.keyboard.press('Enter')
  // wait for plan card to appear (up to 18s)
  await page.waitForFunction(
    () => document.body.innerText.includes('Action Plan') || document.body.innerText.includes('Analysis:'),
    { timeout: 18000 }
  ).catch(() => {})
  await wait(500)
}, 160)
await hold(14) // show plan card

// ── Scene 6: Click Run ─────────────────────────────────────────────────────
console.log('Scene 6: Running query...')
await snapWhile(async () => {
  await page.evaluate(() => {
    document.querySelectorAll('button').forEach(b => {
      if (b.textContent?.includes('Run') && b.textContent?.includes('step')) b.click()
    })
  })
  // wait for results table
  await page.waitForFunction(
    () => document.body.innerText.includes('rows') && document.body.innerText.includes('David Lee'),
    { timeout: 18000 }
  ).catch(() => {})
  await wait(600)
}, 160)
await hold(20) // hold on results

// ── Scene 7: Second query ─────────────────────────────────────────────────
console.log('Scene 7: Second query...')
await page.focus('textarea')
await hold(5)
const q2 = 'Which products are low on stock?'
for (const ch of q2) {
  await page.keyboard.type(ch)
  await snap()
  await wait(52)
}
await hold(5)
await snapWhile(async () => {
  await page.keyboard.press('Enter')
  await page.waitForFunction(
    () => {
      const plans = document.querySelectorAll('[style*="Action Plan"], *')
      return document.body.innerText.split('Action Plan').length > 2
    },
    { timeout: 18000 }
  ).catch(() => {})
  await wait(500)
}, 160)
await hold(12)

// click Run on the second plan
await snapWhile(async () => {
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
    const runBtns = btns.filter(b => b.textContent?.includes('Run') && b.textContent?.includes('step'))
    if (runBtns.length > 0) runBtns[runBtns.length - 1].click()
  })
  await page.waitForFunction(
    () => {
      const text = document.body.innerText
      return (text.match(/rows/g) || []).length >= 2
    },
    { timeout: 18000 }
  ).catch(() => {})
  await wait(600)
}, 160)
await hold(22) // final hold on results

await browser.close()
console.log(`\n✓ Captured ${idx} frames → ${FRAMES}`)
