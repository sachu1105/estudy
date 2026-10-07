import { redirect } from "next/navigation";

/** Uploading lives in the Add exam dialog on Pods now; old links open it there. */
export default async function NewSyllabusPage({
  searchParams,
}: PageProps<"/syllabus/new">) {
  const { exam } = await searchParams;
  redirect(
    `/pods?add=upload${typeof exam === "string" ? `&exam=${encodeURIComponent(exam)}` : ""}`,
  );
}
