import { NextResponse } from "next/server";
import { TaskConflict } from "./tasks";
export async function taskResponse(action: () => Promise<Response>): Promise<Response> {
  try { return await action(); } catch (error) {
    if (error instanceof TaskConflict) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("[task mutation]", error);
    return NextResponse.json({ error: "Task could not be updated. Please try again." }, { status: 503 });
  }
}
