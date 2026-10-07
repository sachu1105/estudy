"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { PodTile } from "@/components/blocks/pod-tile";
import type { JobEvent } from "@/server/realtime/types";

import type { SyllabusState } from "../state";
import { useJobStatus } from "../use-job-status";

type SetupTileProps = {
  id: string;
  title: string;
  examName: string | null;
  subjects: number;
  state: SyllabusState;
  /** The latest parse job, while there is one. */
  job: JobEvent | null;
};

/**
 * A syllabus on its way to becoming an exam pod, in the same grid as the pods it will
 * join. While it's read, the status is live and honest (rule 2): queued, reading,
 * finding subjects. Once read, it asks to be checked.
 */
export function SetupTile(props: SetupTileProps) {
  return props.state === "reading" && props.job ? (
    <LiveSetupTile {...props} job={props.job} />
  ) : (
    <SetupTileView {...props} event={null} />
  );
}

function LiveSetupTile(props: SetupTileProps & { job: JobEvent }) {
  const router = useRouter();
  const event = useJobStatus(props.job);
  const done = event.status === "READY" || event.status === "FAILED";
  // Read: fetch the page again so the tile shows what was found.
  useEffect(() => {
    if (done) router.refresh();
  }, [done, router]);
  return <SetupTileView {...props} event={event} />;
}

function SetupTileView({
  id,
  title,
  examName,
  subjects,
  state,
  event,
}: SetupTileProps & { event: JobEvent | null }) {
  const stage = event?.stage;
  const progress = Math.round(event?.progress ?? 0);
  const view =
    stage === "QUEUED"
      ? { value: "…", unit: "waiting for the reader", aside: "Queued" }
      : stage === "READING" || stage === "STRUCTURING"
        ? {
            value: `${progress}%`,
            unit: stage === "READING" ? "reading the file" : "finding subjects",
            aside: "Open",
          }
        : state === "review"
          ? {
              value: subjects,
              unit: subjects === 1 ? "subject found" : "subjects found",
              aside: "Check them",
            }
          : state === "failed" || stage === "FAILED"
            ? { value: "–", unit: "couldn't read it", aside: "See why" }
            : state === "pending"
              ? { value: "…", unit: "waiting for approval", aside: "Open" }
              : { value: "–", unit: "not approved", aside: "Open" };
  const reading = stage === "READING" || stage === "STRUCTURING";

  return (
    <PodTile
      href={`/syllabus/${id}`}
      title={title}
      subtitle={examName ?? "Your upload"}
      tag={state === "review" ? "Ready to check" : "Setting up"}
      cover={{ kind: "placeholder", moving: reading || stage === "QUEUED" }}
      stat={{ value: view.value, unit: view.unit }}
      aside={view.aside}
      progress={reading ? progress : undefined}
    />
  );
}
