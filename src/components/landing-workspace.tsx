"use client";

import { useEffect, useId, useReducer, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, ChevronRight, Circle, FileText, Folder, GitBranch, ListChecks, Map, Minus, Pause, Play, RotateCcw, Search, Terminal, X } from "lucide-react";
import demo from "@/lib/demo-futsalgo.json";
import { workspaceCopy } from "@/lib/copy-workspace";
import styles from "./landing-workspace.module.css";

type Tab = "roadmap" | "prd" | "tasks";
type Stage = "ready" | "working" | "checkpoint" | "failed" | "finished";
type State = { feature: number; cursor: number; stage: Stage; playing: boolean; inspected: number; command: string };
type Action = { type: "step" | "play" | "reset" | "fail" | "retry" } | { type: "feature" | "inspect"; index: number };
const order: Record<string, number> = { frontend: 0, backend: 1, qa: 2 };
// Use one real sub-feature per session to keep the landing-page demo short.
const sessions = demo.features.map(feature => ({
  ...feature,
  tasks: [...feature.subFeatures[0].tasks].sort((a, b) => a.phase - b.phase || order[a.layer] - order[b.layer] || a.ref.localeCompare(b.ref)),
}));
const initial: State = { feature: 0, cursor: 0, stage: "ready", playing: true, inspected: 0, command: "scratch-agent task next --plan demo --json" };

function reducer(state: State, action: Action): State {
  const tasks = sessions[state.feature].tasks;
  const task = tasks[state.cursor];
  if (action.type === "feature") return { ...initial, feature: action.index, playing: state.playing };
  if (action.type === "inspect") return { ...state, inspected: action.index };
  if (action.type === "reset") return { ...initial, feature: state.feature, playing: true };
  if (action.type === "play") {
    if (state.stage === "finished") return { ...initial, feature: state.feature, playing: true };
    if (state.stage === "failed") return state;
    return { ...state, playing: !state.playing };
  }
  if (action.type === "fail" && state.stage === "working") return { ...state, stage: "failed", playing: false, command: `scratch-agent task fail ${task.ref} "Simulasi kegagalan"` };
  if (action.type === "retry" && state.stage === "failed") return { ...state, stage: "ready", playing: true, command: `scratch-agent task retry ${task.ref}` };
  if (action.type !== "step") return state;
  if (state.stage === "finished") return { ...initial, feature: state.feature, playing: true };
  if (state.stage === "checkpoint") return { ...state, stage: "ready", command: "scratch-agent task next --plan demo --json" };
  if (state.stage === "ready") return { ...state, stage: "working", inspected: state.cursor, command: `scratch-agent task start ${task.ref}` };
  const next = tasks[state.cursor + 1];
  const checkpoint = next && (next.layer !== task.layer || next.phase !== task.phase);
  return { ...state, cursor: state.cursor + 1, inspected: next ? state.cursor + 1 : state.cursor,
    stage: !next ? "finished" : checkpoint ? "checkpoint" : "ready",
    playing: state.playing,
    command: `scratch-agent task complete ${task.ref}` };
}

