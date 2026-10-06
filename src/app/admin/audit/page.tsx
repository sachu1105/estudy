import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatWhen } from "@/lib/admin/format";
import { ADMIN_PAGE_SIZE } from "@/server/repositories/admin-repository";
import { adminService, requireAdmin } from "@/server/services/admin";

export const metadata: Metadata = { title: "Audit log · Admin" };

/** Every admin and security event, newest first. The log is append-only (rule 6). */
export default async function AdminAudit({
  searchParams,
}: PageProps<"/admin/audit">) {
  await requireAdmin("audit");
  const query = await searchParams;
  const action =
    typeof query.action === "string" ? query.action.slice(0, 60) : "";
  const page = Math.max(0, Number(query.page) || 0);
  const [entries, total] = await adminService.audit(
    { action: action || undefined },
    page,
  );
  const pages = Math.ceil(total / ADMIN_PAGE_SIZE);
  const href = (p: number) =>
    `/admin/audit?${new URLSearchParams({ ...(action ? { action } : {}), page: String(p) })}`;

  return (
    <>
      <PageHeader
        title="Audit log"
        description={`${total} entries${action ? ` starting with "${action}"` : ""}.`}
      />
      <form className="mb-6 flex gap-2" role="search">
        <Input
          name="action"
          defaultValue={action}
          placeholder="admin.user, auth.login"
          aria-label="Filter by action"
          className="max-w-md"
        />
        <Button type="submit" variant="secondary">
          <Search aria-hidden /> Filter
        </Button>
      </form>
      <ul className="divide-y divide-border rounded-card border border-border bg-surface">
        {entries.map((e) => (
          <li key={e.id} className="flex flex-col gap-1 px-4 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-mono text-small font-medium">
                {e.action}
              </span>
              <span className="text-small text-ink-muted">
                {formatWhen(e.createdAt)}
              </span>
            </div>
            <span className="text-small break-words text-ink-muted">
              {e.actor?.email ?? "system"}
              {e.targetId ? (
                <>
                  {" "}
                  · target{" "}
                  <Link
                    href={`/admin/users/${e.targetId}`}
                    className="font-mono hover:underline"
                  >
                    {e.targetId.slice(0, 8)}
                  </Link>
                </>
              ) : null}
              {e.ip ? ` · ${e.ip}` : ""}
              {Object.keys(e.metadata as object).length
                ? ` · ${JSON.stringify(e.metadata)}`
                : ""}
            </span>
          </li>
        ))}
        {entries.length === 0 ? (
          <li className="px-4 py-3 text-body text-ink-muted">
            Nothing logged{action ? " for that" : ""}.
          </li>
        ) : null}
      </ul>
      {pages > 1 ? (
        <nav
          aria-label="Pages"
          className="mt-4 flex items-center justify-between gap-2"
        >
          {page > 0 ? (
            <Button asChild variant="ghost">
              <Link href={href(page - 1)}>Newer</Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-small text-ink-muted">
            Page {page + 1} of {pages}
          </span>
          {page + 1 < pages ? (
            <Button asChild variant="ghost">
              <Link href={href(page + 1)}>Older</Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </>
  );
}
