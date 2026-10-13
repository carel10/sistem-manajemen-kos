// Tests of the PreToolUse hook .claude/hooks/block-inline-node.mjs (owner decision Q18, 13 Okt 2026): it must block `node -e`,
// `node -p`, `--eval`, `--print` (also node.exe) and an empty heredoc, for the Bash and PowerShell tools, with exit code 2 and a
// message in Indonesian that names the alternative (write the script to a file); everything else passes with exit code 0.
// Part of `npm test`; no network, no database, nothing is executed from the samples (they are only text on stdin).
//
// Test ids: B = must be blocked, P = must pass, L = a LIMITATION recorded as it behaves today (not a wish), S = settings.json.
// The mutation series of the hook refers to these ids.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const HOOK = join(ROOT, ".claude", "hooks", "block-inline-node.mjs");

/** Runs the hook the way Claude Code does: the tool call as JSON on stdin; returns exit code and stderr. */
function run(tool, command, { raw } = {}) {
  const input = raw !== undefined ? raw : JSON.stringify({ hook_event_name: "PreToolUse", tool_name: tool, tool_input: { command } });
  const result = spawnSync(process.execPath, [HOOK], { input, encoding: "utf8", timeout: 20_000, windowsHide: true });
  return { status: result.status, stderr: String(result.stderr), stdout: String(result.stdout) };
}
const short = (text) => JSON.stringify(text).replace(/\\n/g, "⏎").slice(0, 70);

// Git Bash is the shell Claude Code uses for hook commands on this machine (measured, Q22), so the configured command is run the
// same way here. Without it (another machine) the tests that need it are skipped with a reason; S1 and S2 still run.
const BASH = [process.env.MK_TEST_BASH, "C:\\Program Files\\Git\\bin\\bash.exe", "C:\\Program Files (x86)\\Git\\bin\\bash.exe"]
  .filter(Boolean).find((path) => existsSync(path)) ?? (process.platform === "win32" ? null : "/bin/bash");
const NEEDS_BASH = { skip: BASH ? false : "Git Bash not found (set MK_TEST_BASH to bash.exe); the hook command is a bash command line" };
const slashes = (path) => path.replace(/\\/g, "/");
const SUBFOLDER = join(ROOT, "tests");
/** Runs a hook command line the way Claude Code does: through bash, CLAUDE_PROJECT_DIR in the environment, tool call JSON on stdin. */
function viaBash(command, text, { cwd, projectDir }) {
  return spawnSync(command, {
    shell: BASH, cwd, encoding: "utf8", timeout: 20_000, windowsHide: true,
    env: { ...process.env, CLAUDE_PROJECT_DIR: slashes(projectDir) },
    input: JSON.stringify({ hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: text } }),
  });
}

// ---- must be blocked --------------------------------------------------------------------------------------------------------
const BLOCKED = [
  ["B01", "Bash", 'node -e "console.log(1)"', "node"],
  ["B02", "Bash", 'node -e ""', "node"],
  ["B03", "Bash", 'node -p "1+1"', "node"],
  ["B04", "Bash", 'node --eval "console.log(1)"', "node"],
  ["B05", "Bash", 'node --print "process.version"', "node"],
  ["B06", "Bash", 'node.exe -e "x"', "node"],
  ["B07", "Bash", 'node -pe "1"', "node"],
  ["B08", "Bash", 'node -ep "1"', "node"],
  ["B09", "Bash", "cd /c/repo && node -e 'x'", "node"],
  ["B10", "Bash", 'echo x | node -e "process.stdin.pipe(process.stdout)"', "node"],
  ["B11", "Bash", 'node --experimental-strip-types -e "x"', "node"],
  ["B12", "Bash", 'node --no-warnings -p "x"', "node"],
  ["B13", "Bash", 'node -r dotenv/config -e "x"', "node"],
  ["B14", "Bash", 'node --input-type=module --eval "x"', "node"],
  ["B15", "Bash", 'node --eval="x"', "node"],
  ["B16", "Bash", '/usr/bin/node -e "x"', "node"],
  ["B17", "PowerShell", '& "C:\\Program Files\\nodejs\\node.exe" -e "x"', "node"],
  ["B18", "PowerShell", 'node -e "x"', "node"],
  ["B19", "Bash", "cat > /dev/null <<'EOF'\nEOF", "heredoc"],
  ["B20", "Bash", "cat <<EOF\nEOF", "heredoc"],
  ["B21", "Bash", "cat <<-EOF\n\tEOF", "heredoc"],
  ["B22", "Bash", "cat <<'X'\n\nX", "heredoc"],
  ["B23", "Bash", "cat <<EOF\r\nEOF", "heredoc"],
  ["B24", "Bash", "bash -c \"node -e 'x'\"", "node"],
  ["B25", "Bash", 'NODE_OPTIONS=--no-warnings node -e "x"', "node"],
];
for (const [id, tool, command, rule] of BLOCKED) {
  test(`${id} blocked (${tool}): ${short(command)}`, () => {
    const r = run(tool, command);
    assert.equal(r.status, 2, `exit code must be 2 (blocked), got ${r.status}; stderr: ${r.stderr.slice(0, 200)}`);
    assert.match(r.stderr, /DIBLOKIR/, "the message says it is blocked");
    if (rule === "node") assert.match(r.stderr, /Write/, "the message names the alternative: write the script to a file with the Write tool");
    if (rule === "heredoc") assert.match(r.stderr, /heredoc kosong/, "the message names the empty heredoc");
  });
}

