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
import { Switch } from "@/components/ui/switch";
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
  createChannelAction,
  updateChannelAction,
} from "../../channel-actions";
import { ChoiceRows } from "../choice-rows";
import { fromDraft, PriceFields, priceDraft } from "../pay/price-fields";
import { usePricing } from "../pay/pricing-context";
import { channelHref, type ChannelSummary } from "./channel-icon";

const NONE = "none";

const VIEW_RULES = [
  {
    value: "EVERYONE" as const,
    label: "Everyone in the squad",
    description: "Listed for every member.",
  },
  {
    value: "PICKED" as const,
    label: "People you pick",
    description: "Hidden from everyone else. Choose them after saving.",
  },
  {
    value: "ADMINS" as const,
    label: "Admins and moderators",
    description: "For the people who run the squad.",
  },
];

/** Slow mode choices: a calm pace, never a punishment. */
const SLOW_MODES = [0, 5, 15, 30, 60, 300, 900] as const;
const slowLabel = (seconds: number) =>
  seconds === 0
    ? "Off"
    : seconds < 60
      ? `${seconds} seconds`
      : `${seconds / 60} minute${seconds === 60 ? "" : "s"}`;

/** Add a channel, or edit one: name, what it's for, who posts, and its category. */
export function ChannelDialog({
  groupId,
  categories,
  channel,
  categoryId: startCategory = null,
  subjects = [],
  open,
  onOpenChange,
}: {
  groupId: string;
  categories: { id: string; name: string }[];
  /** The squad's exam subjects, to tag the channel with one. */
  subjects?: string[];
  /** Editing this channel; left out, a new one. */
  channel?: ChannelSummary;
  categoryId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(channel?.name ?? "");
  const [topic, setTopic] = useState(channel?.topic ?? "");
  const [postRule, setPostRule] = useState(channel?.postRule ?? "EVERYONE");
  const [viewRule, setViewRule] = useState(channel?.viewRule ?? "EVERYONE");
  const [slowModeSec, setSlowModeSec] = useState(channel?.slowModeSec ?? 0);
  const [subject, setSubject] = useState(channel?.subjectName ?? NONE);
  const [categoryId, setCategoryId] = useState(
    channel ? (channel.categoryId ?? NONE) : (startCategory ?? NONE),
  );
  const pricing = usePricing();
  const wasPaid = channel?.pricePaise != null;
  // The owner prices a channel; without the right to sell, only takes a price off.
  const showPrice = pricing.owner && (pricing.canPrice || wasPaid);
  const [paid, setPaid] = useState(wasPaid);
  const [price, setPrice] = useState(
    wasPaid
      ? priceDraft(channel.pricePaise, channel.accessDays)
      : priceDraft(null, 30),
  );
  const [pending, start] = useTransition();
  const shown = channelName(name);

  /** What the action is told about the price: left out when nothing changed. */
  const priceField = () => {
    if (!showPrice) return {};
    if (paid) return pricing.canPrice ? { price: fromDraft(price) } : {};
    return wasPaid ? { price: null } : {};
  };

  const submit = () =>
    start(async () => {
      const fields = {
        groupId,
        name,
        topic,
        postRule,
        // A paid channel is listed for every member, locked until they pay.
        viewRule: paid ? "EVERYONE" : viewRule,
        slowModeSec,
        subjectName: subject === NONE ? "" : subject,
        categoryId: categoryId === NONE ? null : categoryId,
        ...priceField(),
      };
      const result = channel
        ? await updateChannelAction({ ...fields, channelId: channel.id })
        : await createChannelAction(fields);
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
          {subjects.length ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="channel-subject">Subject (optional)</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger id="channel-subject">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No subject</SelectItem>
                  {subjects.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-small text-ink-muted">
                Everything posted here is tagged with it, and its topics come
                first.
              </span>
            </div>
          ) : null}
          {showPrice ? (
            <div className="flex flex-col gap-3 rounded-card border border-border p-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <Label htmlFor="channel-paid">Paid channel</Label>
                  <span className="text-small text-ink-muted">
                    Members see it locked until they pay. You, admins and
                    moderators always get in.
                  </span>
                </div>
                <Switch
                  id="channel-paid"
                  checked={paid}
                  disabled={!pricing.canPrice && !paid}
                  onCheckedChange={setPaid}
                />
              </div>
              {paid ? (
                <fieldset disabled={!pricing.canPrice}>
                  <PriceFields
                    id="channel-pass"
                    value={price}
                    onChange={setPrice}
                  />
                </fieldset>
              ) : null}
            </div>
          ) : null}
          {paid ? null : (
            <div className="flex flex-col gap-2">
              <span className="text-small font-medium">Who can see it</span>
              <ChoiceRows
                label="Who can see it"
                options={VIEW_RULES}
                value={viewRule}
                onChange={setViewRule}
              />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="channel-slow">Slow mode</Label>
            <Select
              value={String(slowModeSec)}
              onValueChange={(v) => setSlowModeSec(Number(v))}
            >
              <SelectTrigger id="channel-slow">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SLOW_MODES.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {slowLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-small text-ink-muted">
              How long a member waits between messages. Admins and moderators
              are never slowed.
            </span>
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
              disabled={pending || !shown || (paid && !price.rupees)}
            >
              {channel ? "Save channel" : "Add channel"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
