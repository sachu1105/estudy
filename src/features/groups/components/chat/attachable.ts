// Something from the person's pods that a chat message can carry; picked in the
// attach panel. The squad gets a copy (rule 15).
export type Attachable = {
  id: string;
  title: string;
  type: string;
  pod: { name: string };
};
