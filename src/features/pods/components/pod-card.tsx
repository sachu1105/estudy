import { PodTile } from "@/components/blocks/pod-tile";
import { coverFor } from "@/lib/pods/covers";

type PodCardProps = {
  id: string;
  name: string;
  kind: "SUBJECT" | "CUSTOM";
  topics: number;
  topicsDone: number;
  items: number;
};

/** A pod at a glance: how much material it holds, and how much is done. */
export function PodCard({
  id,
  name,
  kind,
  topics,
  topicsDone,
  items,
}: PodCardProps) {
  return (
    <PodTile
      href={`/pods/${id}`}
      title={name}
      subtitle={
        topics > 0 ? `${topicsDone} of ${topics} topics done` : undefined
      }
      tag={kind === "SUBJECT" ? "Subject" : "Your pod"}
      cover={coverFor(id)}
      stat={{ value: items, unit: items === 1 ? "item" : "items" }}
      progress={topics ? (topicsDone / topics) * 100 : undefined}
    />
  );
}
