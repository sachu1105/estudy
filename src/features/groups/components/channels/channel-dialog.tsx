"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { channelName } from "@/lib/squads/channel-name";
import {
  CHANNEL_TYPE_LABELS,
  CHANNEL_TYPES,
  type ChannelType,
} from "@/lib/squads/templates";

import {
  createChannelAction,
  updateChannelAction,
} from "../../channel-actions";
import { channelHref, type ChannelSummary } from "./channel-icon";

const NONE = "none";

/** Add a channel, or edit one: name, what it's for, who posts, and its category. */
export function ChannelDialog({
  groupId,
  categories,
  channel,
  categoryId: startCategory = null,
  open,
  onOpenChange,
}: {
  groupId: string;
  categories: { id: string; name: string }[];
  /** Editing this channel; left out, a new one. */
  channel?: ChannelSummary;
  categoryId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [type, setType] = useState<ChannelType>(channel?.type ?? "CHAT");
  const [name, setName] = useState(channel?.name ?? "");
  const [topic, setTopic] = useState(channel?.topic ?? "");
  const [postRule, setPostRule] = useState(channel?.postRule ?? "EVERYONE");
  const [categoryId, setCategoryId] = useState(
    channel ? (channel.categoryId ?? NONE) : (startCategory ?? NONE),
  );
  const [pending, start] = useTransition();
  const shown = channelName(name);

  const submit = () =>
    start(async () => {
      const fields = {
        groupId,
        name,
        topic,
        postRule,
        categoryId: categoryId === NONE ? null : categoryId,
      };
      const result = channel
        ? await updateChannelAction({ ...fields, channelId: channel.id })
        : await createChannelAction({ ...fields, type });
      if (!result.ok) return void toast.error(result.error);
      toast.success(channel ? "Channel saved" : "Channel added");
      onOpenChange(false);
      if ("channelId" in result)
        router.push(channelHref(groupId, result.channelId as string));
      else router.refresh();
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {channel ? "Edit channel" : "Add a channel"}
            </DialogTitle>
          </DialogHeader>
          {channel ? null : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="channel-type">Kind</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as ChannelType)}
              >
                <SelectTrigger id="channel-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNEL_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {CHANNEL_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="channel-name">Name</Label>
            <Input
              id="channel-name"
              value={name}
              maxLength={60}
              placeholder="kerala-history"
              onChange={(e) => setName(e.target.value)}
            />
            {shown && shown !== name ? (
              <span className="text-small text-ink-muted">
                Shows as #{shown}
              </span>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="channel-topic">What it&apos;s for (optional)</Label>
            <Input
              id="channel-topic"
              value={topic}
              maxLength={200}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="channel-category">Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="channel-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No category</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-small font-medium">Who can post</span>
            <SegmentedControl
              ariaLabel="Who can post"
              value={postRule}
              onValueChange={setPostRule}
              options={[
                { value: "EVERYONE", label: "Everyone" },
                { value: "ADMINS", label: "Admins only" },
              ]}
              className="self-start"
            />
          </div>
          <DialogFooter>
            <Button
              type="submit"
              variant="primary"
              disabled={pending || !shown}
            >
              {channel ? "Save channel" : "Add channel"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
