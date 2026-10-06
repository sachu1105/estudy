import { ChevronRight, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatWhen } from "@/lib/admin/format";
import { ADMIN_PAGE_SIZE } from "@/server/repositories/admin-repository";
import { adminService, requireAdmin } from "@/server/services/admin";
import { ABUSE_LIMITS, rankService } from "@/server/services/rank";

export const metadata: Metadata = { title: "Users · Admin" };

export default async function AdminUsers({
  searchParams,
}: PageProps<"/admin/users">) {
  await requireAdmin("users");
  const query = await searchParams;
  const q = typeof query.q === "string" ? query.q.slice(0, 100) : "";
  const page = Math.max(0, Number(query.page) || 0);
  const [[users, total], flagged] = await Promise.all([
    adminService.searchUsers(q, page),
    rankService.flagged(),
  ]);
  const pages = Math.ceil(total / ADMIN_PAGE_SIZE);
  const href = (p: number) =>
    `/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <>
      <PageHeader
        title="Users"
        description={`${total} ${q ? "matching" : "in all"}.`}
      />
      <form className="mb-6 flex gap-2" role="search">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Email or name"
          aria-label="Search users"
          className="max-w-md"
        />
        <Button type="submit" variant="secondary">
          <Search aria-hidden /> Search
        </Button>
      </form>
      {flagged.length > 0 && !q ? (
        <section aria-labelledby="flagged" className="mb-8 flex flex-col gap-2">
          <h2 id="flagged" className="text-h3">
            Needs a look
          </h2>
          <p className="text-small text-ink-muted">
            In the last 14 days: over {ABUSE_LIMITS.maxXp} XP,{" "}
            {ABUSE_LIMITS.maxTests} tests or {ABUSE_LIMITS.maxMinutes} study
            minutes in a single day.
          </p>
          <ul className="divide-y divide-border rounded-card border border-border bg-surface">
            {flagged.map((f) => (
              <li key={`${f.userId}-${f.reason}-${f.day.toISOString()}`}>
                <Link
                  href={`/admin/users/${f.userId}`}
                  className="flex min-h-12 items-center gap-3 px-4 py-2 hover:bg-surface-muted"
                >
                  <span className="min-w-0 flex-1 truncate text-body">
                    {f.email}
                  </span>
                  <span className="text-small text-ink-muted">
                    {f.amount}{" "}
                    {f.reason === "xp"
                      ? "XP"
                      : f.reason === "tests"
                        ? "tests"
                        : "minutes"}{" "}
                    on {f.day.toISOString().slice(0, 10)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {users.length === 0 ? (
        <p className="text-body text-ink-muted">No users match that.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-card border border-border bg-surface">
          {users.map((u) => (
            <li key={u.id}>
              <Link
                href={`/admin/users/${u.id}`}
                className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-surface-muted"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body font-medium">
                    {u.email}
                  </span>
                  <span className="truncate text-small text-ink-muted">
                    {u.name} · joined {formatWhen(u.createdAt)}
                  </span>
                </span>
                <span className="hidden flex-wrap justify-end gap-1.5 sm:flex">
                  {u.role !== "USER" ? (
                    <Badge tone="accent">
                      {u.role.replace("_", " ").toLowerCase()}
                    </Badge>
                  ) : null}
                  {u.status !== "ACTIVE" ? (
                    <Badge tone="danger">{u.status.toLowerCase()}</Badge>
                  ) : null}
                  <Badge tone="outline">
                    {(u.subscriptions[0]?.plan ?? "FREE").toLowerCase()}
                  </Badge>
                </span>
                <ChevronRight
                  className="size-4 shrink-0 text-ink-muted"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {pages > 1 ? (
        <nav
          aria-label="Pages"
          className="mt-4 flex items-center justify-between gap-2"
        >
          {page > 0 ? (
            <Button asChild variant="ghost">
              <Link href={href(page - 1)}>Previous</Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-small text-ink-muted">
            Page {page + 1} of {pages}
          </span>
          {page + 1 < pages ? (
            <Button asChild variant="ghost">
              <Link href={href(page + 1)}>Next</Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </>
  );
}
