import type { Plan } from "./types";
import demoJson from "./demo-futsalgo.json";

/**
 * Plan demo: FutsalGo, aplikasi booking lapangan futsal.
 * Dipakai saat planId "demo" diminta: /project/demo dan /project/demo/prd.
 *
 * Kenapa FutsalGo: proyek multi modul nyata (auth, booking, payment, notifikasi)
 * dengan arsitektur dan database schema yang tampil utuh sebagai marketing.
 * Sumber: plan e146017e-19ea-45de-bf03-c75a4051a660, status di reset ke fresh
 * lewat scripts/build-demo-futsalgo.mjs.
 */
export const demoPlan = demoJson as unknown as Plan;
