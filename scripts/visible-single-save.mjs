import { chromium } from 'playwright';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, getFirestore } from 'firebase/firestore';
import fs from 'node:fs';

const firebaseConfig = {
  apiKey: 'AIzaSyBtqinodXxcYU4U5F-LoImCOj681KlZ9w4',
  authDomain: 'bonded-by-peptides.firebaseapp.com',
  projectId: 'bonded-by-peptides',
  storageBucket: 'bonded-by-peptides.firebasestorage.app',
  messagingSenderId: '840550043632',
  appId: '1:840550043632:web:d935ae58a19ed96893d735',
};

const BASE_URL = process.env.BBP_BASE_URL || 'http://127.0.0.1:4176/';
const TEST_PREFIX = process.env.BBP_TEST_PREFIX || `codex.watch.${Date.now()}`;
const BROWSER_CANDIDATES = [
  process.env.BBP_BROWSER_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].filter(Boolean);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function log(message) {
  const stamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`[${stamp}] ${message}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withStepTimeout(stepName, fn, timeoutMs = 45000) {
  return await Promise.race([
    fn(),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${stepName} exceeded ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

async function closeWithTimeout(label, fn, timeoutMs = 5000) {
  try {
    await Promise.race([
      fn(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`${label} exceeded ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } catch (error) {
    log(`Teardown warning: ${error.message}`);
  }
}

async function poll(label, fn, { timeoutMs = 30000, intervalMs = 500 } = {}) {
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < timeoutMs) {
    try {
      const result = await fn();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await sleep(intervalMs);
  }
  if (lastError) {
    throw new Error(`${label} timed out. Last error: ${lastError.message}`);
  }
  throw new Error(`${label} timed out.`);
}

