import type { Metadata } from "next";

import { PageHeader } from "@/components/shell/page-header";
import { AiSwitchForm } from "@/features/admin/components/ai-switch-form";
import {
  AnnouncementForm,
  FlagsForm,
  MaintenanceForm,
} from "@/features/admin/components/site-forms";
import { canAdmin } from "@/lib/admin/access";
import { requireAdmin } from "@/server/services/admin";
import { loadSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Site · Admin" };

export default async function AdminSettings() {
  const admin = await requireAdmin("settings");
  const settings = await loadSettings(true);
  return (
    <>
      <PageHeader
        title="Site"
        description="Changes apply within 30 seconds, without a restart."
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AnnouncementForm
          initial={
            settings.announcement ?? { active: false, text: "", tone: "info" }
          }
        />
        <MaintenanceForm
          initial={settings.maintenance ?? { on: false, message: "" }}
        />
        <FlagsForm initial={settings.flags ?? {}} />
        {canAdmin(admin.role, "ai") ? (
          <AiSwitchForm initial={settings.ai?.enabled ?? false} />
        ) : null}
      </div>
    </>
  );
}