export function LandingWorkspace({ lang = "id" }: { lang?: "id" | "en" }) {
  const en = lang === "en";
  const w = workspaceCopy(lang);
  const [state, dispatch] = useReducer(reducer, initial);
  const [tab, setTab] = useState<Tab>("roadmap");
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [visible, setVisible] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const root = useRef<HTMLElement>(null);
  const id = useId();
  const session = sessions[state.feature];
  const task = session.tasks[state.cursor];
  const inspected = session.tasks[state.inspected];
  const done = Math.min(state.cursor, session.tasks.length);
  const matching = sessions.map((item, index) => ({ item, index })).filter(({ item }) => item.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const tabs = [{ id: "roadmap" as const, label: "Roadmap", icon: Map }, { id: "prd" as const, label: "PRD", icon: FileText }, { id: "tasks" as const, label: "Tasks", icon: ListChecks }];
  const label = (id: string, english: string) => en ? english : id;
  const status = state.stage === "working" ? "in_progress" : state.stage === "failed" ? "failed" : state.stage === "finished" ? "done" : "pending";

  useEffect(() => {
    if (!root.current) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.1 });
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const sync = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);
  useEffect(() => {
    if (!state.playing || !visible || !pageVisible || collapsed) return;
    let delay = 1200;
    if (state.stage === "working") delay = 2000;
    else if (state.stage === "checkpoint") delay = 1800;
    else if (state.stage === "finished") delay = 2800;
    const timer = window.setTimeout(() => {
      if (state.stage === "finished") {
        dispatch({ type: "reset" });
      } else {
        dispatch({ type: "step" });
      }
    }, delay);
    return () => window.clearTimeout(timer);
  }, [state, visible, pageVisible, collapsed]);

  const chooseTab = (value: Tab) => setTab(value);
  const stepLabel = state.stage === "checkpoint" ? label("Lanjutkan setelah review", "Continue after review") : state.stage === "working" ? label("Selesaikan task", "Complete task") : label("Mulai task", "Start task");

  return (
    <section ref={root} className={styles.demo} aria-label={label("Demo interaktif Scratch Agent", "Scratch Agent interactive demo")}>
      <div className={styles.stage}>
        <div className={styles.stageArt} aria-hidden="true">
          <i className={styles.routeOne} />
          <i className={styles.routeTwo} />
          <i className={styles.routeThree} />
          <span className={styles.orbitOne} />
          <span className={styles.orbitTwo} />
          <b className={styles.sparkOne} />
          <b className={styles.sparkTwo} />
          <b className={styles.sparkThree} />
        </div>
        <div className={styles.application}>
          <div className={styles.titlebar}>
            <span className={styles.dots} aria-hidden="true"><i /><i /><i /></span>
            <span className={styles.local}><Folder size={12} /> FutsalGo</span>
            <span className={styles.workspaceName}>Scratch Agent</span>
            <span className={styles.demoBadge}>{label("Demo interaktif", "Interactive demo")}</span>
          </div>
          <div className={styles.appBody}>
            <nav className={styles.rail} aria-label={label("Tampilan demo", "Demo views")}>
              <span className={styles.brand} aria-label="Scratch Agent"><i /><i /><i /></span>
              {tabs.map(({ id: value, icon: Icon, label: title }) => <button key={value} aria-label={title} title={title} aria-pressed={tab === value} onClick={() => chooseTab(value)}><Icon size={18} /></button>)}
              <button className={styles.railBottom} aria-label={label("Buka terminal", "Open terminal")} title="Terminal" onClick={() => { setCollapsed(false); document.getElementById(`${id}-terminal`)?.focus(); }}><Terminal size={18} /></button>
            </nav>
            <aside className={styles.sidebar}>
              <div className={styles.sidebarTitle}><strong>{label("Fitur project", "Project features")}</strong><span>{sessions.length}</span></div>
              <label className={styles.search}><Search size={13} /><input aria-label={w.searchPlaceholder} placeholder={w.searchPlaceholder} value={query} onChange={e => setQuery(e.target.value)} />{query && <button aria-label={label("Hapus pencarian", "Clear search")} onClick={() => setQuery("")}><X size={12} /></button>}</label>
              <p className={styles.folder}><Folder size={12} /> FutsalGo / {w.breadcrumbWorkPlan}</p>
              <div className={styles.sessionList}>
                {matching.map(({ item, index }) => <button key={item.slug} className={styles.session} aria-pressed={state.feature === index} onClick={() => dispatch({ type: "feature", index })}>
                  <span className={styles.sessionMeta}>{w.phaseLabel} {index + 1}<span>{item.subFeatures.length} {w.tasksCount}</span></span>
                  <strong>{item.title}</strong>
                  <span className={styles.sessionMeta}>{state.feature === index ? <><span className={styles.activeDot} /> {w.sessionSelected}</> : w.viewPlan}</span>
                </button>)}
                {matching.length === 0 && <p className={styles.empty}>{label("Fitur tidak ditemukan. Coba kata lain.", "No features found. Try another search.")}</p>}
              </div>
              <Link className={styles.openPlan} href="/project/demo">{label("Buka plan lengkap", "Open full plan")}<ArrowUpRight size={13} /></Link>
            </aside>
            <div className={styles.workarea}>
              <div className={styles.tabs} role="tablist" aria-label={label("Dokumen project", "Project documents")}>
                {tabs.map(({ id: value, icon: Icon, label: title }, index) => <button key={value} id={`${id}-${value}`} role="tab" aria-selected={tab === value} aria-controls={`${id}-panel`} tabIndex={tab === value ? 0 : -1} onClick={() => chooseTab(value)} onKeyDown={e => {
                  const next = e.key === "ArrowRight" ? (index + 1) % tabs.length : e.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : -1;
                  if (next >= 0) { e.preventDefault(); chooseTab(tabs[next].id); document.getElementById(`${id}-${tabs[next].id}`)?.focus(); }
                }}><Icon size={13} />{title}</button>)}
              </div>
              <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${tab}`} tabIndex={0} className={styles.editor}>
                <div className={styles.breadcrumb}>FutsalGo <ChevronRight size={12} /> {tab === "roadmap" ? "roadmap.md" : tab === "prd" ? "requirements.md" : "tasks.md"}</div>
                {tab === "roadmap" && <>
                  <p className={styles.overline}>{w.roadspaceTabTitle}</p><h3>{session.title}</h3>
                  <p className={styles.note}>{en ? "Feature roadmap → sub-feature PRD → ordered agent tasks." : "Rintisan fitur → PRD sub-fitur → task terurut buat agent."}</p>
                  <div className={styles.tree}><div className={styles.treeRoot}><Folder size={15} />FutsalGo</div><div className={styles.treeBranch}><strong>{session.title}</strong>{session.subFeatures.map((sub, index) => <details key={sub.title} open={index === 0}><summary>{sub.title}<span>{sub.tasks.length} tasks</span></summary><ul>{sub.tasks.map(item => <li key={item.ref}><code>{item.ref}</code>{item.title.replace("[BLOCKER] ", "")}</li>)}</ul></details>)}</div></div>
                </>}
                {tab === "prd" && <>
                  <p className={styles.overline}>PRODUCT REQUIREMENTS</p>
                  <h3>{session.title}</h3>
                  <p className={styles.description}>{session.description}</p>
                  <div className={styles.divider} />
                  <h4>{label("Selesai bila", "Acceptance criteria")}</h4>
                  <ul className={styles.criteria}>{session.selesaiBila.slice(0, 3).map(criterion => <li key={criterion}><Check size={13} />{criterion}</li>)}</ul>
                  <h4>{label("Dari spesifikasi ke eksekusi", "From specification to execution")}</h4>
                  <p className={styles.note}>{label("Setiap task punya referensi, layer, fase, dan dependensi. Agent mengambil satu task per siklus.", "Each task has a reference, layer, phase, and dependencies. The agent picks up one task per cycle.")}</p>
                  <button className={styles.inlineButton} onClick={() => chooseTab("tasks")}><ListChecks size={14} />{label("Lihat task di sesi ini", "View session tasks")}<ChevronRight size={14} /></button>
                </>}
                {tab === "tasks" && <>
                  <p className={styles.overline}>{label("ANTRIAN EKSEKUSI", "EXECUTION QUEUE")}</p>
                  <h3>{session.subFeatures[0].title}</h3>
                  <p className={styles.note}>{label("Cuplikan task dari plan FutsalGo. Klik untuk melihat detail.", "A task excerpt from the FutsalGo plan. Select a task for details.")}</p>
                  <div className={styles.taskList}>{session.tasks.map((item, index) => <button key={item.ref} aria-pressed={state.inspected === index} className={styles.task} onClick={() => dispatch({ type: "inspect", index })}>
                    <span className={index < done ? styles.completeIcon : styles.taskIcon}>{index < done ? <Check size={14} /> : index === state.cursor && state.stage === "working" ? <Play size={12} /> : <Circle size={13} />}</span>
                    <span><span className={styles.taskMeta}>{item.ref}<span>{item.layer}</span></span><strong>{item.title.replace("[BLOCKER] ", "")}</strong></span>
                  </button>)}</div>
                  <div className={styles.inspector}><span>{inspected.ref} · {inspected.layer} · {label("Fase", "Phase")} {inspected.phase}</span><p>{inspected.title}</p><span>{label("Dependensi", "Dependencies")}: {inspected.deps.length ? inspected.deps.join(", ") : label("Tidak ada", "None")}</span></div>
                </>}
              </div>
              <div className={styles.appStatus}><span><GitBranch size={11} /> FutsalGo</span><span>{done}/{session.tasks.length} {label("task sesi selesai", "session tasks complete")}</span></div>
            </div>
            <aside className={styles.planOutline}><div><GitBranch size={13} /> {label("Konteks agent", "Agent context")}</div><p>FutsalGo</p><span>Roadmap › PRD › Task</span><hr /><span>{label("Sub-fitur aktif", "Active sub-feature")}</span><p>{session.subFeatures[0].title}</p><span>{label("Urutan layer", "Layer order")}</span><p>Frontend<br />Backend<br />QA</p></aside>
          </div>
        </div>

        <div className={`${styles.terminal} ${collapsed ? styles.collapsed : ""}`}>
          <div className={styles.terminalBar}><span className={styles.dots} aria-hidden="true"><i /><i /><i /></span><span>Terminal · scratch-agent</span><button aria-label={collapsed ? label("Buka terminal", "Expand terminal") : label("Minimalkan terminal", "Minimize terminal")} aria-expanded={!collapsed} aria-controls={`${id}-terminal-body`} onClick={() => setCollapsed(value => !value)}>{collapsed ? <Terminal size={14} /> : <Minus size={16} />}</button></div>
          <div id={`${id}-terminal-body`} hidden={collapsed}>
            <div className={styles.terminalBody} id={`${id}-terminal`} tabIndex={-1}>
              <p className={styles.terminalIntro}><span className={styles.prompt}>❯</span> scratch-agent <span className={styles.muted}>/ FutsalGo</span></p>
              <p className={styles.muted}>{label("Roadmap › PRD › Task aktif. Satu task per siklus.", "Roadmap › PRD › Tasks active. One task per cycle.")}</p>
              <div className={styles.command}><span>$</span><code>{state.command}</code></div>
              <div className={styles.output} aria-live="polite" aria-atomic="true">
                <p><span>{state.stage === "finished" ? "✓" : "›"}</span> {state.stage === "finished" ? label("Semua task di sesi demo selesai.", "All demo session tasks completed.") : task.ref}</p>
                {task && <p className={styles.taskTitle}>{task.title.replace("[BLOCKER] ", "")}</p>}
                <dl>
                  <div><dt>pipeline</dt><dd>Roadmap › PRD › Task</dd></div>
                  <div><dt>status</dt><dd className={state.stage === "failed" ? styles.error : ""}>{status}</dd></div>
                  <div><dt>layer</dt><dd>{task?.layer ?? "qa"}</dd></div>
                  <div><dt>checkpoint</dt><dd>{String(state.stage === "checkpoint")}</dd></div>
                </dl>
              </div>
              <div className={styles.progress}><span style={{ width: `${done / session.tasks.length * 100}%` }} /><strong>{session.tasks.length - done} {label("task tersisa di sesi demo", "tasks remaining in demo session")}</strong></div>
              <div className={styles.decision}>
                <p>{state.stage === "checkpoint" ? label("Pergantian layer. Review hasil sebelum lanjut.", "Layer change. Review the work before continuing.") : state.stage === "failed" ? label("Task gagal dalam simulasi. Reset task untuk mencoba lagi.", "Simulated task failure. Reset the task to try again.") : state.stage === "finished" ? label("Sesi selesai. Jelajahi fitur lain atau ulangi demo.", "Session complete. Explore another feature or replay.") : state.stage === "working" ? label("Agent sedang mengerjakan task ini…", "The agent is working on this task…") : label("Jalankan task berikutnya?", "Run the next task?")}</p>
                {state.stage === "finished" ? <button className={styles.terminalAction} onClick={() => dispatch({ type: "reset" })}><RotateCcw size={14} />{label("Ulangi sesi", "Replay session")}</button> : state.stage === "failed" ? <button className={styles.terminalAction} onClick={() => dispatch({ type: "retry" })}><RotateCcw size={14} />{label("Retry task", "Retry task")}</button> : <button className={styles.terminalAction} onClick={() => dispatch({ type: "step" })}><ChevronRight size={16} />{stepLabel}</button>}
                {state.stage === "working" && <button className={styles.failureButton} onClick={() => dispatch({ type: "fail" })}>{label("Simulasikan gagal", "Simulate failure")}</button>}
              </div>
            </div>
            <div className={styles.terminalFooter}><span>{label("Simulasi lokal · tanpa menjalankan kode", "Local simulation · no code execution")}</span><div><button aria-label={label("Reset demo", "Reset demo")} title={label("Reset demo", "Reset demo")} onClick={() => dispatch({ type: "reset" })}><RotateCcw size={15} /></button><button className={styles.playButton} disabled={state.stage === "checkpoint" || state.stage === "failed"} aria-label={state.playing ? label("Jeda demo", "Pause demo") : label("Putar demo", "Play demo")} title={state.playing ? label("Jeda demo", "Pause demo") : label("Putar demo", "Play demo")} onClick={() => dispatch({ type: "play" })}>{state.playing ? <Pause size={16} /> : <Play size={16} />}</button></div></div>
          </div>
        </div>
      </div>
      <p className={styles.caption}>{label("Coba sendiri: pilih fitur, buka PRD, lalu jalankan task di terminal.", "Try it: choose a feature, read the PRD, then run a task in the terminal.")} <Link href="/project/demo">{label("Lihat plan FutsalGo", "View the FutsalGo plan")}</Link></p>
    </section>
  );
}
