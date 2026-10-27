"use client";

import { AnimatePresence, animate, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import styles from "./be-ui-otp-input.module.css";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export type OTPStatus = "idle" | "error" | "success";

export interface OTPInputProps {
  length?: number;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  label?: string;
  hint?: string;
  successMessage?: string;
  errorMessage?: string;
  status?: OTPStatus;
  mask?: boolean;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  name?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  className?: string;
}

function sanitize(raw: string, length: number) {
  return raw.replace(/\D/g, "").slice(0, length);
}

export function OTPInput({
  length = 6, value: controlledValue, defaultValue = "", onChange, onComplete,
  label, hint, successMessage, errorMessage, status = "idle", mask = false,
  disabled = false, required = false, autoFocus = false, name = "code",
  "aria-label": ariaLabel = "One-time passcode",
  "aria-describedby": describedBy, className,
}: OTPInputProps) {
  const uid = useId();
  const reduce = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const slotsRef = useRef<HTMLDivElement>(null);
  const [internalValue, setInternalValue] = useState(() => sanitize(defaultValue, length));
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const value = sanitize(controlledValue ?? internalValue, length);
  const success = status === "success";
  const message = success ? successMessage : status === "error" ? errorMessage : hint;
  const messageId = message ? `${uid}-message` : undefined;

  useEffect(() => {
    if (status !== "error" || reduce || !slotsRef.current) return;
    const animation = animate(slotsRef.current, { x: [0, -5, 5, -3, 3, -1, 0] }, { duration: 0.45, ease: EASE_OUT });
    return () => animation.stop();
  }, [status, reduce]);

  const commit = (next: string) => {
    if (controlledValue === undefined) setInternalValue(next);
    onChange?.(next);
    if (next.length === length && next !== value) onComplete?.(next);
  };

  const updateSelection = (input: HTMLInputElement) => {
    setActive(Math.min(input.selectionStart ?? input.value.length, length - 1));
  };

  return (
    <div className={cn(styles.root, className)} data-status={status} data-disabled={disabled || undefined}>
      {label && <label htmlFor={`${uid}-input`} className={styles.label}>{label}</label>}
      <div className={styles.control} onPointerDown={event => {
        if (disabled) return;
        event.preventDefault();
        const slots = Array.from(slotsRef.current?.children ?? []);
        const index = slots.findIndex(slot => event.clientX < slot.getBoundingClientRect().right);
        const position = Math.min(index < 0 ? length - 1 : index, value.length);
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(position, position);
        setActive(position);
      }}>
        {/* A real, populated input preserves native editing, autofill and form validation. */}
        <input
          ref={inputRef} id={`${uid}-input`} name={name} type="text"
          inputMode="numeric" autoComplete="one-time-code" autoCapitalize="off" spellCheck={false}
          autoFocus={autoFocus} disabled={disabled} required={required}
          aria-label={label ? undefined : ariaLabel} aria-invalid={status === "error"}
          aria-describedby={[describedBy, messageId].filter(Boolean).join(" ") || undefined}
          value={value} maxLength={length} pattern={`[0-9]{${length}}`}
          className={styles.input}
          onChange={event => {
            const input = event.currentTarget;
            const caret = sanitize(input.value.slice(0, input.selectionStart ?? input.value.length), length).length;
            commit(sanitize(input.value, length));
            input.setSelectionRange(caret, caret);
            setActive(Math.min(caret, length - 1));
          }}
          onPaste={event => {
            event.preventDefault();
            const digits = sanitize(event.clipboardData.getData("text"), length);
            if (!digits) return;
            const input = event.currentTarget;
            const start = input.selectionStart ?? value.length;
            const end = input.selectionEnd ?? start;
            // A full code from an email replaces the code, even after partial entry.
            const next = digits.length === length ? digits : sanitize(value.slice(0, start) + digits + value.slice(end), length);
            const caret = digits.length === length ? length : Math.min(start + digits.length, length);
            commit(next);
            requestAnimationFrame(() => input.setSelectionRange(caret, caret));
            setActive(Math.min(caret, length - 1));
          }}
          onSelect={event => updateSelection(event.currentTarget)}
          onFocus={event => { setFocused(true); updateSelection(event.currentTarget); }}
          onBlur={() => setFocused(false)}
        />
        <div ref={slotsRef} className={styles.slots} aria-hidden="true">
          {Array.from({ length }, (_, index) => {
            const char = value[index] ?? "";
            const isActive = focused && index === active && !disabled;
            return <div key={index} className={styles.slot} data-active={isActive || undefined} data-filled={!!char || undefined}>
              {isActive && !success && <motion.span
                className={cn(styles.caret, char && styles.caretAfter)}
                animate={reduce ? undefined : { opacity: [1, 1, 0, 0] }}
                transition={reduce ? undefined : { duration: 1, repeat: Infinity, ease: "linear" }}
              />}
              <AnimatePresence initial={false}>
                {char && <motion.span key={char} className={styles.digit}
                  initial={reduce ? { opacity: 0 } : { y: 14, opacity: 0, filter: "blur(4px)" }}
                  animate={reduce ? { opacity: 1 } : { y: 0, opacity: 1, filter: "blur(0px)" }}
                  exit={reduce ? { opacity: 0 } : { y: -14, opacity: 0, filter: "blur(4px)" }}
                  transition={reduce ? { duration: 0 } : { duration: 0.22, ease: EASE_OUT }}
                >{mask ? "•" : char}</motion.span>}
              </AnimatePresence>
            </div>;
          })}
        </div>
        <AnimatePresence>
          {success && <motion.span className={styles.check} aria-hidden="true"
            initial={reduce ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 28 }}
          ><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <motion.path d="M5 13l4 4L19 7" initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduce ? 0 : 0.35, ease: EASE_OUT }}/>
          </svg></motion.span>}
        </AnimatePresence>
      </div>
      {message && <p id={messageId} className={styles.message} aria-live="polite">{message}</p>}
    </div>
  );
}
