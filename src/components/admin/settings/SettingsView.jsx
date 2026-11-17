import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useStaffContext } from "@/hooks/useStaffContext";
import PageHeader from "@/components/admin/PageHeader";
import SettingsForm from "@/components/admin/settings/SettingsForm";
import RetentionTools from "@/components/admin/settings/RetentionTools";

export default function SettingsView() {
  const queryClient = useQueryClient();
  const { data: staff } = useStaffContext();
  const canWrite = !!staff?.canWrite;

  const { data: settings, isLoading } = useQuery({
    queryKey: ["library-settings"],
    queryFn: async () => {
      const page = await base44.entities.Settings.list({ sort: "-updated_date", limit: 1 });
      return page?.items?.[0] ?? null;
    },
  });

  const { data: demoCount = 0 } = useQuery({
    queryKey: ["demo-count"],
    queryFn: () => base44.entities.Visit.count({ is_demo: true }),
  });

  return (
    <>
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        subtitle="Company branding, kiosk behaviour and privacy rules for the visitor log book."
      />

      {isLoading ? (
        <div className="space-y-4">
          <div className="emf-skel h-[420px]" />
          <div className="emf-skel h-40" />
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          <SettingsForm
            settings={settings}
            canWrite={canWrite}
            onSaved={() => {
              queryClient.invalidateQueries({ queryKey: ["library-settings"] });
              queryClient.invalidateQueries({ queryKey: ["kiosk-data"] });
            }}
          />
          <RetentionTools
            settings={settings}
            demoCount={demoCount}
            canWrite={canWrite}
            isSuperAdmin={!!staff?.isSuperAdmin}
          />
        </div>
      )}
    </>
  );
}