import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpreadPlan, fitPage } from '../src/layout.js';

test('fitPage keeps aspect ratio and centers the page in the target box', () => {
  const fitted = fitPage(595, 842, { x: 0, y: 0, width: 421, height: 595 });
  assert.ok(Math.abs(fitted.height - 595) < 1e-9);
  assert.ok(fitted.width < 421);
  assert.ok(Math.abs(fitted.y) < 1e-9);
  assert.ok(Math.abs((fitted.x * 2 + fitted.width) - 421) < 1e-9);
});

test('createSpreadPlan lays portrait pages out right-to-left on landscape sheets', () => {
  const pages = Array.from({ length: 4 }, () => ({ width: 595, height: 842 }));
  const plan = createSpreadPlan(pages);
  assert.deepEqual(plan.sheet, { width: 842, height: 595 });
  assert.equal(plan.spreads.length, 2);
  assert.equal(plan.spreads[0].right.pageIndex, 0);
  assert.equal(plan.spreads[0].left.pageIndex, 1);
  assert.equal(plan.spreads[1].right.pageIndex, 2);
  assert.equal(plan.spreads[1].left.pageIndex, 3);
  assert.ok(plan.spreads[0].left.x < plan.spreads[0].right.x);
});

test('createSpreadPlan leaves the left half blank for the final odd page', () => {
  const pages = Array.from({ length: 5 }, () => ({ width: 595, height: 842 }));
  const plan = createSpreadPlan(pages);
  assert.equal(plan.spreads.length, 3);
  assert.equal(plan.spreads[2].right.pageIndex, 4);
  assert.equal(plan.spreads[2].left, null);
});

test('createSpreadPlan fits each page using its own dimensions', () => {
  const plan = createSpreadPlan([{ width: 595, height: 842 }, { width: 400, height: 400 }]);
  assert.equal(plan.spreads[0].left.pageIndex, 1);
  assert.equal(plan.spreads[0].left.width, plan.spreads[0].left.height);
});

test('createSpreadPlan rejects an empty PDF', () => {
  assert.throws(() => createSpreadPlan([]), /page/i);
});
