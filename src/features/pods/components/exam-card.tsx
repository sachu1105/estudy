import { PodTile } from "@/components/blocks/pod-tile";
import type { PodCover } from "@/lib/pods/covers";

type ExamCardProps = {
  id: string;
  title: string;
  examName: string | null;
  subjects: number;
  topics: number;
  topicsDone: number;
  items: number;
  cover: PodCover;
  /** Null when nothing competes for the day: one exam, or none planned yet. */
  rank: { focus: boolean; paused: boolean } | null;
};

/** An exam pod at a glance: its subjects and how far through the syllabus the user is. */
export function ExamCard({
  id,
  title,
  examName,
  subjects,
  topics,
  topicsDone,
  items,
  cover,
  rank,
}: ExamCardProps) {
  return (
    <PodTile
      href={`/pods/exam/${id}`}
      title={title}
      subtitle={[
        examName && examName !== title ? examName : null,
        `${subjects} subject${subjects === 1 ? "" : "s"}`,
      ]
        .filter(Boolean)
        .join(" · ")}
      tag={rank?.paused ? "Paused" : rank?.focus ? "Focus" : "Exam"}
      cover={cover}
      stat={{ value: topicsDone, unit: `of ${topics} topics done` }}
      aside={`${items} item${items === 1 ? "" : "s"}`}
      progress={topics ? (topicsDone / topics) * 100 : 0}
    />
  );
}
