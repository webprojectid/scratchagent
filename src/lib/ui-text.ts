"use client";
import { getLang, useLang, type Lang } from "./lang";
import { translateUi, translateActivityTitle } from "./ui-messages";
export { translateUi } from "./ui-messages";
export function uiText(text: string, ...values: (string | number | undefined | null)[]): string {
  return translateUi(text, getLang(), ...values);
}
export function activityTitle(text: string) { return translateActivityTitle(text, getLang()); }
export function useUiLanguage() { return useLang(); }
export function dateLocale(language: Lang) { return language === "en" ? "en-US" : "id-ID"; }
export function uiLocale() { return dateLocale(getLang()); }
