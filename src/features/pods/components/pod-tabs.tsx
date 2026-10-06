"use client";

import type { ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** The pod's sections; each panel is rendered on the server and passed in. */
export function PodTabs({
  topics,
  material,
  tests,
  progress,
  hasTopics,
}: {
  topics: ReactNode;
  material: ReactNode;
  tests: ReactNode;
  progress: ReactNode;
  hasTopics: boolean;
}) {
  return (
    <Tabs defaultValue={hasTopics ? "topics" : "material"}>
      <TabsList className="overflow-x-auto">
        {hasTopics ? <TabsTrigger value="topics">Topics</TabsTrigger> : null}
        <TabsTrigger value="material">Material</TabsTrigger>
        <TabsTrigger value="tests">Tests</TabsTrigger>
        <TabsTrigger value="progress">Progress</TabsTrigger>
      </TabsList>
      {hasTopics ? <TabsContent value="topics">{topics}</TabsContent> : null}
      <TabsContent value="material">{material}</TabsContent>
      <TabsContent value="tests">{tests}</TabsContent>
      <TabsContent value="progress">{progress}</TabsContent>
    </Tabs>
  );
}
