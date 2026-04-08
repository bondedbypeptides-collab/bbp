import { chromium } from 'playwright';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, getFirestore } from 'firebase/firestore';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..');

const firebaseConfig = {
  apiKey: 'AIzaSyBtqinodXxcYU4U5F-LoImCOj681KlZ9w4',
  authDomain: 'bonded-by-peptides.firebaseapp.com',
  projectId: 'bonded-by-peptides',
  storageBucket: 'bonded-by-peptides.firebasestorage.app',
  messagingSenderId: '840550043632',
  appId: '1:840550043632:web:d935ae58a19ed96893d735',
  measurementId: 'G-6NMJD9WTS6',
};

const BASE_URL = process.env.BBP_BASE_URL || 'http://localhost:5174/';
const CUSTOMER_COUNT = Number(process.env.BBP_CUSTOMER_COUNT || 100);
const TEST_PREFIX = process.env.BBP_TEST_PREFIX || `codex.live100.${Date.now()}`;
const PROOF_PATH = process.env.BBP_PROOF_PATH || path.join(workspaceRoot, 'tmp-proof.png');
const SLOTS_PER_BATCH = 10;
const SKIP_ORDER_SAVE = process.env.BBP_SKIP_ORDER_SAVE === '1';
const SKIP_ADMIN_PAYMENT_OPEN = process.env.BBP_SKIP_ADMIN_PAYMENT_OPEN === '1';
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

async function getUsersByPrefix(prefix) {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .filter((user) => String(user.id || '').startsWith(prefix));
}

async function getLogsByPrefix(prefix) {
  const snap = await getDocs(collection(db, 'logs'));
  return snap.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .filter((logRow) => String(logRow.email || '').startsWith(prefix));
}

async function getOrdersByPrefix(prefix) {
  const snap = await getDocs(collection(db, 'orders'));
  return snap.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .filter((order) => String(order.email || '').startsWith(prefix));
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
    .filter((logRow) => String(logRow.email || '') === email);
}

