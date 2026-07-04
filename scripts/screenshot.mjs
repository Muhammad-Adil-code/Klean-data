import puppeteer from 'puppeteer-core'
import { mkdir } from 'fs/promises'
import path from 'path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const BASE   = 'http://localhost:4174'
const OUT    = path.resolve('./screenshots')

await mkdir(OUT, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--window-size=1440,900'],
  defaultViewport: { width: 1440, height: 900 },
})

const page = await browser.newPage()

// Inject a fake auth session so /app doesn't redirect to /login
async function setAuth() {
  await page.evaluate(() => {
    localStorage.setItem('kd_user', JSON.stringify({ name: 'Muhammad Adil', email: 'adil.mern.ai@gmail.com' }))
  })
}

async function shot(name, url, wait = 1200) {
  await page.goto(url, { waitUntil: 'networkidle0' })
  await new Promise(r => setTimeout(r, wait))
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false })
  console.log(`✓ ${name}`)
}

// --- Auth pages ---
await shot('01_login',  `${BASE}/login`)
await shot('02_signup', `${BASE}/signup`)

// Seed auth for all subsequent app pages
await page.goto(BASE, { waitUntil: 'networkidle0' })
await setAuth()

// --- Chat (empty state) ---
await shot('03_chat_empty', `${BASE}/app`)

// --- Connectors tab ---
await page.goto(`${BASE}/app`, { waitUntil: 'networkidle0' })
await setAuth()
await page.evaluate(() => {
  document.querySelectorAll('button').forEach(b => {
    if (b.textContent?.includes('Connector')) b.click()
  })
})
await new Promise(r => setTimeout(r, 800))
await page.screenshot({ path: `${OUT}/04_connectors.png` })
console.log('✓ 04_connectors')

// Show "Add database" form
await page.evaluate(() => {
  document.querySelectorAll('button').forEach(b => {
    if (b.textContent?.includes('Add Database')) b.click()
  })
})
await new Promise(r => setTimeout(r, 600))
await page.screenshot({ path: `${OUT}/05_add_connector.png` })
console.log('✓ 05_add_connector')

// --- AI Config tab ---
await page.goto(`${BASE}/app`, { waitUntil: 'networkidle0' })
await setAuth()
await page.evaluate(() => {
  document.querySelectorAll('button').forEach(b => {
    if (b.textContent?.includes('AI Config')) b.click()
  })
})
await new Promise(r => setTimeout(r, 800))
await page.screenshot({ path: `${OUT}/06_ai_config.png` })
console.log('✓ 06_ai_config')

// --- Bell popover ---
await page.goto(`${BASE}/app`, { waitUntil: 'networkidle0' })
await setAuth()
await new Promise(r => setTimeout(r, 600))
await page.evaluate(() => {
  document.querySelectorAll('button').forEach(b => {
    if (b.innerHTML.includes('M18 8A6 6 0 0 0 6')) b.click()
  })
})
await new Promise(r => setTimeout(r, 700))
await page.screenshot({ path: `${OUT}/07_bell_popup.png` })
console.log('✓ 07_bell_popup')

await browser.close()
console.log('\nAll screenshots saved to ./screenshots/')
