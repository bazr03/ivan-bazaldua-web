#!/usr/bin/env node
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const nav = readFileSync("src/components/Nav.astro", "utf8");
const closed = nav.match(/\.nav__menu\s*{([^}]*)}/)?.[1] ?? "";
const open = nav.match(/\.nav__menu\.is-open\s*{([^}]*)}/)?.[1] ?? "";

assert.match(closed, /visibility:\s*hidden;/);
assert.match(closed, /transition:\s*max-height var\(--transition-base\);/);
assert.match(open, /visibility:\s*visible;/);
assert.doesNotMatch(nav, /transition:[^;]*visibility[^;]*var\(--transition-base\)/);

console.log("Nav CSS check passed");
