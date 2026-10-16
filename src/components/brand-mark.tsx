import type { SVGProps } from "react";
import { BRAND_MARK_COLOR, BRAND_MARK_PATH, BRAND_MARK_VIEW_BOX } from "@/lib/brand-mark";

export function BrandMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={BRAND_MARK_VIEW_BOX}
      width="30"
      height="21"
      fill={BRAND_MARK_COLOR}
      aria-hidden="true"
      focusable="false"
      data-brand-mark="scratch-agent"
      {...props}
    >
      <path d={BRAND_MARK_PATH} />
    </svg>
  );
}
