import { Check, Clock, Hammer, Map, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  IDEA_STATUS_LABEL,
  PROBLEM_STATUS_LABEL,
  type IdeaStatus,
  type ProblemStatus,
} from "@/lib/feedback/schemas";

/** Where an idea stands. Done is the only green, and it carries a check. */
export function IdeaStatusBadge({ status }: { status: IdeaStatus }) {
  const label = IDEA_STATUS_LABEL[status];
  if (status === "SHIPPED")
    return (
      <Badge tone="success">
        <Check aria-hidden /> {label}
      </Badge>
    );
  if (status === "PLANNED")
    return (
      <Badge tone="accent">
        <Map aria-hidden /> {label}
      </Badge>
    );
  if (status === "BUILDING")
    return (
      <Badge tone="accent">
        <Hammer aria-hidden /> {label}
      </Badge>
    );
  if (status === "REVIEW")
    return (
      <Badge tone="neutral">
        <Clock aria-hidden /> {label}
      </Badge>
    );
  return <Badge tone="outline">{label}</Badge>;
}

export function ProblemStatusBadge({ status }: { status: ProblemStatus }) {
  const label = PROBLEM_STATUS_LABEL[status];
  if (status === "FIXED")
    return (
      <Badge tone="success">
        <Check aria-hidden /> {label}
      </Badge>
    );
  if (status === "LOOKING")
    return (
      <Badge tone="accent">
        <Search aria-hidden /> {label}
      </Badge>
    );
  if (status === "RECEIVED")
    return (
      <Badge tone="neutral">
        <Clock aria-hidden /> {label}
      </Badge>
    );
  return <Badge tone="outline">{label}</Badge>;
}
