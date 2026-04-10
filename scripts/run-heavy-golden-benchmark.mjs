import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const clientRoot = resolve(repoRoot, "packages", "client");

function parseArgs(argv) {
  const parsed = {
    browserName: "chromium",
    caseId: null,
    cpuThrottleRate: null,
    deviceName: null,
    headed: false,
    mobile: false,
    outputPath: null,
    port: 4173,
    route: "heavy_goldens"
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const nextArg = argv[index + 1] ?? null;

    if (arg === "--case" && nextArg) {
      parsed.caseId = nextArg;
      index += 1;
      continue;
    }

    if (arg === "--mobile") {
      parsed.mobile = true;
      continue;
    }

    if (arg === "--device" && nextArg) {
      parsed.deviceName = nextArg;
      parsed.mobile = true;
      index += 1;
      continue;
    }

    if (arg === "--port" && nextArg) {
      parsed.port = Number(nextArg);
      index += 1;
      continue;
    }

    if (arg === "--output" && nextArg) {
      parsed.outputPath = resolve(repoRoot, nextArg);
      index += 1;
      continue;
    }

    if (arg === "--headed") {
      parsed.headed = true;
      continue;
    }

    if (arg === "--browser" && nextArg) {
      parsed.browserName = nextArg;
      index += 1;
      continue;
    }

    if (arg === "--route" && nextArg) {
      parsed.route = nextArg;
      index += 1;
      continue;
    }

    if (arg === "--cpu-throttle" && nextArg) {
      parsed.cpuThrottleRate = Number(nextArg);
      index += 1;
    }
  }

  if (!Number.isFinite(parsed.port) || parsed.port <= 0) {
    throw new Error(`Invalid port: ${parsed.port}`);
  }

  if (
    parsed.cpuThrottleRate !== null &&
    (!Number.isFinite(parsed.cpuThrottleRate) || parsed.cpuThrottleRate < 1)
  ) {
    throw new Error(`Invalid CPU throttle rate: ${parsed.cpuThrottleRate}`);
  }

  return parsed;
}

function loadPlaywright() {
  const candidates = [
    "playwright",
    "C:/Users/lxtyin/node_modules/playwright"
  ];

  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {}
  }

  throw new Error(
    "Playwright was not found. Install it locally or make sure the known global path is available."
  );
}

function quoteWindowsArg(value) {
  const text = String(value);

  if (!text.length) {
    return "\"\"";
  }

  if (!/[\s"&^|<>]/.test(text)) {
    return text;
  }

  return `"${text
    .replace(/(\\*)"/g, "$1$1\\\"")
    .replace(/(\\+)$/g, "$1$1")}"`;
}

function runCommand(command, args, options = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const spawnCommand =
      process.platform === "win32" ? process.env.ComSpec ?? "cmd.exe" : command;
    const spawnArgs =
      process.platform === "win32"
        ? ["/d", "/s", "/c", [command, ...args].map(quoteWindowsArg).join(" ")]
        : args;
    const child = spawn(spawnCommand, spawnArgs, {
      cwd: repoRoot,
      shell: false,
      stdio: "inherit",
      ...options
    });

    child.on("error", rejectPromise);
    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      rejectPromise(new Error(`${command} ${args.join(" ")} exited with code ${code ?? -1}.`));
    });
  });
}

async function waitForUrl(url, timeoutMs = 60_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return;
      }
    } catch {}

    await new Promise((resolvePromise) => {
      setTimeout(resolvePromise, 500);
    });
  }

  throw new Error(`Timed out waiting for ${url}.`);
}

async function startPreviewServer(port) {
  const vitePackageJson = require.resolve("vite/package.json");
  const viteBin = resolve(dirname(vitePackageJson), "bin", "vite.js");
  const child = spawn(
    process.execPath,
    [viteBin, "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    {
      cwd: clientRoot,
      shell: false,
      stdio: "pipe"
    }
  );

  child.stdout.on("data", (chunk) => {
    process.stdout.write(`[preview] ${chunk}`);
  });
  child.stderr.on("data", (chunk) => {
    process.stderr.write(`[preview] ${chunk}`);
  });

  await waitForUrl(`http://127.0.0.1:${port}/`);

  return child;
}

async function stopPreviewServer(child) {
  if (!child || child.killed) {
    return;
  }

  if (process.platform === "win32" && child.pid) {
    await runCommand("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      cwd: repoRoot,
      stdio: "ignore"
    }).catch(() => {});
    return;
  }

  child.kill("SIGTERM");
}

