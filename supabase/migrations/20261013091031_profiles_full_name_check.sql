-- 1.1e: a CHECK on profiles.full_name (docs/TASKS.md 1.1e; owner decisions Q13 and Q21 of 13 Okt 2026).
--
-- Migration 20261012025112 (1.1c) cuts the name that arrives in the signup metadata (trim, at most 100 characters, empty becomes NULL),
-- but that only covers the signup: the column privilege of 1.1 (grant update (full_name) to authenticated) lets a user UPDATE their own
-- full_name through the REST API with any length, including an empty or blank one. This constraint closes that gap in the database.
--
-- The rule: full_name is NULL, or it has at most 100 characters AND is not empty once trimmed with the SAME character set the signup
-- trigger uses (the characters JavaScript's trim() removes; the literal below is the one of 20261012025112, copied, not retyped).
-- Adding the constraint validates every existing row, so a row that breaks the rule makes this migration fail instead of staying
-- silently wrong.
--
-- The trigger is NOT changed here. Its output always satisfies the rule (left(btrim(x, set), 100) has at most 100 characters and begins
-- with a character that was not trimmed, or it is empty and becomes NULL). That is what keeps a signup with hostile metadata from
-- failing inside the trigger, and it is tested with a 10,000-character name.
--
-- A client that UPDATEs full_name gets SQLSTATE 23514 (HTTP 400, code 23514 from PostgREST) for a value that breaks the rule and must
-- map it to a message.
alter table public.profiles
  add constraint profiles_full_name_check
    check (
      full_name is null
      or (
        char_length(full_name) <= 100
        and btrim(full_name, E' \t\n\u000b\f\r                 　﻿') <> ''
      )
    );
