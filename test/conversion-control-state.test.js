import test from 'node:test';
import assert from 'node:assert/strict';
import { createConversionControlState } from '../src/conversion-control-state.js';

function control(disabled) {
  return { disabled };
}

test('starting either conversion locks both controls until it finishes', () => {
  const urlButton = control(false);
  const fileButton = control(false);
  const state = createConversionControlState({ urlButton, fileButton, urlAvailable: true });

  assert.equal(state.start(), true);
  assert.equal(urlButton.disabled, true);
  assert.equal(fileButton.disabled, true);
  assert.equal(state.start(), false);

  state.finish();
  assert.equal(urlButton.disabled, false);
  assert.equal(fileButton.disabled, false);
});

test('finishing a conversion restores an unavailable URL control to its original disabled state', () => {
  const urlButton = control(true);
  const fileButton = control(false);
  const state = createConversionControlState({ urlButton, fileButton, urlAvailable: false });

  assert.equal(state.start(), true);
  state.finish();

  assert.equal(urlButton.disabled, true);
  assert.equal(fileButton.disabled, false);
});