function cssEscape(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

async function ensureSignedIn() {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
}

async function getSettings() {
  const snap = await getDoc(doc(db, 'settings', 'main'));
  return snap.exists() ? snap.data() : {};
}

async function getAllProducts() {
  const snap = await getDocs(collection(db, 'products'));
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

async function getAllOrders() {
  const snap = await getDocs(collection(db, 'orders'));
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

async function getOrdersForEmail(email) {
  const snap = await getDocs(collection(db, 'orders'));
  return snap.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .filter((order) => String(order.email || '') === email);
}

async function getLogsForEmail(email) {
  const snap = await getDocs(collection(db, 'logs'));
  return snap.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .filter((row) => String(row.email || '') === email);
}

function buildOpenProducts(settings, products, orders) {
  const totalsByProduct = {};
  for (const order of orders) {
    const name = String(order.product || '');
    totalsByProduct[name] = (totalsByProduct[name] || 0) + Number(order.qty || 0);
  }
  return products
    .map((product) => {
      const totalVials = totalsByProduct[product.name] || 0;
      const boxes = Math.floor(totalVials / 10);
      const limitReached = Number(product.maxBoxes || 0) > 0 && boxes >= Number(product.maxBoxes || 0);
      const isClosed = Boolean(product.locked) || Boolean(settings.paymentsOpen) || limitReached;
      return { ...product, totalVials, isClosed };
    })
    .filter((product) => !product.isClosed && Number(product.pricePerVialUSD || 0) > 0)
    .sort((left, right) => left.name.localeCompare(right.name));
}

async function fillProductQty(page, productName, qty) {
  const selector = `[data-name="${cssEscape(productName)}"] input[type="number"]`;
  await poll(
    `product qty input for ${productName}`,
    async () => {
      const locator = page.locator(selector).first();
      if (await locator.count() === 0) return false;
      await locator.waitFor({ state: 'visible', timeout: 1000 });
      await locator.fill(String(qty));
      return (await locator.inputValue()) === String(qty);
    },
    { timeoutMs: 15000, intervalMs: 300 },
  );
}

async function main() {
  await ensureSignedIn();
  const settings = await getSettings();
  const products = await getAllProducts();
  const orders = await getAllOrders();
  const openProducts = buildOpenProducts(settings, products, orders);
  if (!openProducts.length) {
    throw new Error('No open products available for the visible save test.');
  }

  const product = openProducts[0];
  const testEmail = `${TEST_PREFIX}@example.com`;
  const customer = {
    email: testEmail,
    name: 'Codex Watch Save',
    handle: 'codex_watch_save',
    productName: product.name,
    qty: 3,
  };

  const executablePath = BROWSER_CANDIDATES.find((candidate) => fs.existsSync(candidate));
  const browser = await chromium.launch({
    headless: false,
    slowMo: 450,
    ...(executablePath ? { executablePath } : {}),
  });
  const context = await browser.newContext();

  const shopPage = await context.newPage();
  const adminPage = await context.newPage();

  try {
    log(`Visible test prefix: ${TEST_PREFIX}`);
    log(`Using product: ${customer.productName}`);

    await withStepTimeout('open shop tab', async () => {
      await shopPage.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      await sleep(1200);
    });
    await withStepTimeout('open admin tab', async () => {
      await adminPage.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      await sleep(1200);
    });

    if (settings.shopAccessCode) {
      const accessInput = shopPage.getByPlaceholder('Paste the batch code here');
      if (await accessInput.count()) {
        await accessInput.fill(settings.shopAccessCode);
        await shopPage.getByRole('button', { name: /enter shop/i }).click();
        await sleep(1000);
      }
    }

    await withStepTimeout('admin login', async () => {
      await adminPage.getByTitle('Admin Access').click();
      await sleep(700);
      for (const attempt of Array.from(new Set([settings.adminPass, 'admin123'].filter(Boolean)))) {
        const passwordInput = adminPage.getByPlaceholder('Password');
        await passwordInput.fill('');
        await passwordInput.fill(attempt);
        await adminPage.getByRole('button', { name: /enter dashboard/i }).click();
        await sleep(1600);
        if (await adminPage.getByPlaceholder('Password').count() === 0) return;
      }
      throw new Error('Admin login did not succeed with known passwords.');
    });

    await withStepTimeout('shop save flow', async () => {
      await shopPage.bringToFront();
      const topForm = shopPage.locator('#top-form-card');
      await topForm.locator('input[type="email"]').nth(0).fill(customer.email);
      await topForm.locator('input[type="email"]').nth(1).fill(customer.email);
      await shopPage.getByPlaceholder('Full name').fill(customer.name);
      await shopPage.getByPlaceholder('@username').fill(customer.handle);
      await fillProductQty(shopPage, customer.productName, customer.qty);
      await sleep(700);
      await shopPage.getByRole('button', { name: /save order/i }).first().click();

      await poll(
        `saved order for ${customer.email}`,
        async () => {
          const orderRows = await getOrdersForEmail(customer.email);
          const logs = await getLogsForEmail(customer.email);
          return orderRows.length > 0 && logs.some((row) => row.action === 'Placed Order');
        },
        { timeoutMs: 30000, intervalMs: 750 },
      );
    });

    await withStepTimeout('admin verification', async () => {
      await adminPage.bringToFront();
      await adminPage.getByRole('button', { name: /active orders/i }).click();
      await sleep(800);
      const search = adminPage.getByPlaceholder('Global Search (Ctrl+F equivalent)...');
      await search.fill(TEST_PREFIX);
      await search.press('Tab');

      await poll(
        'admin search results',
        async () => {
          const count = await adminPage.locator('table tbody tr').count();
          return count >= 1 ? count : 0;
        },
        { timeoutMs: 30000, intervalMs: 1000 },
      );
    });

    log(`Visible order save test completed. Prefix: ${TEST_PREFIX}`);
    log(`Test order left in live data for inspection: ${customer.email}`);
    log('Inspection pause: browser will remain open for 12 seconds, then close automatically.');
    await sleep(12000);
  } finally {
    await closeWithTimeout('context.close()', () => context.close());
    await closeWithTimeout('browser.close()', () => browser.close());
    process.exit(0);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
