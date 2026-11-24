/**
 * End-to-end journeys for Pain Tracker (Playwright library + axe-core).
 * Usage: npm run build && npm run preview  (in another terminal), then npm run test:e2e
 * Env: BASE_URL (default http://localhost:4173), PLAYWRIGHT_PATH to override module resolution.
 */
import { createRequire } from "module";
import fs from "fs";
import path from "path";

const require = createRequire(import.meta.url);
const { chromium, devices } = require(process.env.PLAYWRIGHT_PATH ?? "playwright");
const axeSource = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const BASE = process.env.BASE_URL ?? "http://localhost:4173";
const OUT = path.resolve("e2e/output");
fs.mkdirSync(OUT, { recursive: true });

const results = [];
async function step(device, name, fn) {
  const t0 = Date.now();
  try { const note = await fn(); results.push({ device, name, ok: true, ms: Date.now() - t0, note }); console.log(`  ✓ [${device}] ${name}${note ? ` — ${note}` : ""}`); }
  catch (e) { results.push({ device, name, ok: false, ms: Date.now() - t0, note: String(e.message).split("\n")[0] }); console.log(`  ✗ [${device}] ${name}: ${e.message.split("\n")[0]}`); }
}
const assert = (c, m) => { if (!c) throw new Error(m); };

async function axe(page, label) {
  await page.addScriptTag({ content: axeSource });
  const r = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] })).violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes[0]?.target?.join(" ") })));
  return { label, violations: r };
}

async function onboard(page) {
  await page.goto(BASE + "/");
  await page.getByRole("button", { name: "Get Started" }).click();
  for (const l of ["I understand this is a demo", "I agree that my entries", "I understand Pain Tracker does not"]) await page.getByText(l).click();
  await page.getByRole("button", { name: "Agree and continue" }).click();
  await page.waitForURL(BASE + "/");
}

