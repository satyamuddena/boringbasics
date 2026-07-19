"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";

type Props = {
  name: string;
  defaultValue?: string;
  minHeight?: string;
};

function legacyTextToHtml(value: string): string {
  if (!value) return "<p></p>";
  const escaped = value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return escaped
    .split(/\n\s*\n/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function ToolbarButton({ active = false, children, onClick, disabled = false }: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${active ? "border-accent bg-accent/15 text-fg" : "border-line text-muted hover:border-accent hover:text-fg"}`}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({ name, defaultValue = "", minHeight = "18rem" }: Props) {
  const initialHtml = /<\/?[a-z][\s\S]*>/i.test(defaultValue) ? defaultValue : legacyTextToHtml(defaultValue);
  const [html, setHtml] = useState(initialHtml);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({ openOnClick: false, autolink: true, defaultProtocol: "https://" }),
    ],
    content: initialHtml,
    editorProps: { attributes: { class: "outline-none" } },
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
  });

  const setLink = () => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL (https://…)", previous ?? "");
    if (url === null) return;
    if (!url) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    if (!/^https?:\/\//i.test(url)) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-ink focus-within:border-accent">
      <div className="flex flex-wrap gap-2 border-b border-line bg-ink-card p-2">
        <ToolbarButton onClick={() => editor?.chain().focus().setParagraph().run()} active={editor?.isActive("paragraph")} disabled={!editor}>Paragraph</ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive("heading", { level: 2 })} disabled={!editor}>Heading</ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive("heading", { level: 3 })} disabled={!editor}>Subheading</ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive("bold")} disabled={!editor}><strong>B</strong></ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive("italic")} disabled={!editor}><em>I</em></ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive("bulletList")} disabled={!editor}>• List</ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive("orderedList")} disabled={!editor}>1. List</ToolbarButton>
        <ToolbarButton onClick={setLink} active={editor?.isActive("link")} disabled={!editor}>Link</ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().unsetLink().run()} disabled={!editor?.isActive("link")}>Unlink</ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()} disabled={!editor}>Clear style</ToolbarButton>
      </div>
      <EditorContent
        editor={editor}
        className="rich-text-editor px-4 py-3 text-sm leading-7 text-fg [&_.ProseMirror]:outline-none [&_.ProseMirror_a]:text-accent [&_.ProseMirror_a]:underline [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-accent [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_h2]:font-display [&_.ProseMirror_h2]:text-2xl [&_.ProseMirror_h2]:uppercase [&_.ProseMirror_h3]:font-display [&_.ProseMirror_h3]:text-xl [&_.ProseMirror_h3]:uppercase [&_.ProseMirror_p]:my-2"
        style={{ minHeight }}
      />
      <input type="hidden" name={name} value={html} />
    </div>
  );
}
