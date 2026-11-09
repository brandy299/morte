import { test } from "vitest";
import assert from "node:assert/strict";
import { isEnglishThinking } from "./innere-gedanken.ts";

test("English thinking is recognised", () => {
  assert.equal(isEnglishThinking("The teacher says it still looks like watercolor. I set hintergrund keiner but the palette still has soft colors, so I cannot remove that."), true);
  assert.equal(isEnglishThinking("Now rebuild the Erklärstück plainly: hintergrund keiner, palette which? That is the honest path for the teacher."), true);
});

test("German answers are kept", () => {
  assert.equal(isEnglishThinking("Der harte Look geht bei Erklärstück und Übung nicht. Ich kann es schlicht ohne Muster machen, wenn du magst."), false);
  assert.equal(isEnglishThinking("Hallo! Schön, dass du da bist. Ich kann dir ein Arbeitsblatt oder Folien machen."), false);
});

test("short or mixed text is kept", () => {
  assert.equal(isEnglishThinking("Okay, the Business English Klausur ist fertig."), false);
});
