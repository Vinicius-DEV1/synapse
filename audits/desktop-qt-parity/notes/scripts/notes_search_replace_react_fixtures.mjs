import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { applySearchReplace, parseSearchReplaceBlocks } from '../../../../apps/web-react/src/components/editor-extensions/hooks/blockDiffEngine.ts';

const fixturePath = new URL('../../../../core/synapse-core/tests/fixtures/notes_search_replace_parity.json', import.meta.url);
const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));

for (const testCase of fixture.parseCases) {
  assert.deepEqual(parseSearchReplaceBlocks(testCase.proposal), testCase.blocks, `parse fixture: ${testCase.name}`);
}

for (const testCase of fixture.applyCases) {
  const blocks = parseSearchReplaceBlocks(testCase.proposal);
  const result = applySearchReplace(testCase.source, blocks);
  assert.equal(result.success, testCase.success, `success: ${testCase.name}`);
  assert.equal(result.result, testCase.result, `result: ${testCase.name}`);
  assert.equal(result.replacedCount, testCase.replacedCount, `replaced count: ${testCase.name}`);
  if (testCase.error !== undefined) assert.equal(result.error, testCase.error, `error: ${testCase.name}`);
}

for (const whitespace of fixture.trimWhitespace) {
  const proposal = `<<<<<<< SEARCH\n${whitespace}target${whitespace}\n=======\n${whitespace}done${whitespace}\n>>>>>>>`;
  const result = applySearchReplace('target', parseSearchReplaceBlocks(proposal));
  assert.equal(result.success, true, `ECMAScript whitespace: ${JSON.stringify(whitespace)}`);
  assert.equal(result.result, 'done', `ECMAScript whitespace: ${JSON.stringify(whitespace)}`);
}

for (const character of fixture.nonTrimWhitespace) {
  const proposal = `<<<<<<< SEARCH\n${character}target${character}\n=======\n${character}done${character}\n>>>>>>>`;
  const result = applySearchReplace('target', parseSearchReplaceBlocks(proposal));
  assert.equal(result.success, false, `non-whitespace: ${JSON.stringify(character)}`);
}

console.log(`React SEARCH/REPLACE parity fixtures passed (${fixture.parseCases.length + fixture.applyCases.length} named cases, ${fixture.trimWhitespace.length + fixture.nonTrimWhitespace.length} whitespace probes).`);
