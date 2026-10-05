import { Check, Clock, Flame, Users, X } from "lucide-react";

import { StatTile } from "@/components/blocks/stat-tile";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Row, Section } from "./section";

export function GalleryDisplay() {
  return (
    <Section title="Display">
      <Row label="Badge">
        <Badge>Not started</Badge>
        <Badge tone="accent">Check test unlocked</Badge>
        <Badge tone="success">
          <Check aria-hidden /> Correct
        </Badge>
        <Badge tone="danger">
          <X aria-hidden /> Wrong
        </Badge>
        <Badge tone="streak">
          <Flame aria-hidden /> 12 days
        </Badge>
        <Badge tone="outline">Practice question</Badge>
      </Row>

      <Row label="Avatar">
        <Avatar name="Anjali Nair" size="sm" />
        <Avatar name="Rahul Menon" />
        <Avatar name="Fathima" size="lg" />
      </Row>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Days left" value="84" hint="Exam on 28 Dec" />
        <StatTile
          label="Today"
          value="45/120"
          numeral="mono"
          icon={Clock}
          hint="minutes studied"
        />
        <StatTile
          label="Group rank"
          value="#3"
          numeral="mono"
          icon={Users}
          hint="of 18 members"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Indian Constitution</CardTitle>
          <CardDescription>14 topics · steady · confidence 3</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="topics">
            <TabsList>
              <TabsTrigger value="topics">Topics</TabsTrigger>
              <TabsTrigger value="tests">Tests</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>
            <TabsContent value="topics" className="text-ink-muted">
              Preamble, fundamental rights, DPSP…
            </TabsContent>
            <TabsContent value="tests" className="text-ink-muted">
              2 check tests taken, 80% average.
            </TabsContent>
            <TabsContent value="notes" className="text-ink-muted">
              No notes yet.
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Row label="Skeleton">
        <div className="flex w-full items-center gap-3">
          <Skeleton className="size-9 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      </Row>

      <EmptyState
        icon={Users}
        title="No groups yet"
        description="Create one and invite a friend."
      />
    </Section>
  );
}
