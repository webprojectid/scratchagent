import { test } from "node:test";
import assert from "node:assert/strict";
import { roadmapLayout as layout, roadmapRowPositions } from "../src/lib/roadmap-layout";

test("Free and Pro roadmaps step downward between columns and keep every row clear", () => {
  for (const count of [1, 4, 7, 8, 10, 15]) {
    const { root, rows } = roadmapRowPositions(count);
    const centers = rows.map(row => row.feature.y + layout.feature.height / 2);
    assert.equal(root.y + layout.root.height / 2, (centers[0] + centers.at(-1)!) / 2);
    rows.forEach((row, index) => {
      assert.equal(row.feature.y + layout.feature.height / 2, centers[index]);
      assert.equal(row.subfeatures.y + layout.subfeatures.height / 2, centers[index] + layout.columnDrop);
      assert.equal(row.tasks.y + layout.tasks.height / 2, centers[index] + layout.columnDrop * 2);
      if (index > 0) {
        assert.ok(row.subfeatures.y - (rows[index - 1].subfeatures.y + layout.subfeatures.height) >= 32);
        assert.ok(row.feature.y - (rows[index - 1].feature.y + layout.feature.height) > 0);
        assert.ok(row.tasks.y - (rows[index - 1].tasks.y + layout.tasks.height) >= 32);
      }
      assert.ok(row.feature.x >= root.x + layout.root.width + 100);
      assert.ok(row.subfeatures.x >= row.feature.x + layout.feature.width + 100);
      assert.ok(row.tasks.x >= row.subfeatures.x + layout.subfeatures.width + 100);
    });
  }
});

test("empty and newly generated roadmaps have finite positions", () => {
  assert.deepEqual(roadmapRowPositions(0).rows, []);
  assert.ok(Number.isFinite(roadmapRowPositions(0).root.y));
  assert.equal(roadmapRowPositions(1).rows[0].subfeatures.y, layout.top + layout.columnDrop);
});
