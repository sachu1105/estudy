"use client";

import { Link2, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ItemPicker } from "@/components/blocks/item-picker";
import { PodItemIcon } from "@/components/blocks/pod-item-icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

import { addGroupLinkAction, shareFromPodAction } from "../actions";

type Shareable = {
  id: string;
  title: string;
  type: string;
  pod: { name: string };
};

/** Share a copy of something from your pods; the original stays private (rule 15). */
export function ShareFromPods({
  groupId,
  channelId,
  items,
}: {
  groupId: string;
  channelId: string;
  items: Shareable[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const share = (podItemId: string) =>
    start(async () => {
      const result = await shareFromPodAction({
        groupId,
        channelId,
        podItemId,
      });
      if (!result.ok) return void toast.error(result.error);
      toast.success("Shared with the squad");
      router.refresh();
    });
  return (
    <ItemPicker
      align="end"
      disabled={pending}
      trigger={
        <Button variant="primary">
          <Share2 aria-hidden /> Share from my pods
        </Button>
      }
      title="Share from your pods"
      description="The squad gets a copy. Your pod stays yours."
      empty="Nothing in your pods yet. Add notes, links or files there first."
      items={items.map((item) => ({
        id: item.id,
        title: item.title,
        subtitle: item.pod.name,
        icon: <PodItemIcon type={item.type} />,
      }))}
      onPick={share}
    />
  );
}

/** Add a website straight into the group, tagged with a topic. */
export function AddGroupLink({
  groupId,
  channelId,
  primary = false,
}: {
  groupId: string;
  channelId: string;
  /** In a links channel it is the one main action. */
  primary?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={primary ? "primary" : "secondary"}>
          <Link2 aria-hidden /> Add a link
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const result = await addGroupLinkAction({
                groupId,
                channelId,
                url,
                title,
                topicName: topic,
              });
              if (!result.ok) return void toast.error(result.error);
              toast.success("Link shared");
              setOpen(false);
              setUrl("");
              setTitle("");
              setTopic("");
              router.refresh();
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>Add a link</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="group-link">Link</Label>
            <Input
              id="group-link"
              type="url"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="group-link-title">Title (optional)</Label>
            <Input
              id="group-link-title"
              value={title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="group-link-topic">Topic (optional)</Label>
            <Input
              id="group-link-topic"
              value={topic}
              maxLength={200}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Preamble"
            />
          </div>
          <DialogFooter>
            <Button
              type="submit"
              variant="primary"
              disabled={pending || url.trim().length < 4}
            >
              Share link
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
