import { Link, useNavigate } from "@tanstack/react-router";
import { Download, ExternalLink, Plus } from "lucide-react";
import { useState } from "react";
import { fetchAllVisits } from "@/lib/visitQuery";
import { EXPORT_COLUMNS } from "@/lib/visitColumns";
import { downloadCsv } from "@/lib/exporters";
import { recordAudit } from "@/lib/admin-fns";
import { todayISO } from "@/lib/kioskFormat";
import { useDashboardQuery } from "@/hooks/useVisitMutations";
import { useStaffContext } from "@/hooks/useStaffContext";
import PageHeader from "@/components/admin/PageHeader";
import StatCard from "@/components/admin/StatCard";
import VisitsPerDayChart from "@/components/admin/dashboard/VisitsPerDayChart";
import VisitsByReasonChart from "@/components/admin/dashboard/VisitsByReasonChart";
import BusyHoursHeatmap from "@/components/admin/dashboard/BusyHoursHeatmap";
import VisitorMix from "@/components/admin/dashboard/VisitorMix";
import LiveFeed from "@/components/admin/dashboard/LiveFeed";

function dashSubtitle(staff) {
  return staff?.isSuperAdmin ? "Live footfall across all sites." : `Live footfall at the ${staff?.branch ?? ""} site.`;
}

function pct(now, before) {
  if (!before) return now > 0 ? 100 : 0;
  return Math.round(((now - before) / before) * 100);
}

export default function DashboardView() {
  const { data, isLoading } = useDashboardQuery();
  const { data: staff } = useStaffContext();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const kpis = data?.kpis;

  async function exportToday() {
    setExporting(true);
    try {
      const today = todayISO();
      const rows = await fetchAllVisits({ visit_date: today }, "-created_date");
      downloadCsv(`emfuleni-visits-${today}.csv`, rows, EXPORT_COLUMNS);
      await recordAudit({
        data: { action: "export", entity: "Visit", summary: `Exported ${rows.length} visits for ${today} (CSV)` },
      }).catch(() => {});
    } finally {
      setExporting(false);
    }
  }

  if (isLoading || !data) {
    return (
      <>
        <PageHeader eyebrow="Portal" title="Dashboard" subtitle={dashSubtitle(staff)} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="emf-skel h-32" />
          ))}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="emf-skel h-72" />
          <div className="emf-skel h-72" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Portal" title="Dashboard" subtitle={dashSubtitle(staff)}>
        <button
          type="button"
          onClick={exportToday}
          disabled={exporting}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--line)] px-4 text-[13.5px] font-semibold text-[var(--ink)] transition hover:bg-[var(--field)] disabled:opacity-60"
        >
          <Download className="h-4 w-4" /> {exporting ? "Exporting…" : "Export today"}
        </button>
        {staff?.canWrite ? (
          <Link
            to="/admin/visits"
            search={{ new: "1" }}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--line)] px-4 text-[13.5px] font-semibold text-[var(--ink)] transition hover:bg-[var(--field)]"
          >
            <Plus className="h-4 w-4" /> Add visit
          </Link>
        ) : null}
        <a
          href="/"
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#0b5ea8,#06335f)] px-4 text-[13.5px] font-semibold text-white transition hover:opacity-95"
        >
          Open kiosk <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Visitors today" value={kpis.today} tone="gold" delta={pct(kpis.today, kpis.yesterday)} />
        <StatCard label="This week" value={kpis.week} delta={pct(kpis.week, kpis.prevWeek)} hint="Last 7 days" />
        <StatCard label="This month" value={kpis.month} hint="Last 30 days" />
        <StatCard label="All time" value={kpis.allTime.toLocaleString("en-ZA")} />
        <StatCard label="Average per day" value={kpis.avgPerDay} hint="Since the first recorded visit" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <VisitsPerDayChart data={data.perDay} />
        <VisitsByReasonChart data={data.perReason} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <BusyHoursHeatmap matrix={data.heatmap} />
        <VisitorMix visitors={data.visitors} />
      </div>

      <div className="mt-4">
        <LiveFeed visits={data.latest} />
      </div>

      <p className="mt-6 text-xs text-[var(--muted)]">
        Records with no visitor names are never created automatically. Use{" "}
        <button type="button" onClick={() => navigate({ to: "/admin/visits" })} className="underline">
          Visits
        </button>{" "}
        to sign someone in on their behalf.
      </p>
    </>
  );
}