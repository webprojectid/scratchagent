export const roadmapLayout = {
  top: 24,
  rowGap: 184,
  columnDrop: 48,
  root: { x: 0, width: 216, height: 92 },
  feature: { x: 344, width: 244, height: 84 },
  subfeatures: { x: 704, width: 264, height: 144 },
  tasks: { x: 1084, width: 296, height: 144 },
} as const;

export function roadmapRowPositions(count: number) {
  const rows = Array.from({ length: Math.max(0, count) }, (_, index) => {
    const centerY = roadmapLayout.top + roadmapLayout.subfeatures.height / 2 + index * roadmapLayout.rowGap;
    return {
      feature: { x: roadmapLayout.feature.x, y: centerY - roadmapLayout.feature.height / 2 },
      subfeatures: { x: roadmapLayout.subfeatures.x, y: centerY + roadmapLayout.columnDrop - roadmapLayout.subfeatures.height / 2 },
      tasks: { x: roadmapLayout.tasks.x, y: centerY + roadmapLayout.columnDrop * 2 - roadmapLayout.tasks.height / 2 },
    };
  });
  const middleY = roadmapLayout.top + roadmapLayout.subfeatures.height / 2 + Math.max(0, count - 1) * roadmapLayout.rowGap / 2;
  return { root: { x: roadmapLayout.root.x, y: middleY - roadmapLayout.root.height / 2 }, rows };
}
