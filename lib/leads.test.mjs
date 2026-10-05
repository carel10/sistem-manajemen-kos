// Regression tests for the contact rules in lib/leads.ts (docs/TASKS.md 0.4a). Run with `npm test`.
// Plain node:test, no dependency: Node strips the TypeScript types on import (Node >= 22.18, or 22.6+ with
// --experimental-strip-types, which the npm script passes). A .mjs file keeps these out of the Next type check.
//
// The expectations are written from the approved RULES, not copied from the implementation's output:
//   phone : Indonesian mobile, prefixes 08 / 628 / +628, separators (space . - parentheses) ignored,
//           9-12 digits after +62 (a local 08... number of 10-13 digits), stored as +628...
//   email : trimmed, lowercased, shape x@y.zz, at most 254 characters (the leads.contact check constraint).
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  contactProblem,
  contactProblemMessage,
  isEmail,
  isPhoneID,
  LEAD_MESSAGES,
  MAX_EMAIL_LENGTH,
  normalizeContact,
  normalizeSource,
} from "./leads.ts";

// ---- the 44-case grid (owner decision 5 Oct 2026): built from the rules above --------------------------------

const grid = [];

// 24 phone cases: three prefixes x national-number length 7..14 (digits after the country code, starting with 8)
for (const prefix of ["0", "62", "+62"]) {
  for (let length = 7; length <= 14; length++) {
    const national = "8" + "1".repeat(length - 1);
    grid.push({
      name: `phone ${prefix}-prefix, ${length} national digits`,
      input: prefix + national,
      expected: length >= 9 && length <= 12 ? "+62" + national : null,
    });
  }
}

// 6 separator cases, all the same number
for (const input of [
  "0812-3456-7890",
  "0812 3456 7890",
  "0812.3456.7890",
  "(0812) 3456 7890",
  "+62 812-3456-7890",
  "+62(812)34567890",
]) {
  grid.push({ name: `separators ${JSON.stringify(input)}`, input, expected: "+6281234567890" });
}

// 8 non-mobile / junk inputs
for (const input of ["021-555-1234", "+14155552671", "+62021555123", "08", "", "   ", "halo", "+6208123456789"]) {
  grid.push({ name: `rejected ${JSON.stringify(input)}`, input, expected: null });
}

// 6 email cases (the last one is 256 characters: over the 254 limit)
for (const [input, expected] of [
  ["nama@email.com", "nama@email.com"],
  ["Nama@Email.com", "nama@email.com"],
  ["a@b.c", null],
  ["a@b.co", "a@b.co"],
  ["a b@c.com", null],
  ["x@" + "y".repeat(250) + ".com", null],
]) {
  grid.push({ name: `email ${JSON.stringify(input.length > 30 ? input.slice(0, 12) + "..." : input)}`, input, expected });
}

describe("normalizeContact: the 44-case grid", () => {
  it("has exactly 44 cases", () => assert.equal(grid.length, 44));
  for (const { name, input, expected } of grid) {
    it(name, () => assert.equal(normalizeContact(input), expected));
  }
});

// Where the design package's own validators (kode/lib/validators.ts) disagree with the approved rules: 9 of the 44
// inputs. Not asserted against the package code (it is not in the repo); listed so the reason is not lost.
//   - 6 phones: the package accepts 8 and 13 national digits (the approved rule is 9-12), 3 prefixes x 2 lengths
//   - 2 phones with parentheses: the package does not treat ( and ) as separators
//   - 1 email of 256 characters: the package has no length limit

// ---- the cases from the approved preview (task 0.4) -----------------------------------------------------------

describe("normalizeContact: cases from the approved preview", () => {
  const cases = [
    ["0812-3456-7890", "+6281234567890"],
    ["+62 812 3456 7890", "+6281234567890"],
    ["Nama@Email.com", "nama@email.com"],
    ["021-555-1234", null],
    ["08123", null],
    ["nama@email", null],
    ["0812345678", "+62812345678"], // 10 local digits: lower bound
    ["0812345678901", "+62812345678901"], // 13 local digits: upper bound
    ["081234567", null], // 9 local digits
    ["08123456789012", null], // 14 local digits
    ["6281234567890", "+6281234567890"],
    ["(0812) 3456.7890", "+6281234567890"],
    ["+14155552671", null],
    ["+62215551234", null],
    ["", null],
    ["   ", null],
    ["halo", null],
    ["  a@b.co  ", "a@b.co"],
    ["a@b.c", null],
    ["a b@c.com", null],
    ["a@@b.com", null],
  ];
  for (const [input, expected] of cases) {
    it(JSON.stringify(input), () => assert.equal(normalizeContact(input), expected));
  }
});

// ---- email length: the 254 limit, on both sides --------------------------------------------------------------

describe("email length limit", () => {
  const atLimit = "a@" + "b".repeat(MAX_EMAIL_LENGTH - 5) + ".co"; // 254 characters
  const overLimit = "a@" + "b".repeat(MAX_EMAIL_LENGTH - 4) + ".co"; // 255 characters

  it("MAX_EMAIL_LENGTH matches the leads.contact check constraint", () => assert.equal(MAX_EMAIL_LENGTH, 254));
  it("builds the boundary strings at 254 and 255 characters", () => {
    assert.equal(atLimit.length, 254);
    assert.equal(overLimit.length, 255);
  });
  it("accepts an email of exactly 254 characters", () => assert.equal(normalizeContact(atLimit), atLimit));
  it("rejects an email of 255 characters", () => assert.equal(normalizeContact(overLimit), null));
  it("measures the trimmed input, not the raw one", () => assert.equal(normalizeContact("  " + atLimit + "  "), atLimit));
});