async function run(deviceName, ctxOpts) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...ctxOpts, acceptDownloads: true });
  ctx.setDefaultTimeout(Number(process.env.STEP_TIMEOUT ?? 10000));
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const shot = (n) => page.screenshot({ path: `${OUT}/${deviceName}-${n}.png` });
  const a11y = [];
  const isMobile = (ctxOpts.viewport?.width ?? 1000) < 1024;

  await step(deviceName, "0. Privacy & consent gate blocks until required statements are accepted", async () => {
    await page.goto(BASE + "/");
    await page.getByRole("button", { name: "Get Started" }).click();
    a11y.push(await axe(page, "consent"));
    await page.getByRole("button", { name: "Agree and continue" }).click();
    await page.getByRole("alert").filter({ hasText: "confirm the three statements" }).waitFor();
    await page.goto(BASE + "/");
    await onboard(page);
  });

  await step(deviceName, "1. Open the app and review today's dashboard", async () => {
    await page.getByRole("heading", { name: /Good (morning|afternoon|evening), Sarah/ }).waitFor();
    for (const h of ["Today's pain", "This week", "Medications today", "Recent entries", "Upcoming appointments", "Exercise activity"]) await page.getByRole("heading", { name: h, exact: true }).waitFor();
    const btn = page.getByRole("link", { name: "Log pain with details" });
    const box = await btn.boundingBox();
    const vh = page.viewportSize().height;
    assert(box && box.y + box.height <= vh - (isMobile ? 64 : 0), `Log Pain button below the fold (bottom ${box?.y + box?.height} of ${vh})`);
    await shot("01-home");
    a11y.push(await axe(page, "home"));
    return `Log Pain action bottom at ${Math.round(box.y + box.height)}px of ${vh}px viewport`;
  });

  await step(deviceName, "2a. One-tap pain log from Home (with undo available)", async () => {
    const before = await page.evaluate(() => JSON.parse(localStorage.getItem("pain-tracker:v1:data:demo-patient")).pain.length);
    const t0 = Date.now();
    await page.getByRole("radio", { name: /^3,/ }).first().click();
    await page.getByText(/Pain 3 logged at/).waitFor();
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem("pain-tracker:v1:data:demo-patient")).pain.length);
    assert(after === before + 1, "entry not persisted");
    return `saved in ${Date.now() - t0} ms, 1 tap`;
  });

  let detailedMs = 0;
  await step(deviceName, "2b. Record pain with location + details in under 30 seconds", async () => {
    const t0 = Date.now();
    await page.getByRole("link", { name: isMobile ? "Add pain log" : "Log pain", exact: true }).first().click();
    await page.getByRole("radio", { name: /^6,/ }).click();
    await page.getByRole("radio", { name: "Back" }).click();
    await page.getByRole("checkbox", { name: "Lower back" }).click();
    await page.getByText("Pain characteristics", { exact: true }).click();
    await page.getByRole("button", { name: "Burning", exact: true }).click();
    await page.getByText("Sleep impact", { exact: true }).click();
    await page.getByRole("group", { name: /affect your sleep/ }).getByRole("button", { name: "Moderate" }).click();
    await shot("02-log");
    await page.getByRole("button", { name: "Save log" }).click();
    await page.waitForURL(BASE + "/");
    detailedMs = Date.now() - t0;
    assert(detailedMs < 30_000, `took ${detailedMs} ms`);
    const latest = await page.evaluate(() => JSON.parse(localStorage.getItem("pain-tracker:v1:data:demo-patient")).pain.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]);
    assert(latest.intensity === 6 && latest.locations.includes("lower-back") && latest.characteristics.includes("Burning") && latest.sleepImpact === "Moderate", "saved values wrong");
    return `${(detailedMs / 1000).toFixed(1)} s automated (6 interactions)`;
  });

  await step(deviceName, "2c. Save is blocked without intensity; unsaved-close dialog offers Save Draft", async () => {
    await page.goto(BASE + "/log");
    await page.getByRole("button", { name: "Save log" }).click();
    await page.getByText(/only thing needed to save/).waitFor();
    await page.getByRole("checkbox", { name: "Chest" }).click();
    await page.getByRole("button", { name: "Close" }).first().click();
    await page.getByRole("heading", { name: "Save before closing?" }).waitFor();
    await shot("02c-save-dialog");
    await page.getByText("Save Draft", { exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL(BASE + "/");
    await page.goto(BASE + "/log");
    await page.getByRole("button", { name: "Resume draft" }).click();
    assert(await page.getByRole("checkbox", { name: "Chest" }).getAttribute("aria-checked") === "true", "draft not restored");
    await page.getByRole("radio", { name: /^2,/ }).click();
    await page.getByRole("button", { name: "Save log" }).click();
    await page.waitForURL(BASE + "/");
  });

  await step(deviceName, "3. Edit a pain entry, then delete one and undo", async () => {
    await page.goto(BASE + "/history");
    await page.locator('a[href^="/log/"]').first().click();
    await page.getByRole("heading", { name: "Edit pain entry" }).waitFor();
    await page.getByRole("radio", { name: /^8,/ }).click();
    await page.getByText("Notes", { exact: true }).click();
    await page.getByRole("textbox", { name: /Notes/ }).fill("Edited in e2e test");
    await page.getByRole("button", { name: "Save changes" }).click();
    await page.waitForURL(BASE + "/history");
    const edited = await page.evaluate(() => JSON.parse(localStorage.getItem("pain-tracker:v1:data:demo-patient")).pain.find((p) => p.notes === "Edited in e2e test"));
    assert(edited?.intensity === 8, "edit not saved");
    const n = await page.evaluate(() => JSON.parse(localStorage.getItem("pain-tracker:v1:data:demo-patient")).pain.length);
    await page.goto(BASE + `/log/${edited.id}`);
    await page.getByRole("button", { name: "Delete entry" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await page.waitForURL(BASE + "/history");
    assert((await page.evaluate(() => JSON.parse(localStorage.getItem("pain-tracker:v1:data:demo-patient")).pain.length)) === n - 1, "not deleted");
    await page.getByRole("button", { name: "Undo" }).click();
    await page.waitForTimeout(200);
    assert((await page.evaluate(() => JSON.parse(localStorage.getItem("pain-tracker:v1:data:demo-patient")).pain.length)) === n, "undo failed");
  });

  await step(deviceName, "4. Add a medication (with reminder) and record a dose", async () => {
    await page.goto(BASE + "/medications");
    await page.getByRole("button", { name: "Add" }).first().click();
    await page.getByRole("textbox", { name: "Medication name" }).fill("Acetaminophen");
    await page.getByRole("textbox", { name: "Prescribed dosage" }).fill("500 mg tablet");
    await page.getByRole("button", { name: "Every 12 hours" }).click();
    await shot("04-add-med");
    await page.getByRole("button", { name: "Add medication" }).click();
    await page.getByText("Acetaminophen added with a reminder").waitFor();
    const d = await page.evaluate(() => JSON.parse(localStorage.getItem("pain-tracker:v1:data:demo-patient")));
    const med = d.medications.find((m) => m.name === "Acetaminophen");
    assert(med && med.times.join() === "08:00,20:00", "med not saved");
    assert(d.reminders.some((r) => r.linkedId === med.id), "reminder not created");
    const btn = page.getByRole("button", { name: /^Mark .* as taken$/ }).first();
    if (await btn.count()) { await btn.click(); await page.waitForTimeout(150); }
    a11y.push(await axe(page, "medications"));
  });

  await step(deviceName, "5. Record a therapeutic injection", async () => {
    await page.goto(BASE + "/treatments");
    await page.getByRole("button", { name: "Add" }).first().click();
    await page.getByRole("combobox", { name: "Injection type" }).selectOption("Facet joint injection");
    await page.getByRole("textbox", { name: "Body location" }).fill("Lower back, L5–S1");
    await page.getByRole("textbox", { name: "Provider" }).fill("Dr. Test (fictional)");
    await page.getByRole("combobox", { name: /Pain before/ }).selectOption("7");
    await page.getByRole("combobox", { name: /Pain after/ }).selectOption("3");
    await page.getByRole("button", { name: "Very effective" }).click();
    await page.getByRole("button", { name: "Record injection" }).click();
    await page.getByText("Facet joint injection").first().waitFor();
    await page.getByText("Pain 7 → 3").waitFor();
  });

  await step(deviceName, "6. Log an exercise session", async () => {
    await page.goto(BASE + "/exercise?new=1");
    await page.getByRole("combobox", { name: "Exercise type" }).selectOption("Aquatic therapy");
    await page.getByRole("spinbutton", { name: "Duration (minutes)" }).fill("40");
    await page.getByRole("combobox", { name: /Pain before/ }).selectOption("5");
    await page.getByRole("combobox", { name: /Pain after/ }).selectOption("4");
    await page.getByRole("button", { name: "Moderate" }).click();
    await page.getByRole("button", { name: "Log exercise" }).click();
    await page.getByText("Aquatic therapy · 40 min").first().waitFor();
  });

  await step(deviceName, "6b. Log a meal", async () => {
    await page.goto(BASE + "/meals?new=1");
    await page.getByRole("textbox", { name: "What did you eat?" }).fill("Vegetable soup");
    await page.getByRole("button", { name: "Increase Water (glasses)" }).click();
    await page.getByRole("button", { name: "Log meal" }).click();
    await page.getByText(/Vegetable soup/).first().waitFor();
  });

  await step(deviceName, "7. Review weekly pain insights and switch range filters", async () => {
    await page.goto(BASE + "/insights");
    await page.getByRole("radio", { name: "7 days" }).click();
    await page.getByRole("heading", { name: "This week vs last week" }).waitFor();
    await page.getByText(/Daily average( and peak)? of \d+ logs/).waitFor();
    await shot("07-insights-7d");
    await page.getByRole("radio", { name: "90 days" }).click();
    await page.getByText(/Weekly average( and peak)? of/).waitFor();
    await page.getByText("Show data table").first().click();
    await page.getByRole("table").first().waitFor();
    a11y.push(await axe(page, "insights"));
  });

  await step(deviceName, "8. Configure a reminder (selected days, toggles, preview)", async () => {
    await page.goto(BASE + "/reminders");
    await page.getByRole("button", { name: "Add" }).first().click();
    await page.getByRole("button", { name: "Exercise", exact: true }).click();
    await page.getByRole("textbox", { name: "Title" }).fill("Stretching routine");
    await page.getByLabel("Time 1").fill("07:30");
    await page.getByRole("button", { name: "Selected days" }).click();
    await page.getByRole("button", { name: "Sat" }).click();
    await page.getByRole("switch", { name: "Sound notification" }).click();
    await page.getByLabel("Reminder preview").getByText("Stretching routine").waitFor();
    await shot("08-reminder");
    await page.getByRole("button", { name: "Finish Setup" }).click();
    await page.getByText("Reminder created").waitFor();
    const r = await page.evaluate(() => JSON.parse(localStorage.getItem("pain-tracker:v1:data:demo-patient")).reminders.find((x) => x.title === "Stretching routine"));
    assert(r && r.times[0] === "07:30" && r.days.includes(6) && r.sound === false, "reminder values wrong");
    await page.getByRole("switch", { name: /Stretching routine reminder on/ }).click();
    await page.getByRole("switch", { name: /Stretching routine reminder off/ }).waitFor();
    a11y.push(await axe(page, "reminders"));
  });

  await step(deviceName, "9. Export a patient report (valid PDF)", async () => {
    await page.goto(BASE + "/report");
    await page.getByText("Meals and hydration").click();
    await page.getByRole("textbox", { name: /Questions/ }).fill("Is the drowsiness expected?");
    const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download PDF" }).click()]);
    const p = `${OUT}/${deviceName}-report.pdf`;
    await dl.saveAs(p);
    const buf = fs.readFileSync(p);
    assert(buf.subarray(0, 5).toString() === "%PDF-", "not a PDF");
    a11y.push(await axe(page, "report"));
    return `${dl.suggestedFilename()} · ${(buf.length / 1024).toFixed(0)} KB`;
  });

  await step(deviceName, "Data persistence across reload", async () => {
    await page.reload();
    await page.goto(BASE + "/exercise");
    await page.getByText("Aquatic therapy · 40 min").first().waitFor();
  });

  await step(deviceName, "Offline: reload with network off shows saved data", async () => {
    await page.goto(BASE + "/");
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await ctx.setOffline(true);
    await page.reload();
    await page.getByRole("heading", { name: "Today's pain" }).waitFor();
    await page.getByText(/You're offline/).waitFor();
    await page.goto(BASE + "/insights");
    await page.getByRole("heading", { name: "Pain trend" }).waitFor();
    await ctx.setOffline(false);
  });

  await step(deviceName, "Keyboard: skip link + log pain without a pointer", async () => {
    await page.goto(BASE + "/log");
    await page.getByRole("radio", { name: /^0,/ }).waitFor();
    await page.evaluate(() => (document.activeElement)?.blur());
    await page.keyboard.press("Tab");
    assert(await page.evaluate(() => document.activeElement?.textContent) === "Skip to content", "skip link not first");
    await page.getByRole("radio", { name: /^0,/ }).focus();
    for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");
    assert(await page.getByRole("radio", { name: /^4,/ }).getAttribute("aria-checked") === "true", "arrow keys failed");
    await page.getByRole("checkbox", { name: "Head" }).focus();
    await page.keyboard.press("Space");
    assert(await page.getByRole("checkbox", { name: "Head" }).getAttribute("aria-checked") === "true", "space on body map failed");
    await page.getByRole("button", { name: "Save log" }).focus();
    await page.keyboard.press("Enter");
    await page.waitForURL(BASE + "/");
  });

  await step(deviceName, "Navigation: every nav destination renders without overflow", async () => {
    const routes = ["/", "/insights", "/log", "/settings", "/reminders", "/history", "/medications", "/treatments", "/exercise", "/meals", "/appointments", "/report", "/nope"];
    const bad = [];
    for (const r of routes) {
      await page.goto(BASE + r);
      await page.locator("h1").first().waitFor({ state: "attached" });
      const ow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (ow > 0) bad.push(`${r} +${ow}px`);
    }
    if (isMobile) {
      await page.goto(BASE + "/");
      for (const n of ["Insights", "Settings", "Reminders", "Home"]) { await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: n }).click(); await page.waitForTimeout(100); }
      await page.getByRole("link", { name: "Add pain log" }).click();
      await page.waitForURL(BASE + "/log");
    }
    assert(!bad.length, bad.join(", "));
    a11y.push(await axe(page, "log"));
  });

  await step(deviceName, "Settings: export JSON, then delete all data returns to welcome", async () => {
    await page.goto(BASE + "/settings");
    a11y.push(await axe(page, "settings"));
    const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Export all my data/ }).click()]);
    const json = JSON.parse(fs.readFileSync(await dl.path(), "utf8"));
    assert(json.data.pain.length > 10, "export empty");
    await page.getByRole("button", { name: /Delete all data and consent/ }).click();
    await page.getByRole("button", { name: "Delete everything" }).click();
    await page.getByRole("heading", { name: "Welcome to Bay State Pain Tracker" }).waitFor();
    assert((await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("pain-tracker:v1:data")).length)) === 0, "data remains");
  });

  for (const a of a11y) {
    const serious = a.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    results.push({ device: deviceName, name: `axe WCAG 2.2 AA — ${a.label}`, ok: serious.length === 0, note: a.violations.length ? a.violations.map((v) => `${v.id}(${v.impact}×${v.n}) at ${v.sample}`).join(", ") : "0 violations" });
  }
  if (errors.length) results.push({ device: deviceName, name: "No uncaught page errors", ok: false, note: errors.slice(0, 3).join(" | ") });
  else results.push({ device: deviceName, name: "No uncaught page errors", ok: true });
  await browser.close();
}

const iphone = devices["iPhone 13"];
const pixel = devices["Pixel 7"];
const configs = [
  ["iphone-13", { ...iphone, defaultBrowserType: undefined }],
  ["pixel-7", { ...pixel, defaultBrowserType: undefined }],
  ["ipad", { viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }],
  ["desktop", { viewport: { width: 1440, height: 900 } }],
];
const only = process.env.DEVICES?.split(",");
for (const [name, opts] of configs) {
  if (only && !only.includes(name)) continue;
  console.log(`\n${name}`);
  await run(name, opts);
}
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