function buildTargetUrl(args) {
  const url = new URL(`http://127.0.0.1:${args.port}/${args.route}`);

  if (args.caseId) {
    url.searchParams.set("case", args.caseId);
  }

  if (args.mobile) {
    url.searchParams.set("profile", "mobile");
  }

  return url.toString();
}

async function waitForPerfSummary(page, timeoutMs = 10 * 60_000) {
  const startedAt = Date.now();
  let latestPayload = null;

  while (Date.now() - startedAt < timeoutMs) {
    const payloadText = await page.evaluate(() => window.render_perf_to_text?.() ?? null);

    if (payloadText) {
      latestPayload = JSON.parse(payloadText);

      if (
        latestPayload.totalCases > 0 &&
        !latestPayload.running &&
        latestPayload.completedCases >= latestPayload.totalCases
      ) {
        return latestPayload;
      }
    }

    await page.waitForTimeout(500);
  }

  throw new Error(
    `Timed out waiting for benchmark completion. Latest payload: ${JSON.stringify(latestPayload)}`
  );
}

async function ensureBuild() {
  await runCommand("npm.cmd", ["run", "build", "--workspace", "@watcher/shared"]);
  await runCommand("npm.cmd", ["run", "build", "--workspace", "@watcher/client"]);
}

async function writeOutputFile(outputPath, payload) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(payload, null, 2), "utf8");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const playwright = loadPlaywright();
  const targetUrl = buildTargetUrl(args);
  const consoleEntries = [];
  let previewServer = null;
  let browser = null;

  console.log(`[bench] Building shared and client...`);
  await ensureBuild();

  console.log(`[bench] Starting preview server on port ${args.port}...`);
  previewServer = await startPreviewServer(args.port);

  try {
    const browserType = playwright[args.browserName];

    if (!browserType) {
      throw new Error(`Unsupported browser: ${args.browserName}`);
    }

    const deviceName = args.deviceName ?? "Pixel 5";
    const deviceDescriptor =
      args.mobile && playwright.devices?.[deviceName]
        ? playwright.devices[deviceName]
        : null;

    browser = await browserType.launch({
      headless: !args.headed
    });

    const context = await browser.newContext(
      deviceDescriptor
        ? {
            ...deviceDescriptor
          }
        : {}
    );
    const page = await context.newPage();

    page.on("console", (message) => {
      if (message.type() === "error" || message.type() === "warning") {
        consoleEntries.push({
          text: message.text(),
          type: message.type()
        });
      }
    });
    page.on("pageerror", (error) => {
      consoleEntries.push({
        text: error.message,
        type: "pageerror"
      });
    });

    if (
      args.cpuThrottleRate !== null &&
      args.cpuThrottleRate > 1 &&
      typeof context.newCDPSession === "function"
    ) {
      const session = await context.newCDPSession(page);
      await session.send("Emulation.setCPUThrottlingRate", {
        rate: args.cpuThrottleRate
      });
    }

    console.log(`[bench] Opening ${targetUrl} ...`);
    await page.goto(targetUrl, {
      waitUntil: "networkidle"
    });
    await page.waitForFunction(() => typeof window.render_perf_to_text === "function");

    console.log(`[bench] Waiting for heavy playback to finish...`);
    const perfSummary = await waitForPerfSummary(page);
    const payload = {
      browser: args.browserName,
      caseId: args.caseId,
      consoleEntries,
      cpuThrottleRate: args.cpuThrottleRate,
      deviceName: deviceDescriptor ? deviceName : null,
      mobile: args.mobile,
      route: args.route,
      summary: perfSummary,
      url: targetUrl,
      userAgent: await page.evaluate(() => navigator.userAgent)
    };

    const defaultOutputPath = resolve(
      repoRoot,
      "artifacts",
      `${args.route}-${args.mobile ? "mobile" : "desktop"}-perf.json`
    );
    const outputPath = args.outputPath ?? defaultOutputPath;

    await writeOutputFile(outputPath, payload);
    console.log(JSON.stringify(payload, null, 2));
    console.log(`[bench] Wrote benchmark report to ${outputPath}`);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }

    await stopPreviewServer(previewServer);
  }
}

main().catch((error) => {
  console.error(`[bench] ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  process.exit(1);
});
