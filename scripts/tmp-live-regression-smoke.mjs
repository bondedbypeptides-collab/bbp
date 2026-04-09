import { chromium } from 'playwright';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { collection, deleteDoc, doc, getDoc, getDocs, getFirestore } from 'firebase/firestore';
import { deleteObject, getDownloadURL, getStorage, ref as storageRef, refFromURL, uploadBytes } from 'firebase/storage';
import fs from 'node:fs';
import path from 'node:path';

const firebaseConfig = {
  apiKey: 'AIzaSyBtqinodXxcYU4U5F-LoImCOj681KlZ9w4',
  authDomain: 'bonded-by-peptides.firebaseapp.com',
  projectId: 'bonded-by-peptides',
  storageBucket: 'bonded-by-peptides.firebasestorage.app',
  messagingSenderId: '840550043632',
  appId: '1:840550043632:web:d935ae58a19ed96893d735',
  measurementId: 'G-6NMJD9WTS6',
};

const BASE_URL = process.env.BBP_BASE_URL || 'http://127.0.0.1:4176/';
const PREFIX = process.env.BBP_TEST_PREFIX || `codex.regression.${Date.now()}`;
const PROOF_PATH = path.resolve('tmp-proof.png');
const SLOTS_PER_BATCH = 10;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

function log(message) {
  const stamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`[${stamp}] ${message}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function poll(label, fn, { timeoutMs = 30000, intervalMs = 500 } = {}) {
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < timeoutMs) {
    try {
      const value = await fn();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await sleep(intervalMs);
  }
  if (lastError) throw new Error(`${label} timed out: ${lastError.message}`);
  throw new Error(`${label} timed out`);
}

async function ensureSignedIn() {
  if (!auth.currentUser) await signInAnonymously(auth);
}

async function getSettings() {
  const snap = await getDoc(doc(db, 'settings', 'main'));
  return snap.exists() ? snap.data() : {};
}

async function getAllProducts() {
  const snap = await getDocs(collection(db, 'products'));
  return snap.docs.map((row) => ({ id: row.id, ...row.data() }));
}

async function getAllOrders() {
  const snap = await getDocs(collection(db, 'orders'));
  return snap.docs.map((row) => ({ id: row.id, ...row.data() }));
}

async function getOrdersForEmail(email) {
  const snap = await getDocs(collection(db, 'orders'));
  return snap.docs.map((row) => ({ id: row.id, ...row.data() })).filter((row) => row.email === email);
}

async function getLogsForEmail(email) {
  const snap = await getDocs(collection(db, 'logs'));
  return snap.docs.map((row) => ({ id: row.id, ...row.data() })).filter((row) => row.email === email);
}

async function getUsersByPrefix(prefix) {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((row) => ({ id: row.id, ...row.data() })).filter((row) => row.id.startsWith(prefix));
}

async function getOrdersByPrefix(prefix) {
  const snap = await getDocs(collection(db, 'orders'));
  return snap.docs.map((row) => ({ id: row.id, ...row.data() })).filter((row) => String(row.data().email || '').startsWith(prefix));
}

async function getLogsByPrefix(prefix) {
  const snap = await getDocs(collection(db, 'logs'));
  return snap.docs.map((row) => ({ id: row.id, ...row.data() })).filter((row) => String(row.data().email || '').startsWith(prefix));
}

function chooseOpenProduct(settings, products, orders) {
  const totals = {};
  for (const order of orders) {
    totals[order.product] = (totals[order.product] || 0) + Number(order.qty || 0);
  }

  const product = products
    .map((p) => {
      const totalVials = totals[p.name] || 0;
      const boxes = Math.floor(totalVials / SLOTS_PER_BATCH);
      const limitReached = Number(p.maxBoxes || 0) > 0 && boxes >= Number(p.maxBoxes || 0);
      const isClosed = Boolean(p.locked) || Boolean(settings.paymentsOpen) || limitReached;
      return { ...p, isClosed };
    })
    .filter((p) => !p.isClosed && Number(p.pricePerVialUSD || 0) > 0)
    .sort((a, b) => a.name.localeCompare(b.name))[0];

  if (!product) throw new Error('No open product found for live smoke test.');
  return product;
}

async function maybeUnlockShop(page, code) {
  const input = page.getByPlaceholder('Paste the batch code here');
  if (await input.count()) {
    if (!code) throw new Error('Shop access gate is enabled but no code is configured.');
    await input.fill(code);
    await page.getByRole('button', { name: /enter shop/i }).click();
    await poll('shop gate unlock', async () => !(await input.isVisible()), { timeoutMs: 10000 });
  }
}

async function loginAdmin(context, adminPass) {
  const page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.setViewportSize({ width: 1600, height: 1200 });
  await sleep(1000);
  await page.getByTitle('Admin Access').click();
  const attempts = Array.from(new Set([adminPass, 'admin123'].filter(Boolean)));
  for (const attempt of attempts) {
    const input = page.getByPlaceholder('Password');
    await input.fill('');
    await input.fill(attempt);
    await page.getByRole('button', { name: /enter dashboard/i }).click();
    await sleep(1500);
    if (!(await page.getByPlaceholder('Password').count())) {
      return page;
    }
  }
  throw new Error('Admin login failed.');
}

async function clickSidebar(page, label) {
  await page.getByRole('button', { name: new RegExp(label, 'i') }).click();
}

async function toggleCoreSetting(page, label, shouldBeOpen) {
  await clickSidebar(page, 'Core Settings');
  const toggle = page.locator(`xpath=//p[normalize-space()='${label}']/ancestor::div[contains(@class,'rounded-2xl')][1]//button[@type='button']`).first();
  const current = await toggle.getAttribute('aria-pressed');
  const isOpen = current === 'true';
  if (isOpen !== shouldBeOpen) {
    await toggle.click();
  }
}