// ---- contactProblem: the friendly message for an over-long email ---------------------------------------------

describe("contactProblem", () => {
  const atLimit = "a@" + "b".repeat(MAX_EMAIL_LENGTH - 5) + ".co";
  const overLimit = "a@" + "b".repeat(MAX_EMAIL_LENGTH - 4) + ".co";

  it("accepts a valid phone number", () => assert.equal(contactProblem("0812-3456-7890"), null));
  it("accepts a valid email", () => assert.equal(contactProblem("nama@email.com"), null));
  it("accepts an email of exactly 254 characters", () => assert.equal(contactProblem(atLimit), null));
  it("reports an email of 255 characters as emailTooLong", () => assert.equal(contactProblem(overLimit), "emailTooLong"));
  it("reports an over-long string containing @ as emailTooLong even when the shape is also wrong", () =>
    assert.equal(contactProblem("a b@" + "x".repeat(300)), "emailTooLong"));
  it("reports a long string WITHOUT @ as invalid, not emailTooLong", () =>
    assert.equal(contactProblem("1".repeat(300)), "invalid"));
  // The server action hands contactProblem the RAW field value, spaces included, so it must measure what normalizeContact
  // measures: the trimmed text. (No test fed it padded input before: a version that measured the raw text passed them all.)
  it("measures the trimmed input: an email of 254 characters with spaces around it is fine", () =>
    assert.equal(contactProblem("  " + atLimit + "  "), null));
  it("measures the trimmed input: an email of 255 characters with spaces around it is still too long", () =>
    assert.equal(contactProblem("  " + overLimit + "  "), "emailTooLong"));
  it("reports junk as invalid", () => {
    for (const input of ["halo", "", "   ", "021-555-1234", "nama@email"]) assert.equal(contactProblem(input), "invalid", input);
  });
  it("maps each problem to its own message", () => {
    assert.equal(contactProblemMessage("emailTooLong"), LEAD_MESSAGES.emailTooLong);
    assert.equal(contactProblemMessage("invalid"), LEAD_MESSAGES.invalidContact);
    assert.notEqual(LEAD_MESSAGES.emailTooLong, LEAD_MESSAGES.invalidContact);
    assert.ok(LEAD_MESSAGES.emailTooLong.includes("254"));
  });
  it("agrees with normalizeContact on every grid input (accepted <=> no problem)", () => {
    for (const { input, expected } of grid) assert.equal(contactProblem(input) === null, expected !== null, JSON.stringify(input));
  });
});

// ---- isEmail / isPhoneID (re-exported by lib/validators.ts) are the same rule, not a copy --------------------

describe("isEmail / isPhoneID", () => {
  it("together accept exactly what normalizeContact accepts, on every grid input", () => {
    for (const { input, expected } of grid) {
      assert.equal(isEmail(input) || isPhoneID(input), expected !== null, JSON.stringify(input));
    }
  });
  it("keep the two kinds apart", () => {
    assert.equal(isEmail("a@b.co"), true);
    assert.equal(isPhoneID("a@b.co"), false);
    assert.equal(isPhoneID("0812-3456-7890"), true);
    assert.equal(isEmail("0812-3456-7890"), false);
  });
  // The login/register forms call these with the raw field value, not with normalizeContact's already-trimmed input.
  it("take the raw field value: spaces around it and capitals do not matter", () => {
    assert.equal(isEmail("  Nama@Email.com  "), true);
    assert.equal(isPhoneID("  0812 3456 7890  "), true);
  });
  it("apply the same 254 limit to email", () => {
    assert.equal(isEmail("a@" + "b".repeat(MAX_EMAIL_LENGTH - 5) + ".co"), true);
    assert.equal(isEmail("a@" + "b".repeat(MAX_EMAIL_LENGTH - 4) + ".co"), false);
  });
});

// ---- the approved copy, pinned verbatim -----------------------------------------------------------------------
// The tests above (and the e2e tests) compare what the page shows with LEAD_MESSAGES, which proves the wiring but would
// follow an accidental edit of a sentence. These literals are the texts the owner approved (invalidContact: copy deck
// 07-copy-deck.md; the others: task 0.4a, 5 Okt 2026). Changing the copy on purpose means changing them here too.

describe("LEAD_MESSAGES: the approved copy", () => {
  it("has exactly the approved sentences", () => {
    assert.deepEqual(
      { ...LEAD_MESSAGES },
      {
        invalidContact: "Masukkan nomor WhatsApp (diawali 08 atau +62) atau alamat email yang valid.",
        emailTooLong: "Alamat email terlalu panjang, maksimal 254 karakter.",
        consentRequired: "Centang persetujuan dulu supaya kami boleh menyimpan kontakmu.",
        submitFailed: "Maaf, pendaftaran belum berhasil. Coba lagi sebentar lagi.",
      },
    );
  });
});

// ---- normalizeSource ------------------------------------------------------------------------------------------

describe("normalizeSource", () => {
  const cases = [
    ["fbgroup-jogja", "fbgroup-jogja"],
    ["WA_Broadcast", "wa_broadcast"],
    ["", "direct"],
    [null, "direct"],
    ["FB Group!", "direct"],
    ["-lead", "direct"],
    ["x".repeat(65), "direct"],
  ];
  for (const [input, expected] of cases) {
    it(JSON.stringify(input && input.length > 20 ? input.slice(0, 10) + "..." : input), () => assert.equal(normalizeSource(input), expected));
  }
});
