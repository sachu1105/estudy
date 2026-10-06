"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DISTRICTS } from "@/lib/progress/districts";

/** Exam and district filters for the board; they live in the URL so a link keeps them. */
export function RankFilters({
  exams,
}: {
  exams: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value === "all") next.delete(key);
    else next.set(key, value);
    router.push(`${pathname}?${next}`);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {exams.length > 0 ? (
        <Select
          value={params.get("exam") ?? "all"}
          onValueChange={(v) => set("exam", v)}
        >
          <SelectTrigger aria-label="Exam" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Every exam</SelectItem>
            {exams.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      <Select
        value={params.get("district") ?? "all"}
        onValueChange={(v) => set("district", v)}
      >
        <SelectTrigger aria-label="District" className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Every district</SelectItem>
          {DISTRICTS.map((d) => (
            <SelectItem key={d} value={d}>
              {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
