import { NextResponse } from "next/server";

/** Healthcheck liveness para proxy (Nginx) e monitorização. Sem dependência de DB. */
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: "atelierhub",
      time: new Date().toISOString(),
    },
    { status: 200 },
  );
}
