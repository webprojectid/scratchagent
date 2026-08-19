"use client";

import {
  Search, Settings, Grid2X2, MessageCircle, ChevronDown, Phone,
  ListChecks, Mail, Folder, CalendarDays, Play, Volume2, ArrowLeft,
  Video, StickyNote, CheckSquare, MoreHorizontal, UserRound, Plus,
} from "lucide-react";
import { SafariFrame } from "@/components/ui/safari-browser-frame";

const orange = "#f26a2e";

function Mark({ small = false }: { small?: boolean }) {
  return (
    <span className={`relative inline-block shrink-0 ${small ? "h-5 w-5" : "h-7 w-7"}`}>
      <span className="absolute left-[15%] top-[8%] h-[72%] w-[34%] -skew-x-[24deg] rounded-[2px] bg-[#ff7138]" />
      <span className="absolute right-[12%] top-[22%] h-[64%] w-[34%] -skew-x-[24deg] rounded-[2px] bg-[#e85022]" />
      <span className="absolute bottom-[4%] left-[27%] h-[25%] w-[48%] -skew-x-[24deg] rounded-[2px] bg-[#ff9a63]" />
    </span>
  );
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="relative min-h-[64px] rounded-[7px] border border-[#e8e4de] bg-white p-2.5 shadow-[0_2px_8px_rgba(39,34,27,.04)]">
      <Mark small />
      <p className="mt-1.5 text-[18px] font-semibold leading-none text-[#272522]">{value}</p>
      <p className="mt-1 text-[10px] text-[#8d8982]">{label}</p>
    </div>
  );
}