// ---- must pass --------------------------------------------------------------------------------------------------------------
const PASSING = [
  ["P01", "Bash", "node script.mjs"],
  ["P02", "Bash", "node --test tests/hooks/"],
  ["P03", "Bash", "node --check file.mjs"],
  ["P04", "Bash", "node --experimental-strip-types --test lib/leads.test.mjs lib/auth-copy.test.mjs"],
  ["P05", "Bash", "node -v"],
  ["P06", "Bash", "node --version"],
  ["P07", "Bash", "node scripts/run.mjs --eval-mode"],
  ["P08", "Bash", "node run_series.mjs --label=red --runs=10 -p 3"],
  ["P09", "Bash", "node ./tools/e-script.mjs"],
  ["P10", "Bash", "npm run test:e2e:db"],
  ["P11", "Bash", "npm test"],
  ["P12", "Bash", "git status -sb"],
  ["P13", "Bash", "ls -la"],
  ["P14", "Bash", "echo node"],
  ["P15", "Bash", "nodemon -e js"],
  ["P16", "Bash", "node-gyp rebuild"],
  ["P17", "Bash", "./node_modules/.bin/next dev"],
  ["P18", "Bash", "cat <<'EOF'\nhello\nEOF"],
  ["P19", "Bash", "cat > f.txt <<EOF\nline1\nline2\nEOF"],
  ["P20", "Bash", 'cat <<< "text"'],
  ["P21", "Bash", 'grep -n "evaluate" file.ts'],
  ["P22", "Bash", 'docker exec -i supabase_db_x psql -U postgres -d postgres -c "select 1"'],
  ["P23", "Bash", "python script.py"],
  ["P24", "Bash", "git commit -F /c/Users/LENOVO/manakos-probes/ronde15/scripts/msg.txt"],
  ["P25", "PowerShell", "Get-ChildItem -Recurse"],
  ["P26", "PowerShell", "node script.mjs"],
  ["P27", "PowerShell", "$text = @'\nisi\n'@; node file.mjs"],
  ["P28", "Bash", "node - <<'EOF'\nconsole.log(1)\nEOF"],
];
for (const [id, tool, command] of PASSING) {
  test(`${id} passes (${tool}): ${short(command)}`, () => {
    const r = run(tool, command);
    assert.equal(r.status, 0, `exit code must be 0 (allowed), got ${r.status}; stderr: ${r.stderr.slice(0, 200)}`);
    assert.equal(r.stderr, "", "and nothing is printed");
  });
}
test("P29 passes: a tool that is not a shell is not inspected, even when its text mentions node -e", () => {
  const input = JSON.stringify({ hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path: "a.md", content: 'node -e "x"' } });
  assert.equal(run("Write", "", { raw: input }).status, 0);
});
test("P30 passes: input that is not JSON, empty input and a call without a command do not block (fail open)", () => {
  assert.equal(run("Bash", "", { raw: "not json" }).status, 0);
  assert.equal(run("Bash", "", { raw: "" }).status, 0);
  assert.equal(run("Bash", "", { raw: JSON.stringify({ tool_name: "Bash", tool_input: {} }) }).status, 0);
});

// ---- limitations, asserted as they behave today -----------------------------------------------------------------------------
test("L1 limitation (false positive): a commit message that only MENTIONS node -e is blocked", () => {
  assert.equal(run("Bash", 'git commit -m "jangan pakai node -e di skrip"').status, 2);
});
test("L2 limitation (false positive): any text with the words node -p is blocked, even an echo", () => {
  assert.equal(run("Bash", 'echo "contoh: node -p 1"').status, 2);
});
test("L3 limitation (false negative): a variable in place of node is not seen", () => {
  assert.equal(run("Bash", 'NODE=node; $NODE -e "x"').status, 0);
});
test("L4 limitation (false negative): an EMPTY PowerShell here-string is not a heredoc and is not blocked", () => {
  assert.equal(run("PowerShell", "$x = @'\n'@").status, 0);
});
test("L5 limitation (why Q22): a hook command relative to the project root does NOT run from a subfolder, so it fails open", NEEDS_BASH, () => {
  const result = viaBash("node .claude/hooks/block-inline-node.mjs", 'node -e "x"', { cwd: SUBFOLDER, projectDir: ROOT });
  assert.notEqual(result.status, 2, "the relative form cannot find the script from tests/, so it does not block");
  assert.equal(result.status, 1, "node exits 1 because the module is not found (a non-blocking hook error)");
});

