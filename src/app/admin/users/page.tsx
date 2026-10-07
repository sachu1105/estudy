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

export const metadata: Metadata = { title: "Users · Admin" };

export default async function AdminUsers({
  searchParams,
}: PageProps<"/admin/users">) {
  await requireAdmin("users");
  const query = await searchParams;
  const q = typeof query.q === "string" ? query.q.slice(0, 100) : "";
  const page = Math.max(0, Number(query.page) || 0);
  const [users, total] = await adminService.searchUsers(q, page);
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
