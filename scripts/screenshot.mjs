import puppeteer from 'puppeteer-core'
import { mkdir } from 'fs/promises'
import path from 'path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const BASE   = 'http://localhost:4173'
const OUT    = path.resolve('./screenshots')

await mkdir(OUT, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--window-size=1440,900'],
  defaultViewport: { width: 1440, height: 900 },
})

const page = await browser.newPage()

async function shot(name, url, wait = 1200) {
  await page.goto(url, { waitUntil: 'networkidle0' })
  await new Promise(r => setTimeout(r, wait))
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false })
  console.log(`✓ ${name}`)
}

// Login page
await shot('01_login', `${BASE}/login`)

// Signup page
await shot('02_signup', `${BASE}/signup`)

// Main chat — no source
await shot('03_chat_empty', `${BASE}/app`)

// Connectors tab
await page.goto(`${BASE}/app`, { waitUntil: 'networkidle0' })
await page.evaluate(() => {
  // Click the Connectors nav item
  const btns = document.querySelectorAll('button')
  for (const b of btns) { if (b.textContent?.includes('Connector')) { b.click(); break } }
})
await new Promise(r => setTimeout(r, 800))
await page.screenshot({ path: `${OUT}/04_connectors.png` }); console.log('✓ 04_connectors')

// Show "Add database" form
await page.evaluate(() => {
  const btns = document.querySelectorAll('button')
  for (const b of btns) { if (b.textContent?.includes('Add Database') || b.textContent?.includes('Add Database')) { b.click(); break } }
})
await new Promise(r => setTimeout(r, 600))
await page.screenshot({ path: `${OUT}/05_add_connector.png` }); console.log('✓ 05_add_connector')

// AI Config tab
await page.goto(`${BASE}/app`, { waitUntil: 'networkidle0' })
await page.evaluate(() => {
  const btns = document.querySelectorAll('button')
  for (const b of btns) { if (b.textContent?.includes('AI Config')) { b.click(); break } }
})
await new Promise(r => setTimeout(r, 800))
await page.screenshot({ path: `${OUT}/06_ai_config.png` }); console.log('✓ 06_ai_config')

// Chat with bell popover open
await page.goto(`${BASE}/app`, { waitUntil: 'networkidle0' })
await page.evaluate(() => {
  const btns = document.querySelectorAll('button')
  for (const b of btns) { if (b.title?.includes('Bell') || b.querySelector('path[d*="bell"]') || b.innerHTML.includes('18 8A6')) { b.click(); break } }
  // Fallback — find by svg path
  document.querySelectorAll('button').forEach(b => {
    if (b.innerHTML.includes('M18 8A6 6 0 0 0 6')) b.click()
  })
})
await new Promise(r => setTimeout(r, 700))
await page.screenshot({ path: `${OUT}/07_bell_popup.png` }); console.log('✓ 07_bell_popup')

await browser.close()
console.log('\nAll screenshots saved to ./screenshots/')
