// Create the first (main) admin, or reset any admin's password by email (also reactivates them).
// Usage: npm run admin:create — other admins are added from the dashboard's Team page.
// On first run it also adds a random AUTH_SECRET to .env (needed to sign login sessions).

import { randomBytes } from "node:crypto";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import readline from "node:readline";
import bcrypt from "bcryptjs";
import prismaPkg from "@prisma/client";

const { PrismaClient, AdminRole } = prismaPkg;

function ensureAuthSecret() {
  const envPath = new URL("../.env", import.meta.url);
  const env = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  if (/^AUTH_SECRET=.+/m.test(env)) return false;
  const prefix = env && !env.endsWith("\n") ? "\n" : "";
  appendFileSync(envPath, `${prefix}\n# Signs admin login sessions. Changing it signs everyone out.\nAUTH_SECRET="${randomBytes(48).toString("hex")}"\n`);
  return true;
}

// Interactive terminal: one readline, with typed passwords masked as "*".
// Piped input (non-TTY): answers are read line by line from stdin.
const interactive = Boolean(process.stdin.isTTY);
const rl = interactive ? readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true }) : null;
let muted = false;
if (rl) {
  const write = rl._writeToOutput.bind(rl);
  rl._writeToOutput = (s) => (muted ? process.stdout.write(/[\r\n]/.test(s) ? "\n" : "*") : write(s));
}
const pipedLines = interactive ? [] : readFileSync(0, "utf8").split(/\r?\n/);

function ask(question, { hidden = false } = {}) {
  if (!rl) {
    process.stdout.write(question + "\n");
    return Promise.resolve((pipedLines.shift() ?? "").trim());
  }
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      muted = false;
      resolve(answer.trim());
    });
    muted = hidden; // set after the prompt is written, so only the typed answer is masked
  });
}

const prisma = new PrismaClient();
try {
  const addedSecret = ensureAuthSecret();
  if (addedSecret) console.log("✔ Added AUTH_SECRET to .env");

  const email = (await ask("Email: ")).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("That doesn't look like an email address.");

  const existing = await prisma.admin.findUnique({ where: { email } });
  let username = existing?.username;
  let name = existing?.name;
  if (!existing) {
    username = (await ask("Username (used to sign in): ")).toLowerCase();
    if (!/^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$/.test(username))
      throw new Error("Username must be 3–30 characters: lowercase letters, numbers, dots or underscores.");
    if (await prisma.admin.findUnique({ where: { username } })) throw new Error("That username is taken.");
    name = await ask("Display name: ");
    if (name.length < 2) throw new Error("Name must be at least 2 characters.");
  }

  const password = await ask(existing ? "New password (min 10 chars): " : "Password (min 10 chars): ", { hidden: true });
  if (password.length < 10) throw new Error("Password must be at least 10 characters.");
  const confirm = await ask("Repeat password: ", { hidden: true });
  if (password !== confirm) throw new Error("Passwords don't match.");

  const passwordHash = await bcrypt.hash(password, 12);
  if (existing) {
    // Also reactivates the account and signs out existing sessions: this is the lock-out recovery path.
    await prisma.admin.update({
      where: { email },
      data: { passwordHash, isActive: true, sessionVersion: { increment: 1 } },
    });
    console.log(`✔ Password reset for @${username}`);
  } else {
    // The first admin is the main admin; add everyone else from the Team page in the dashboard.
    const role = (await prisma.admin.count({ where: { isBot: false } })) === 0 ? AdminRole.SUPER_ADMIN : AdminRole.EDITOR;
    await prisma.admin.create({ data: { email, username, name, passwordHash, role } });
    console.log(`✔ Created ${role === AdminRole.SUPER_ADMIN ? "main admin" : "editor"} @${username}`);
  }
  console.log("  Sign in at http://localhost:3000/admin/login");
  if (addedSecret) console.log("  If the site was already running, stop it (Ctrl+C) and start it again so it picks up AUTH_SECRET.");
} catch (err) {
  console.error(`✖ ${err.message}`);
  process.exitCode = 1;
} finally {
  rl?.close();
  await prisma.$disconnect();
}