function TaskProgress({ icon, title, done, total, width }: { icon: React.ReactNode; title: string; done: number; total: number; width: string }) {
  return (
    <div className="py-2.5">
      <div className="flex items-center gap-2.5">
        <span className="grid size-7 place-items-center rounded-full bg-[#fff1ea] text-[#e96029]">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-[#35322e]">{title}</p>
            <p className="text-[9px] text-[#99938c]">{done} of {total} completed</p>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#ebe8e3]">
            <div className="h-full rounded-full bg-[#ea5a32]" style={{ width }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityIcon({ type }: { type: "deal" | "call" | "meeting" | "email" }) {
  const Icon = type === "deal" ? Folder : type === "call" ? Phone : type === "meeting" ? CalendarDays : Mail;
  return <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#fff1e9] text-[#ef6b31]"><Icon size={13} /></span>;
}

function FeedRow({ type, children, time }: { type: "deal" | "call" | "meeting" | "email"; children: React.ReactNode; time: string }) {
  return (
    <div className="relative flex gap-3 py-3.5">
      <ActivityIcon type={type} />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] leading-[1.55] text-[#4c4944]">{children}</p>
        <p className="mt-1 text-[8px] text-[#aaa49d]">{time}</p>
      </div>
    </div>
  );
}

function Action({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="grid size-8 place-items-center rounded-full border border-[#e5e0da] bg-white text-[#67615b]">{icon}</span>
      <span className="text-[8px] text-[#857f78]">{label}</span>
    </div>
  );
}

function DetailRow({ label, value, dropdown }: { label: string; value: string; dropdown?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-[#eeeae5] py-3">
      <span className="text-[9px] text-[#9a948d]">{label}</span>
      <span className="flex items-center gap-1 text-[10px] font-medium text-[#48443f]">{value}{dropdown && <ChevronDown size={10} />}</span>
    </div>
  );
}

export function CaleidoCrmDashboard() {
  return (
    <div className="flex h-full min-h-[660px] w-full flex-col overflow-hidden bg-[#f7f5f1] font-sans text-[#292623]">
      {/* top navigation */}
      <header className="flex h-[58px] shrink-0 items-center border-b border-[#e5e1db] bg-white px-5">
        <div className="flex w-[252px] items-center gap-2">
          <Mark />
          <span className="text-[19px] font-semibold tracking-[-.04em]">Caleido</span>
        </div>
        <nav className="flex flex-1 items-center justify-center gap-7 text-[11px] font-medium text-[#55514d]">
          {['Marketing','Contacts','Estimates'].map(x => <span key={x} className="flex items-center gap-1">{x}<ChevronDown size={10}/></span>)}
          <span>Sales</span><span>Reports</span>
        </nav>
        <div className="flex w-[280px] items-center justify-end gap-4 text-[#716c66]">
          <Search size={14}/><Settings size={14}/><Grid2X2 size={14}/><MessageCircle size={14}/>
          <div className="h-5 w-px bg-[#e5e0da]" />
          <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face" alt="" className="size-8 rounded-full object-cover" />
          <span className="text-[10px] font-medium text-[#3d3935]">Dulce Culhane</span><ChevronDown size={10}/>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[255px_minmax(410px,1fr)_285px]">
        {/* left */}
        <aside className="overflow-y-auto border-r border-[#e6e2dc] bg-[#faf9f6] px-4 py-3 [&::-webkit-scrollbar]:hidden">
          <p className="text-[8px] font-semibold uppercase tracking-[.16em] text-[#a09a93]">Welcome back,</p>
          <div className="mt-1 text-[22px] font-semibold leading-[1.1] tracking-[-.04em] text-[#292623]">Dulce Culhane</div>
          <p className="mt-2 max-w-[220px] text-[9px] leading-[1.55] text-[#9a948d]">Track the entire history associated with the client and project here.</p>

          <div className="mt-3 grid grid-cols-2 gap-1.5">
            <StatCard value={7} label="Appointment"/><StatCard value={2} label="Qualified"/>
            <StatCard value={18} label="Presentation"/><StatCard value={4} label="Proposal"/>
            <StatCard value={7} label="Closed Won"/><StatCard value={3} label="Closed Lost"/>
          </div>

          <div className="mt-3 text-[13px] font-semibold leading-tight tracking-[-.02em]">Tasks due today</div>
          <div className="mt-2 divide-y divide-[#ebe7e2]">
            <TaskProgress icon={<Phone size={12}/>} title="Calls" done={5} total={10} width="50%"/>
            <TaskProgress icon={<ListChecks size={12}/>} title="To-do" done={12} total={42} width="29%"/>
            <TaskProgress icon={<Mail size={12}/>} title="Emails" done={10} total={12} width="83%"/>
          </div>
        </aside>

        {/* center */}
        <main className="min-w-0 overflow-y-auto bg-white [&::-webkit-scrollbar]:hidden">
          <div className="relative m-4 h-[118px] overflow-hidden rounded-[9px] bg-[linear-gradient(135deg,#ff8a45_0%,#e84b20_55%,#bd2815_100%)]">
            <div className="absolute inset-0 opacity-20" style={{backgroundImage:'linear-gradient(rgba(255,255,255,.25) 1px, transparent 1px),linear-gradient(90deg,rgba(255,255,255,.25) 1px,transparent 1px)',backgroundSize:'34px 34px',transform:'skewY(-7deg) scale(1.2)'}}/>
            <div className="absolute inset-0 flex items-center justify-center gap-2 text-white"><Mark/><span className="text-[22px] font-semibold tracking-[-.04em]">Caleido</span></div>
          </div>

          <div className="sticky top-0 z-10 flex items-center border-b border-[#ece8e3] bg-white px-4">
            {['Activity','Notes','Emails','Calls','Tasks','Meetings'].map((tab,i)=><button key={tab} className={`relative px-3 py-3 text-[10px] ${i===0?'font-semibold text-[#ed642d]':'text-[#8b857e]'}`}>{tab}{tab==='Notes'&&<b className="ml-1 rounded-full bg-[#ef5c37] px-1 text-[7px] text-white">12</b>}{tab==='Calls'&&<b className="ml-1 rounded-full bg-[#ef5c37] px-1 text-[7px] text-white">1</b>}{i===0&&<span className="absolute inset-x-2 bottom-0 h-[2px] bg-[#ed642d]"/>}</button>)}
            <span className="ml-auto flex items-center gap-1 text-[9px] text-[#918b84]">Filter by: <b className="font-medium text-[#55504b]">Recent</b><ChevronDown size={9}/></span>
          </div>

          <div className="relative px-6 pb-8">
            <div className="absolute bottom-8 left-[39px] top-4 w-px bg-[#eee9e4]"/>
            <FeedRow type="deal" time="Nov 01, 23 at 2:34pm UTC"><b>John Smith</b> moved deal from <b>Needs Analysis</b> to <b>Value Proposition.</b></FeedRow>

            <div className="relative flex gap-3 py-2">
              <ActivityIcon type="call"/>
              <div className="min-w-0 flex-1 rounded-[8px] border border-[#f28a5d] bg-[#fffaf7] p-3 shadow-[0_6px_20px_rgba(238,100,45,.08)]">
                <div className="flex justify-between"><div><p className="text-[11px] font-semibold text-[#38342f]">Your meeting recording is ready!</p><p className="mt-1 text-[9px] text-[#817a73]"><b>John Smith</b> made a call to <b>Kathryn Ono.</b> <span className="text-[#ef642d]">View meeting</span></p></div><MoreHorizontal size={13} className="text-[#aaa39c]"/></div>
                <p className="mt-1 text-[8px] text-[#aaa49d]">Oct 21, 23 at 5:11pm UTC</p>
                <div className="mt-3 flex items-center gap-2 rounded-[6px] border border-[#eee7e1] bg-white px-2 py-2">
                  <span className="grid size-7 place-items-center rounded-full bg-[#ef672f] text-white"><Play size={10} fill="white"/></span>
                  <span className="text-[8px] text-[#948d86]">0:00</span>
                  <div className="flex h-6 flex-1 items-center gap-[2px] overflow-hidden">{Array.from({length:54}).map((_,i)=><span key={i} className="w-[2px] rounded-full bg-[#e4c6b8]" style={{height:`${5+((i*7)%17)}px`}}/>)}</div>
                  <span className="text-[8px] text-[#948d86]">3:42</span><Volume2 size={11} className="text-[#8b847d]"/>
                </div>
              </div>
            </div>

            <FeedRow type="meeting" time="Oct 17, 23 at 1:53pm UTC"><b>John Smith</b> scheduled a meeting with <b>Kathryn Ono.</b></FeedRow>
            <FeedRow type="email" time="Oct 08, 23 at 2:01pm UTC"><b>John Smith</b> sent an email to <b>Lora Palmer.</b></FeedRow>
            <FeedRow type="deal" time="Oct 04, 23 at 2:34pm UTC"><b>John Smith</b> moved deal from <b>Needs Analysis</b> to <b>Value Proposition.</b></FeedRow>
          </div>
        </main>

        {/* right */}
        <aside className="relative overflow-y-auto border-l border-[#e6e2dc] bg-[#faf9f7] px-5 py-4 [&::-webkit-scrollbar]:hidden">
          <button className="flex items-center gap-2 text-[10px] font-semibold text-[#57524c]"><ArrowLeft size={12}/>Close Details</button>
          <div className="mt-5 text-center">
            <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=140&h=140&fit=crop&crop=face" alt="John Smith" className="mx-auto size-16 rounded-full object-cover ring-4 ring-white shadow-md"/>
            <p className="mt-3 text-[9px] text-[#9a948d]">Sales Executive</p>
            <div className="mt-1 text-[18px] font-semibold leading-tight tracking-[-.03em]">John Smith</div>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#eaf7ec] px-2.5 py-1 text-[8px] font-medium text-[#4b985a]"><span className="size-1.5 rounded-full bg-[#4caf64]"/>Available Today</span>
          </div>

          <div className="mt-5 flex justify-between">
            <Action icon={<Video size={12}/>} label="Meeting"/><Action icon={<StickyNote size={12}/>} label="Note"/><Action icon={<Mail size={12}/>} label="Email"/><Action icon={<Phone size={12}/>} label="Call"/><Action icon={<CheckSquare size={12}/>} label="Task"/>
          </div>

          <div className="mt-6 text-[12px] font-semibold leading-tight">Meeting details</div>
          <div className="mt-2">
            <DetailRow label="Deal owner" value="Kathryn Ono"/>
            <DetailRow label="Last activity" value="Nov 01 at 2:34pm UTC"/>
            <DetailRow label="Amount" value="13,000$"/>
            <DetailRow label="Close date" value="12/17/2023"/>
            <DetailRow label="Stage" value="Value proposition" dropdown/>
            <DetailRow label="Pipeline" value="Removal Sales" dropdown/>
          </div>

          <button className="absolute bottom-5 right-5 grid size-11 place-items-center rounded-full bg-[#ef672f] shadow-[0_8px_25px_rgba(239,103,47,.35)]"><Mark small/></button>
        </aside>
      </div>
    </div>
  );
}

export function DemoOne() {
  return <SafariFrame url="caleido.app/dashboard" ratio="desktop"><CaleidoCrmDashboard/></SafariFrame>;
}
