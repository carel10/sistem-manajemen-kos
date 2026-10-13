// PreToolUse hook (owner decision Q18, 13 Okt 2026), for the Bash and PowerShell tools. Blocks two things, exit code 2 with a
// message in Indonesian that names the alternative:
//   1. `node -e`, `node -p`, `node --eval`, `node --print` (also node.exe, also bundled short flags such as -pe);
//   2. an empty heredoc (`<<EOF` immediately followed by the terminator line).
// Why: an inline script loses quotes and backslashes in the shell (regex such as (?<!\\)\| silently break), cannot be hashed
// or repeated, and an empty heredoc is always a slip. The rule in docs/ronde-aturan.md and .claude/rules/workflow.md section 4.
//
// Input: the tool call as JSON on stdin ({ tool_name, tool_input: { command } }). Anything else (another tool, input that is not
// JSON, no command) is allowed: the hook fails OPEN, it must never be the reason a session cannot work.
// Limits (tested as they are in tests/hooks/block-inline-node.test.mjs, ids L1-L4, P28): the scan is on the TEXT of the command,
// so a commit message that merely mentions `node -e` is blocked (false positive), and a variable in place of `node`, a script
// read from stdin (`node - <<'EOF'` with content) or an empty PowerShell here-string are not seen (false negatives).
import { readFileSync } from "node:fs";

const SHELL_TOOLS = new Set(["Bash", "PowerShell"]);

// The command word: `node` or `node.exe`, at the start, after whitespace or a shell separator, a quote, a path separator or `=`,
// and followed by whitespace, a quote or the end (so `nodemon`, `node-gyp` and `nodejs` are not it).
const NODE_WORD = /(?:^|[\s;&|(`"'\\/=])node(?:\.exe)?(?=$|[\s"'])/g;
// Flags with which node runs code given on the command line: -e, -p, -pe, -ep, --eval, --print (also --eval=code).
const INLINE_FLAG = /^(?:-[a-zA-Z]*[ep][a-zA-Z]*|--eval|--print)(?:=.*)?$/;
// Flags of node that take their value as the NEXT argument, so that value is not mistaken for the script path.
const VALUE_FLAGS = new Set([
  "-r", "--require", "--import", "--loader", "--experimental-loader", "--env-file", "-C", "--conditions",
  "--input-type", "--test-reporter", "--test-reporter-destination", "--test-name-pattern",
]);
// A heredoc whose body is empty: `<<WORD` (or `<<-WORD`, WORD optionally quoted; not the here-string `<<<`) followed by nothing
// but blank lines before the terminator line.
const EMPTY_HEREDOC = /(?<!<)<<(?!<)-?[ \t]*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1[^\n]*\r?\n(?:[ \t]*\r?\n)*[ \t]*\2[ \t]*(?:\r?\n|$)/;

const NODE_MESSAGE =
  "DIBLOKIR (aturan proyek, keputusan pemilik Q18): jangan menjalankan kode lewat `node -e`, `node -p`, `--eval` atau `--print` " +
  "(juga node.exe). Tulis skripnya ke berkas dengan alat Write, di C:\\Users\\LENOVO\\manakos-probes\\<ronde>\\, lalu jalankan " +
  "berkasnya: `node <berkas>.mjs`. Alasannya: kutip dan backslash rusak di baris perintah, dan skrip yang tidak tersimpan tidak " +
  "bisa di-hash atau diulang.";
const HEREDOC_MESSAGE =
  "DIBLOKIR (aturan proyek, keputusan pemilik Q18): heredoc kosong (`<<EOF` langsung diikuti `EOF`). Hapus heredoc-nya, atau " +
  "tulis isinya ke berkas dengan alat Write dan jalankan berkasnya.";

/** True when some `node` in the command is given an inline-code flag before its script path. */
function usesInlineNode(command) {
  NODE_WORD.lastIndex = 0;
  let match;
  while ((match = NODE_WORD.exec(command)) !== null) {
    // the arguments of this node: the text up to the next command separator
    const rest = command.slice(match.index + match[0].length).split(/&&|\|\||[;|\n)]/, 1)[0];
    // a token that is only a quote (the closing quote of `"...\node.exe"`) is not an argument
    const tokens = rest.split(/\s+/).map((token) => token.replace(/^["'`]+|["'`]+$/g, "")).filter(Boolean);
    let skipValue = false;
    for (const token of tokens) {
      if (skipValue) { skipValue = false; continue; }
      if (INLINE_FLAG.test(token)) return true;
      if (VALUE_FLAGS.has(token)) { skipValue = true; continue; }
      if (!token.startsWith("-")) break; // the script path (or a subcommand): what follows is not node's own flags
    }
  }
  return false;
}

function main() {
  let call;
  try {
    call = JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return 0; // empty or unreadable input: fail open
  }
  if (!call || !SHELL_TOOLS.has(call.tool_name)) return 0;
  const command = call.tool_input && typeof call.tool_input.command === "string" ? call.tool_input.command : "";
  if (!command) return 0;
  if (usesInlineNode(command)) {
    process.stderr.write(`${NODE_MESSAGE}\n`);
    return 2;
  }
  if (EMPTY_HEREDOC.test(command)) {
    process.stderr.write(`${HEREDOC_MESSAGE}\n`);
    return 2;
  }
  return 0;
}

process.exitCode = main();