// ---- settings.json -----------------------------------------------------------------------------------------------------------
const SETTINGS = join(ROOT, ".claude", "settings.json");
const ASK_AS_BEFORE = [
  "Edit(/lib/supabase-admin.ts)",
  "Bash(git push *)",
  "Bash(git reset --hard *)",
  "PowerShell(git push *)",
  "PowerShell(git reset --hard *)",
];
test("S1 settings.json: valid JSON and the permissions.ask block is exactly what it was before the hook", () => {
  const settings = JSON.parse(readFileSync(SETTINGS, "utf8"));
  assert.deepEqual(settings.permissions.ask, ASK_AS_BEFORE);
  assert.deepEqual(Object.keys(settings.permissions), ["ask"], "no other permission list was added");
});
// The command Claude Code runs for the hook (Q22, 13 Okt 2026). MEASURED on this machine (probes of 13 Okt 2026, for the Bash AND the
// PowerShell tool): hook commands run in Git Bash; CLAUDE_PROJECT_DIR is set (forward slashes) and expanded by that bash; the hook's
// working directory is the working directory of the tool call, so a path relative to the project root silently fails open from a
// subfolder. The command therefore names the script through CLAUDE_PROJECT_DIR, quoted (a path may contain a space).
const HOOK_COMMAND = 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/block-inline-node.mjs"';
test("S2 settings.json: one PreToolUse hook for Bash and PowerShell only, with the CLAUDE_PROJECT_DIR command", () => {
  const settings = JSON.parse(readFileSync(SETTINGS, "utf8"));
  const entries = settings.hooks?.PreToolUse ?? [];
  assert.equal(entries.length, 1, "exactly one PreToolUse entry");
  const [entry] = entries;
  const matcher = new RegExp(`^(?:${entry.matcher})$`);
  for (const tool of ["Bash", "PowerShell"]) assert.ok(matcher.test(tool), `the matcher covers ${tool}`);
  for (const tool of ["Write", "Edit", "Read", "Grep", "Glob"]) assert.ok(!matcher.test(tool), `the matcher does not cover ${tool}`);
  assert.equal(entry.hooks.length, 1);
  assert.equal(entry.hooks[0].type, "command");
  assert.equal(entry.hooks[0].command, HOOK_COMMAND);
  assert.ok(existsSync(HOOK), "the script the command points to exists");
});

test("S3 settings.json: the configured command, run from the project root, blocks and allows", NEEDS_BASH, () => {
  const command = JSON.parse(readFileSync(SETTINGS, "utf8")).hooks.PreToolUse[0].hooks[0].command;
  assert.equal(viaBash(command, 'node -e "x"', { cwd: ROOT, projectDir: ROOT }).status, 2);
  assert.equal(viaBash(command, "node script.mjs", { cwd: ROOT, projectDir: ROOT }).status, 0);
});
test("S4 settings.json (Q22): the configured command, run from a SUBFOLDER (tests/), still blocks and allows", NEEDS_BASH, () => {
  const command = JSON.parse(readFileSync(SETTINGS, "utf8")).hooks.PreToolUse[0].hooks[0].command;
  const blocked = viaBash(command, 'node -e "x"', { cwd: SUBFOLDER, projectDir: ROOT });
  assert.equal(blocked.status, 2, `blocked from tests/: exit ${blocked.status}; stderr: ${String(blocked.stderr).slice(0, 160)}`);
  assert.match(String(blocked.stderr), /DIBLOKIR/);
  assert.equal(viaBash(command, "node script.mjs", { cwd: SUBFOLDER, projectDir: ROOT }).status, 0);
});
test("S5 settings.json (Q22): a project directory whose name contains a space is handled (the variable is quoted)", NEEDS_BASH, () => {
  const dir = mkdtempSync(join(tmpdir(), "mk hook dir "));
  try {
    mkdirSync(join(dir, ".claude", "hooks"), { recursive: true });
    copyFileSync(HOOK, join(dir, ".claude", "hooks", "block-inline-node.mjs"));
    const command = JSON.parse(readFileSync(SETTINGS, "utf8")).hooks.PreToolUse[0].hooks[0].command;
    const blocked = viaBash(command, 'node -e "x"', { cwd: SUBFOLDER, projectDir: dir });
    assert.equal(blocked.status, 2, `blocked with a space in the project path: exit ${blocked.status}; stderr: ${String(blocked.stderr).slice(0, 160)}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