async function getUser(email) {
  const snap = await getDoc(doc(db, 'users', email));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

function buildOpenProductPlan(settings, products, orders) {
  const totalsByProduct = {};
  for (const order of orders) {
    const productName = String(order.product || '');
    totalsByProduct[productName] = (totalsByProduct[productName] || 0) + Number(order.qty || 0);
  }

  const openProducts = products
    .map((product) => {
      const totalVials = totalsByProduct[product.name] || 0;
      const boxes = Math.floor(totalVials / SLOTS_PER_BATCH);
      const limitReached = Number(product.maxBoxes || 0) > 0 && boxes >= Number(product.maxBoxes || 0);
      const isClosed = Boolean(product.locked) || Boolean(settings.paymentsOpen) || limitReached;
      const remainingCapacity = Number(product.maxBoxes || 0) > 0
        ? Math.max(0, (Number(product.maxBoxes || 0) * SLOTS_PER_BATCH) - totalVials)
        : Number.POSITIVE_INFINITY;

      return {
        ...product,
        totalVials,
        boxes,
        isClosed,
        remainingCapacity,
        uncapped: Number(product.maxBoxes || 0) === 0,
      };
    })
    .filter((product) => !product.isClosed && Number(product.pricePerVialUSD || 0) > 0)
    .sort((left, right) => {
      if (Number(right.uncapped) !== Number(left.uncapped)) return Number(right.uncapped) - Number(left.uncapped);
      return left.name.localeCompare(right.name);
    });

  if (openProducts.length === 0) {
    throw new Error('No open products are available for the live test batch.');
  }

  const preferred = openProducts.filter((product) => product.uncapped).slice(0, 6);
  return preferred.length > 0 ? preferred : openProducts.slice(0, 6);
}

function buildCustomer(index, product) {
  const n = index + 1;
  const email = `${TEST_PREFIX}.${n}@example.com`;
  return {
    index: n,
    email,
    name: `Codex Live ${n}`,
    handle: `codex_live_${n}`,
    productName: product.name,
    qty: 3,
    address: {
      street: `${100 + n} Aurora Blvd`,
      brgy: `Barangay ${((n - 1) % 20) + 1}`,
      city: 'Quezon City',
      prov: 'Metro Manila',
      zip: `${1100 + (n % 50)}`,
      contact: `0917${String(1000000 + n).slice(-7)}`,
    },
  };
}

function buildPlaceholderCustomer(index) {
  const n = index + 1;
  const email = `${TEST_PREFIX}.${n}@example.com`;
  return {
    index: n,
    email,
    name: `Codex Live ${n}`,
    handle: `codex_live_${n}`,
    productName: '',
    qty: 3,
    address: {
      street: `${100 + n} Aurora Blvd`,
      brgy: `Barangay ${((n - 1) % 20) + 1}`,
      city: 'Quezon City',
      prov: 'Metro Manila',
      zip: `${1100 + (n % 50)}`,
      contact: `0917${String(1000000 + n).slice(-7)}`,
    },
  };
}

async function openShopPage(context, shopAccessCode) {
  log('Opening shop page');
  const page = await context.newPage();
  log('Shop page created');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  log('Shop page domcontentloaded');
  await sleep(600);
  log('Shop page ready wait complete');

  const accessInput = page.getByPlaceholder('Paste the batch code here');
  if (await accessInput.count()) {
    if (!shopAccessCode) {
      throw new Error('Shop access gate is enabled, but no batch code was found in settings.');
    }
    await accessInput.fill(shopAccessCode);
    await page.getByRole('button', { name: /enter shop/i }).click();
    await poll('shop access accepted', async () => !(await accessInput.isVisible()), { timeoutMs: 10000 });
  }

  return page;
}

function getShopEmailInputs(page) {
  return {
    emailInput: page.locator('#top-form-card input[type="email"]').nth(0),
    emailConfirmInput: page.locator('#top-form-card input[type="email"]').nth(1),
  };
}

async function saveOrder(shopContext, customer, shopAccessCode) {
  const page = await openShopPage(shopContext, shopAccessCode);
  log(`Saving order ${customer.index}/${CUSTOMER_COUNT} for ${customer.email} using ${customer.productName}`);

  const { emailInput, emailConfirmInput } = getShopEmailInputs(page);
  await emailInput.fill(customer.email);
  await emailConfirmInput.fill(customer.email);
  await page.getByPlaceholder('Full name').fill(customer.name);
  await page.getByPlaceholder('@username').fill(customer.handle);

  await fillProductQty(page, customer.productName, customer.qty);
  log(`Filled product quantity for ${customer.email}`);

  const saveButton = page.getByRole('button', { name: /save order/i }).first();
  await saveButton.click();
  log(`Clicked Save Order for ${customer.email}`);

  await poll(
    `saved order for ${customer.email}`,
    async () => {
      const orders = await getOrdersForEmail(customer.email);
      const logs = await getLogsForEmail(customer.email);
      return orders.length > 0 && logs.some((row) => row.action === 'Placed Order');
    },
    { timeoutMs: 30000, intervalMs: 750 },
  );

  await page.close();
}

async function expectValue(locator, value) {
  await poll(
    `input value ${value}`,
    async () => (await locator.inputValue()) === value,
    { timeoutMs: 5000, intervalMs: 200 },
  );
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

async function loginAdmin(adminContext, adminPassword) {
  const page = await adminContext.newPage();
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await sleep(5000);
  await page.getByTitle('Admin Access').click();
  await sleep(1000);
  const attempts = Array.from(new Set([adminPassword, 'admin123'].filter(Boolean)));
  let lastError = 'Unknown admin login failure';

  for (const attempt of attempts) {
    log(`Trying admin login with ${attempt === adminPassword ? 'settings password' : 'fallback password'}`);
    const passwordInput = page.getByPlaceholder('Password');
    await passwordInput.fill('');
    await passwordInput.fill(attempt);
    await page.getByRole('button', { name: /enter dashboard/i }).click();
    await sleep(2500);

    const loginError = page.getByText('Incorrect password. Access denied.');
    const passwordCount = await page.getByPlaceholder('Password').count();
    const hasLoginError = (await loginError.count()) > 0;
    const dashboardReady = passwordCount === 0 && !hasLoginError;

    if (hasLoginError) {
      lastError = 'Incorrect password. Access denied.';
    }

    if (dashboardReady) {
      return page;
    }
  }

  throw new Error(`Could not log into admin. Last error: ${lastError}`);
  return page;
}

async function clickSidebar(adminPage, label) {
  await adminPage.getByRole('button', { name: new RegExp(label, 'i') }).click();
}

async function setAdminSearch(adminPage, prefix) {
  const search = adminPage.getByPlaceholder('Global Search (Ctrl+F equivalent)...');
  await search.fill(prefix);
  await search.press('Tab');
}

async function verifyActiveOrdersInAdmin(adminPage, prefix, expectedCount) {
  await clickSidebar(adminPage, 'Active Orders');
  await setAdminSearch(adminPage, prefix);
  await poll(
    'active order rows in admin',
    async () => {
      const count = await adminPage.locator('table tbody tr').count();
      return count >= expectedCount ? count : 0;
    },
    { timeoutMs: 30000, intervalMs: 1000 },
  );
}

async function reshuffleAdminsIfAvailable(adminPage, prefix) {
  await clickSidebar(adminPage, 'Payments');
  await setAdminSearch(adminPage, prefix);
  const reshuffleButton = adminPage.getByRole('button', { name: /reshuffle admins/i });
  if (await reshuffleButton.count()) {
    await reshuffleButton.click();
    await sleep(2000);
  }
}

async function togglePaymentWindow(adminPage, shouldBeOpen) {
  await clickSidebar(adminPage, 'Core Settings');
  const toggle = adminPage.locator("xpath=//p[normalize-space()='Payment Window']/ancestor::div[contains(@class,'rounded-2xl')][1]//button[@type='button']").first();
  const current = await toggle.getAttribute('aria-pressed');
  const isOpen = current === 'true';
  if (isOpen !== shouldBeOpen) {
    await toggle.click();
  }

  await poll(
    `payment window ${shouldBeOpen ? 'open' : 'closed'}`,
    async () => {
      const settings = await getSettings();
      return Boolean(settings.paymentsOpen) === shouldBeOpen;
    },
    { timeoutMs: 60000, intervalMs: 1000 },
  );
}

async function submitPayment(shopContext, customer, shopAccessCode, shippingOptions) {
  const page = await openShopPage(shopContext, shopAccessCode);
  log(`Submitting payment ${customer.index}/${CUSTOMER_COUNT} for ${customer.email}`);

  const { emailInput, emailConfirmInput } = getShopEmailInputs(page);
  await emailInput.fill(customer.email);
  await emailConfirmInput.fill(customer.email);
  await emailConfirmInput.press('Tab');

  const payButton = page.getByRole('button', { name: /^pay now$/i }).first();
  await poll('Pay Now enabled', async () => await payButton.isEnabled(), { timeoutMs: 20000, intervalMs: 500 });
  await payButton.click();

  const shippingSelects = page.locator('select');
  await shippingSelects.nth(0).selectOption({ label: shippingOptions[(customer.index - 1) % shippingOptions.length] || shippingOptions[0] || 'LBC' });
  await shippingSelects.nth(1).selectOption('ship-ready');
  await page.getByPlaceholder('Street / Lot / Bldg *').fill(customer.address.street);
  await page.getByPlaceholder('Barangay *').fill(customer.address.brgy);
  await page.getByPlaceholder('City *').fill(customer.address.city);
  await page.getByPlaceholder('Province *').fill(customer.address.prov);
  await page.getByPlaceholder('Zip Code *').fill(customer.address.zip);
  await page.getByPlaceholder('Contact # *').fill(customer.address.contact);
  await page.locator('input[type="file"]').setInputFiles(PROOF_PATH);
  await page.getByRole('button', { name: /complete payment/i }).click();

  await poll(
    `payment submitted for ${customer.email}`,
    async () => {
      const user = await getUser(customer.email);
      const logs = await getLogsForEmail(customer.email);
      return Boolean(
        user?.isPaid &&
        user?.proofUrl &&
        user?.address?.street &&
        logs.some((row) => row.action === 'Submitted Payment'),
      );
    },
    { timeoutMs: 45000, intervalMs: 1000 },
  );

  await page.close();
}

async function verifyPaymentsInAdmin(adminPage, prefix, expectedCount) {
  await clickSidebar(adminPage, 'Payments');
  await setAdminSearch(adminPage, prefix);
  await poll(
    'payment rows in admin',
    async () => {
      const count = await adminPage.locator('table tbody tr').count();
      return count >= expectedCount ? count : 0;
    },
    { timeoutMs: 30000, intervalMs: 1000 },
  );
}

async function verifyLogsInAdmin(adminPage, prefix) {
  await clickSidebar(adminPage, 'Activity Logs');
  await setAdminSearch(adminPage, prefix);
  await poll(
    'activity log rows in admin',
    async () => {
      const count = await adminPage.locator('table tbody tr').count();
      return count >= 1 ? count : 0;
    },
    { timeoutMs: 30000, intervalMs: 1000 },
  );
}

async function main() {
  await ensureSignedIn();

  const settings = await getSettings();
  const products = await getAllProducts();
  const orders = await getAllOrders();
  const openPlan = SKIP_ORDER_SAVE ? [] : buildOpenProductPlan(settings, products, orders);
  const customers = SKIP_ORDER_SAVE
    ? Array.from({ length: CUSTOMER_COUNT }, (_, index) => buildPlaceholderCustomer(index))
    : Array.from({ length: CUSTOMER_COUNT }, (_, index) => buildCustomer(index, openPlan[index % openPlan.length]));

  log(`Starting live batch test with prefix ${TEST_PREFIX}`);
  if (openPlan.length > 0) {
    log(`Using ${openPlan.length} open product(s): ${openPlan.map((product) => product.name).join(', ')}`);
  }

  const executablePath = BROWSER_CANDIDATES.find((candidate) => fs.existsSync(candidate));
  log(`Launching browser${executablePath ? ` via ${executablePath}` : ''}`);
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });
  log('Browser launched');
  const shopContext = await browser.newContext();
  const adminContext = await browser.newContext();
  log('Browser contexts created');

  const startedWithPaymentsOpen = Boolean(settings.paymentsOpen);
  const adminPassword = settings.adminPass || 'admin123';
  const shopAccessCode = String(settings.shopAccessCode || '');
  const shippingOptions = Array.isArray(settings.shippingOptions) && settings.shippingOptions.length > 0
    ? settings.shippingOptions
    : ['LBC', 'J&T', 'Lalamove', 'Pickup'];
  log(`Settings admin password seen by runner: ${adminPassword}`);

  let adminPage = null;

  try {
    if (!SKIP_ORDER_SAVE) {
      for (const customer of customers) {
        await saveOrder(shopContext, customer, shopAccessCode);
        if (customer.index % 10 === 0) {
          log(`Saved ${customer.index}/${CUSTOMER_COUNT} orders`);
        }
      }
    } else {
      log('Skipping order-save phase and reusing existing saved orders.');
    }

    adminPage = await loginAdmin(adminContext, adminPassword);
    await verifyActiveOrdersInAdmin(adminPage, TEST_PREFIX, Math.min(CUSTOMER_COUNT, 1));
    await reshuffleAdminsIfAvailable(adminPage, TEST_PREFIX);
    if (!SKIP_ADMIN_PAYMENT_OPEN) {
      await togglePaymentWindow(adminPage, true);
    } else {
      log('Skipping admin payment-window toggle because it is already open.');
    }

    for (const customer of customers) {
      await submitPayment(shopContext, customer, shopAccessCode, shippingOptions);
      if (customer.index % 10 === 0) {
        log(`Submitted ${customer.index}/${CUSTOMER_COUNT} payments`);
      }
    }

    await verifyPaymentsInAdmin(adminPage, TEST_PREFIX, CUSTOMER_COUNT);
    await verifyLogsInAdmin(adminPage, TEST_PREFIX);

    const prefixUsers = await getUsersByPrefix(TEST_PREFIX);
    const prefixOrders = await getOrdersByPrefix(TEST_PREFIX);
    const prefixLogs = await getLogsByPrefix(TEST_PREFIX);
    const paidUsers = prefixUsers.filter((user) => user.isPaid && user.proofUrl);
    const placedLogs = prefixLogs.filter((row) => row.action === 'Placed Order');
    const paymentLogs = prefixLogs.filter((row) => row.action === 'Submitted Payment');

    log(`Verification summary for ${TEST_PREFIX}`);
    log(`Orders: ${prefixOrders.length}`);
    log(`Users: ${prefixUsers.length}`);
    log(`Paid with proof: ${paidUsers.length}`);
    log(`Placed Order logs: ${placedLogs.length}`);
    log(`Submitted Payment logs: ${paymentLogs.length}`);

    const report = {
      baseUrl: BASE_URL,
      prefix: TEST_PREFIX,
      customerCount: CUSTOMER_COUNT,
      startedAt: new Date().toISOString(),
      productsUsed: openPlan.map((product) => product.name),
      counts: {
        orders: prefixOrders.length,
        users: prefixUsers.length,
        paidWithProof: paidUsers.length,
        placedOrderLogs: placedLogs.length,
        paymentLogs: paymentLogs.length,
      },
      paymentsOpenAfterRun: Boolean((await getSettings()).paymentsOpen),
      sampleEmails: customers.slice(0, 5).map((customer) => customer.email),
    };

    const reportPath = path.join(workspaceRoot, `.live-batch-report-${TEST_PREFIX}.json`);
    await import('node:fs/promises').then((fs) => fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8'));
    log(`Report written to ${reportPath}`);
  } finally {
    try {
      if (adminPage) {
        await togglePaymentWindow(adminPage, startedWithPaymentsOpen);
      } else {
        const latestSettings = await getSettings();
        if (Boolean(latestSettings.paymentsOpen) !== startedWithPaymentsOpen) {
          log(`Warning: payment window state changed to ${latestSettings.paymentsOpen}.`);
        }
      }
    } catch (error) {
      log(`Warning: could not restore payment window state automatically: ${error.message}`);
    }

    await adminContext.close().catch(() => {});
    await shopContext.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