async function cleanupPrefix(prefix) {
  const orders = await getOrdersByPrefix(prefix);
  const logs = await getLogsByPrefix(prefix);
  const users = await getUsersByPrefix(prefix);

  for (const row of orders) {
    await deleteDoc(doc(db, 'orders', row.id));
  }
  for (const row of logs) {
    await deleteDoc(doc(db, 'logs', row.id));
  }
  for (const row of users) {
    if (row.proofUrl) {
      try {
        await deleteObject(refFromURL(storage, row.proofUrl));
      } catch {}
    }
    await deleteDoc(doc(db, 'users', row.id));
  }
}

async function main() {
  await ensureSignedIn();
  const settings = await getSettings();
  const product = chooseOpenProduct(settings, await getAllProducts(), await getAllOrders());
  const email = `${PREFIX}.1@example.com`;
  const customer = {
    email,
    name: 'Codex Regression 1',
    handle: 'codex_regression_1',
    productName: product.name,
    qty: 3,
    address: {
      street: '101 Aurora Blvd',
      brgy: 'Barangay 1',
      city: 'Quezon City',
      prov: 'Metro Manila',
      zip: '1101',
      contact: '09171234567',
    },
  };

  const startedWithReview = Boolean(settings.reviewStageOpen);
  const startedWithPayments = Boolean(settings.paymentsOpen);
  const adminPass = settings.adminPass || 'admin123';
  const shopAccessCode = String(settings.shopAccessCode || '');
  const courier = Array.isArray(settings.shippingOptions) && settings.shippingOptions.length ? settings.shippingOptions[0] : 'LBC';

  const browser = await chromium.launch({ headless: true });
  const shopContext = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
  const adminContext = await browser.newContext({ viewport: { width: 1600, height: 1200 } });

  let adminPage;
  let shopPage;

  try {
    shopPage = await shopContext.newPage();
    await shopPage.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await maybeUnlockShop(shopPage, shopAccessCode);

    const cartShell = shopPage.locator('aside > div').first();
    const cartClassBefore = await cartShell.getAttribute('class');
    await shopPage.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
    await sleep(1000);
    const cartClassAfter = await cartShell.getAttribute('class');

    await shopPage.getByPlaceholder('Enter email to lookup profile...').fill(customer.email);
    await shopPage.getByPlaceholder('Type your email again...').fill(customer.email);
    await shopPage.getByPlaceholder('Full name').fill(customer.name);
    await shopPage.getByPlaceholder('@username').fill(customer.handle);

    const qtyInput = shopPage.locator(`[data-name="${customer.productName.replace(/"/g, '\\"')}"] input[type="number"]`).first();
    await qtyInput.scrollIntoViewIfNeeded();
    await qtyInput.fill(String(customer.qty));
    await shopPage.getByRole('button', { name: /save order/i }).first().click();

    const unicornVisible = await poll('celebration unicorn', async () => {
      const text = await shopPage.locator('.unicorn-emoji').textContent().catch(() => '');
      return text && text.includes('🦄') ? text : '';
    }, { timeoutMs: 5000, intervalMs: 250 });

    await poll('saved order', async () => {
      const orders = await getOrdersForEmail(customer.email);
      const logs = await getLogsForEmail(customer.email);
      return orders.length > 0 && logs.some((row) => row.action === 'Placed Order');
    }, { timeoutMs: 30000, intervalMs: 750 });

    adminPage = await loginAdmin(adminContext, adminPass);

    await toggleCoreSetting(adminPage, 'Review Stage', true);
    await poll('review stage open', async () => Boolean((await getSettings()).reviewStageOpen), { timeoutMs: 30000, intervalMs: 1000 });
    await toggleCoreSetting(adminPage, 'Review Stage', false);
    await poll('review stage closed', async () => !Boolean((await getSettings()).reviewStageOpen), { timeoutMs: 30000, intervalMs: 1000 });

    await toggleCoreSetting(adminPage, 'Payment Window', true);
    await poll('payment window open', async () => Boolean((await getSettings()).paymentsOpen), { timeoutMs: 30000, intervalMs: 1000 });

    await shopPage.close();
    shopPage = await shopContext.newPage();
    await shopPage.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await maybeUnlockShop(shopPage, shopAccessCode);
    await shopPage.getByPlaceholder('Enter email to lookup profile...').fill(customer.email);
    await shopPage.getByPlaceholder('Type your email again...').fill(customer.email);
    await shopPage.getByRole('button', { name: /^pay now$/i }).first().click();
    const selects = shopPage.locator('select');
    await selects.nth(0).selectOption({ label: courier });
    await selects.nth(1).selectOption('ship-ready');
    await shopPage.getByPlaceholder('Street / Lot / Bldg *').fill(customer.address.street);
    await shopPage.getByPlaceholder('Barangay *').fill(customer.address.brgy);
    await shopPage.getByPlaceholder('City *').fill(customer.address.city);
    await shopPage.getByPlaceholder('Province *').fill(customer.address.prov);
    await shopPage.getByPlaceholder('Zip Code *').fill(customer.address.zip);
    await shopPage.getByPlaceholder('Contact # *').fill(customer.address.contact);
    await shopPage.locator('input[type="file"]').setInputFiles(PROOF_PATH);
    await shopPage.getByRole('button', { name: /complete payment/i }).click();

    await poll('submitted payment', async () => {
      const userSnap = await getDoc(doc(db, 'users', customer.email));
      const user = userSnap.exists() ? userSnap.data() : null;
      const logs = await getLogsForEmail(customer.email);
      return Boolean(user?.isPaid && user?.proofUrl && logs.some((row) => row.action === 'Submitted Payment'));
    }, { timeoutMs: 45000, intervalMs: 1000 });

    await clickSidebar(adminPage, 'Payments');
    const search = adminPage.getByPlaceholder('Global Search (Ctrl+F equivalent)...');
    await search.fill(PREFIX);
    await poll('payment row visible in admin', async () => (await adminPage.locator('table tbody tr').count()) >= 1, { timeoutMs: 20000, intervalMs: 1000 });

    const summary = {
      prefix: PREFIX,
      baseUrl: BASE_URL,
      cartClassBefore,
      cartClassAfter,
      cartExpandedOnScroll: cartClassBefore !== cartClassAfter,
      unicornVisible,
      orders: (await getOrdersForEmail(customer.email)).length,
      users: (await getUsersByPrefix(PREFIX)).length,
      logs: (await getLogsForEmail(customer.email)).length,
      paymentsOpenFinal: Boolean((await getSettings()).paymentsOpen),
      reviewStageFinal: Boolean((await getSettings()).reviewStageOpen),
    };

    fs.writeFileSync(`.live-regression-${PREFIX}.json`, JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    try {
      if (adminPage) {
        await toggleCoreSetting(adminPage, 'Payment Window', startedWithPayments);
        await poll('payment window restored', async () => Boolean((await getSettings()).paymentsOpen) === startedWithPayments, { timeoutMs: 30000, intervalMs: 1000 });
        await toggleCoreSetting(adminPage, 'Review Stage', startedWithReview);
        await poll('review stage restored', async () => Boolean((await getSettings()).reviewStageOpen) === startedWithReview, { timeoutMs: 30000, intervalMs: 1000 });
      }
    } catch (error) {
      log(`Warning restoring store modes: ${error.message}`);
    }

    try {
      await cleanupPrefix(PREFIX);
    } catch (error) {
      log(`Warning cleaning test data: ${error.message}`);
    }

    await shopContext.close().catch(() => {});
    await adminContext.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
