"use client";

import { MessageSquareHeart } from "lucide-react";

import { openFeedback } from "@/components/shell/open-feedback";
import { Button } from "@/components/ui/button";

/** Opens the feedback modal: Settings' way in on a phone, where there's no sidebar. */
export function RateButton() {
  return (
    <Button variant="secondary" size="sm" onClick={openFeedback}>
      <MessageSquareHeart aria-hidden /> Rate
    </Button>
  );
}
