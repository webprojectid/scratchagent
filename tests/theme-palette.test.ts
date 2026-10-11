import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync("src/app/color-styles.css", "utf8");
const palettes = [...css.matchAll(/(?::root, html\.dark|html\.light) \{([^}]+)\}/g)].map(match =>
  Object.fromEntries([...match[1].matchAll(/(--theme-[\w-]+): (#[\da-f]{6});/g)].map(value => [value[1], value[2]])));
function luminance(hex: string) {
  const channels = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255)
    .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}
function contrast(first: string, second: string) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + .05) / (values[1] + .05);
}
test("both modes keep body, secondary text, links and action labels readable", () => {
  assert.equal(palettes.length, 2);
  for (const palette of palettes) {
    for (const [text, background] of [
      ["--theme-text", "--theme-bg"], ["--theme-text", "--theme-surface"],
      ["--theme-muted", "--theme-surface"], ["--theme-accent", "--theme-bg"],
      ["--theme-on-accent", "--theme-accent"], ["--theme-danger", "--theme-surface"],
    ]) assert.ok(contrast(palette[text], palette[background]) >= 4.5, `${text} on ${background} must meet 4.5:1`);
  }
});
test("the brand accent and all chart series use green or neutral shades in both modes", () => {
  for (const palette of palettes) {
    for (const key of ["--theme-accent", "--theme-chart-1", "--theme-chart-2", "--theme-chart-3", "--theme-chart-4"]) {
      const color = palette[key];
      const [red, green, blue] = [1, 3, 5].map(index => parseInt(color.slice(index, index + 2), 16));
      assert.ok(green >= red && green >= blue, `${key} must stay within the green identity`);
    }
  }
});
test("form boundaries have non-text contrast in both modes", () => {
  for (const palette of palettes) {
    for (const background of ["--theme-bg", "--theme-surface"]) {
      assert.ok(contrast(palette["--theme-border-strong"], palette[background]) >= 3);
    }
  }
});
test("every activity-calendar intensity keeps its date label readable", () => {
  const calendar = readFileSync("src/components/profile-dashboard.module.css", "utf8");
  const levels = [...calendar.matchAll(/\.heatmap button\[data-level="([1-4])"\][^{]*\{([^}]+)\}/g)];
  assert.equal(levels.length, 4);
  for (const palette of palettes) {
    for (const [, level, body] of levels) {
      const percentage = Number(body.match(/var\(--primary\) (\d+)%/)?.[1] ?? 100) / 100;
      const accent = palette["--theme-accent"], surface = palette["--theme-surface"];
      const mixed = "#" + [1, 3, 5].map(index => Math.round(
        parseInt(accent.slice(index, index + 2), 16) * percentage +
        parseInt(surface.slice(index, index + 2), 16) * (1 - percentage),
      ).toString(16).padStart(2, "0")).join("");
      const text = body.includes("--theme-on-accent") ? palette["--theme-on-accent"] : palette["--theme-text"];
      assert.ok(contrast(text, mixed) >= 4.5, `Calendar level ${level} must meet 4.5:1`);
    }
  }
});
