import { Bot } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { AiPromptsForm } from "@/features/admin/components/ai-prompts-form";
import { AiProviderForm } from "@/features/admin/components/ai-provider-form";
import { AiSwitchForm } from "@/features/admin/components/ai-switch-form";
import { AI_PROVIDERS } from "@/lib/settings/schemas";
import { aiSettings, requireAdmin } from "@/server/services/admin";

export const metadata: Metadata = { title: "AI · Admin" };

/**
 * Super admins only: whether AI runs at all, which model and key it uses, and what each
 * task tells the model. Nothing on this page sends the saved key back to the browser.
 */
export default async function AdminAi() {
  await requireAdmin("ai");
  const view = await aiSettings.view();
  const status = !view.enabled
    ? "AI is off. Syllabuses are read by their headings and lists."
    : view.missing
      ? `AI is on, but not set up: ${view.missing} Until then syllabuses are still read by their headings and lists.`
      : view.jobs.syllabus
        ? `AI is on. Syllabuses are read by ${view.provider.model} (${AI_PROVIDERS[view.provider.kind].label}).`
        : "AI is on, but reading syllabuses is switched off below.";

  return (
    <>
      <PageHeader
        title="AI"
        description="Optional. The app works fully with AI off; turn it on when a model and key are ready."
      />
      <p
        role="status"
        className="mb-4 flex items-start gap-3 rounded-card border border-border bg-surface-muted p-4 text-body"
      >
        <Bot className="mt-0.5 size-5 shrink-0 text-ink-muted" aria-hidden />
        <span>
          {status}{" "}
          <Link href="/admin/jobs" className="text-accent-ink hover:underline">
            See costs under Jobs and AI
          </Link>
          .
        </span>
      </p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AiSwitchForm initial={{ enabled: view.enabled, jobs: view.jobs }} />
        <AiProviderForm
          initial={view.provider}
          canStoreKeys={view.canStoreKeys}
        />
        <div className="lg:col-span-2">
          <AiPromptsForm prompts={view.prompts} />
        </div>
      </div>
    </>
  );
}
