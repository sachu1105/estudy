"use client";

import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TableKit } from "@tiptap/extension-table";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";

import { toast } from "@/components/ui/toast";
import type { DocNode } from "@/lib/notes/doc";
import { SaveIndicator } from "@/features/syllabus/components/save-indicator";
import { useAutosave } from "@/features/syllabus/use-autosave";

import { saveNoteAction } from "../actions";
import { uploadNoteImage } from "../upload";
import { NoteToolbar } from "./note-toolbar";

/** A rich-text note that saves itself 2 s after the last change, with a quiet "Saved". */
export function NoteEditor({
  itemId,
  initialTitle,
  initialDoc,
}: {
  itemId: string;
  initialTitle: string;
  initialDoc: DocNode;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [doc, setDoc] = useState(initialDoc);
  const editor = useEditor({
    immediatelyRender: false,
    // The toolbar shows what is active under the cursor.
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      TableKit.configure({ table: { resizable: false } }),
      Image,
      Placeholder.configure({ placeholder: "Write your notes here." }),
    ],
    content: initialDoc,
    editorProps: {
      attributes: { class: "note-content", "aria-label": "Note" },
    },
    onUpdate: ({ editor }) => setDoc(editor.getJSON() as DocNode),
  });

  const save = useAutosave({ title, doc }, async (value) => {
    const result = await saveNoteAction({
      itemId,
      title: value.title || "Untitled note",
      doc: value.doc,
    });
    return result.ok ? null : result.error;
  });

  const insertImage = async (file: File) => {
    try {
      const src = await uploadNoteImage(itemId, file);
      editor?.chain().focus().setImage({ src, alt: file.name }).run();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <input
          aria-label="Note title"
          value={title}
          maxLength={120}
          placeholder="Untitled note"
          onChange={(e) => setTitle(e.target.value)}
          className="min-w-0 flex-1 bg-transparent font-heading text-h1 font-semibold outline-none placeholder:text-ink-subtle"
        />
        <SaveIndicator state={save.state} error={save.error} />
      </div>
      <div className="rounded-card border border-border bg-surface">
        {editor ? <NoteToolbar editor={editor} onImage={insertImage} /> : null}
        <EditorContent editor={editor} className="min-h-[50dvh] px-4 py-3" />
      </div>
    </div>
  );
}
