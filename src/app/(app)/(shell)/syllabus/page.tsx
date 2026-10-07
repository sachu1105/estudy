import { redirect } from "next/navigation";

// Syllabuses live in the pods home now: each confirmed one is an exam pod, and the
// ones still being read or checked sit among the exams there.
export default function SyllabusPage() {
  redirect("/pods");
}
