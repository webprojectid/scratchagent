import Image from "next/image";

export function QoderIcon() {
  return (
    <Image
      src="/support-tools/qoder-color.png"
      alt="Qoder"
      width={40}
      height={40}
      className="object-contain"
    />
  );
}
