"use client";

import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import * as THREE from "three";

type DottedSurfaceProps = Omit<React.ComponentProps<"div">, "ref"> & { size?: number; opacity?: number; sizeAttenuation?: boolean; vertexColors?: boolean };

export default function DottedSurface({ className, size = 7, opacity = .62, sizeAttenuation = true, vertexColors = true, ...props }: DottedSurfaceProps) {
  const { theme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 1, 10000);
    camera.position.set(0, 355, 1220);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setSize(innerWidth, innerHeight); renderer.setClearColor(0, 0); container.appendChild(renderer.domElement);
    const geometry = new THREE.BufferGeometry(); const positions: number[] = []; const colors: number[] = []; const amountX = 56; const amountY = 72; const separation = 115; const tone = theme === "light" ? .18 : .9;
    for (let ix = 0; ix < amountX; ix++) for (let iy = 0; iy < amountY; iy++) { positions.push(ix * separation - amountX * separation / 2, 0, iy * separation - amountY * separation / 2); colors.push(tone, tone, tone); }
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({ size, vertexColors, color: theme === "light" ? 0 : 0xB8C1CB, transparent: true, opacity, sizeAttenuation }); const points = new THREE.Points(geometry, material); scene.add(points);
    let count = 0; let animationId = 0;
    const animate = () => { animationId = requestAnimationFrame(animate); const array = geometry.attributes.position.array as Float32Array; let i = 0; for (let ix = 0; ix < amountX; ix++) for (let iy = 0; iy < amountY; iy++) { const index = i * 3; array[index + 1] = Math.sin((ix + count) * .3) * 50 + Math.sin((iy + count) * .5) * 50; i++; } geometry.attributes.position.needsUpdate = true; renderer.render(scene, camera); count += .1; };
    const resize = () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); }; addEventListener("resize", resize); animate();
    return () => { removeEventListener("resize", resize); cancelAnimationFrame(animationId); geometry.dispose(); material.dispose(); renderer.dispose(); if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement); };
  }, [theme, size, opacity, sizeAttenuation, vertexColors]);
  return <div ref={ref} className={cn("pointer-events-none fixed inset-0 z-[-1]", className)} {...props} />;
}
