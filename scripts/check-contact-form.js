#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/pages/contacto.astro", "utf8");

function assertRestoresSubmit(block, label) {
  assert.match(block, /submitBtn\.disabled\s*=\s*false;/, `${label} re-enables submit button`);
  assert.match(block, /submitBtn\.textContent\s*=\s*"Enviar consulta";/, `${label} restores submit button text`);
}

const successStart = source.search(/if\s*\(\s*res\.ok\s*&&\s*data\.success\s*\)\s*{/);
assert.notEqual(successStart, -1, "success branch exists");

const successElse = source.indexOf("} else {", successStart);
assert.notEqual(successElse, -1, "success branch has else path");
assertRestoresSubmit(source.slice(successStart, successElse), "success branch");

const catchStart = source.indexOf("} catch (err) {");
assert.notEqual(catchStart, -1, "catch path exists");

const catchEnd = source.indexOf("\n      }\n    });", catchStart);
assert.notEqual(catchEnd, -1, "catch path closes before submit listener ends");
assertRestoresSubmit(source.slice(catchStart, catchEnd), "catch path");

console.log("Contact form check passed");
