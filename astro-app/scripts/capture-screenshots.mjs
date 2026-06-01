import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:4321';

const viewports = {
  desktop: { width: 1920, height: 1080 }
};

const screens = [
  // Student Pages
  { name: '01_progress', url: '/progress', folder: 'student', role: 'student' },
  { name: '02_programs', url: '/students/programs', folder: 'student', role: 'student' },
  { name: '03_diet', url: '/students/diet', folder: 'student', role: 'student' },
  { name: '04_messages', url: '/messages', folder: 'student', role: 'student' }
];

const credentials = {
  student: { email: 'student@coach.com', password: 'password123' },
};

async function createFolders() {
  const folders = ['student'];
  for (const folder of folders) {
    const dir = path.join(process.cwd(), 'portfolio', folder);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

async function login(page, role) {
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle0' });
  
  if (!page.url().includes('/auth/login')) {
      await page.goto(`${BASE_URL}/api/auth/logout`);
      await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle0' });
  }

  const creds = credentials[role];
  if (!creds) return;

  await page.type('input[name="email"]', creds.email);
  await page.type('input[name="password"]', creds.password);
  
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {}), // Ignore timeout
    page.click('button[type="submit"]')
  ]);
  
  // Extra wait to let double redirects settle
  await new Promise(r => setTimeout(r, 2000));
}

async function main() {
  console.log('Starting screenshot capture for student...');
  await createFolders();

  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    let currentRole = null;
    const page = await browser.newPage();
    await page.setViewport(viewports.desktop);

    for (const screen of screens) {
      console.log(`Capturing ${screen.folder}/${screen.name}...`);
      
      if (currentRole !== screen.role) {
        console.log(`Logging in as ${screen.role}...`);
        const client = await page.target().createCDPSession();
        await client.send('Network.clearBrowserCookies');
        await login(page, screen.role);
        currentRole = screen.role;
      }

      await page.goto(`${BASE_URL}${screen.url}`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 2000));

      const savePath = path.join(process.cwd(), 'portfolio', screen.folder, `${screen.name}.png`);
      await page.screenshot({ path: savePath, fullPage: true });
      console.log(`Saved: ${savePath}`);
    }

    console.log('Screenshots captured successfully!');
  } catch (err) {
    console.error('Error taking screenshots:', err);
  } finally {
    await browser.close();
  }
}

main();
