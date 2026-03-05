import { useEffect, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent, EditorContext, useEditorState } from "@tiptap/react";
import { FloatingMenu, BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { createLowlight, common } from "lowlight";
import { cn } from "@/lib/utils";
import { Button } from "@/components/UI/button";
import { Input } from "@/components/UI/input";
import { Label } from "@/components/UI/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/UI/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/UI/tooltip";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Minus,
  Undo2,
  Redo2,
  Link2,
  CodeSquare,
  FileCode,
  RemoveFormatting,
} from "lucide-react";

const lowlight = createLowlight(common);

/**
 * State selector for the menu bar. Extracts editor state so the toolbar
 * only re-renders when this state changes (useEditorState pattern).
 */
function menuBarStateSelector(ctx) {
  const { editor } = ctx;
  if (!editor) return null;
  return {
    isBold: editor.isActive("bold"),
    canBold: editor.can().chain().focus().toggleBold().run(),
    isItalic: editor.isActive("italic"),
    canItalic: editor.can().chain().focus().toggleItalic().run(),
    isStrike: editor.isActive("strike"),
    canStrike: editor.can().chain().focus().toggleStrike().run(),
    isCode: editor.isActive("code"),
    canCode: editor.can().chain().focus().toggleCode().run(),
    isLink: editor.isActive("link"),
    isParagraph: editor.isActive("paragraph"),
    isHeading1: editor.isActive("heading", { level: 1 }),
    isHeading2: editor.isActive("heading", { level: 2 }),
    isHeading3: editor.isActive("heading", { level: 3 }),
    isBulletList: editor.isActive("bulletList"),
    isOrderedList: editor.isActive("orderedList"),
    isCodeBlock: editor.isActive("codeBlock"),
    isBlockquote: editor.isActive("blockquote"),
    canUndo: editor.can().chain().focus().undo().run(),
    canRedo: editor.can().chain().focus().redo().run(),
  };
}

/** Shadcn dialog for adding/editing link URL (replaces window.prompt). */
function LinkDialog({ open, onOpenChange, defaultUrl, onConfirm }) {
  const [url, setUrl] = useState(defaultUrl);

  useEffect(() => {
    if (open) setUrl(defaultUrl ?? "");
  }, [open, defaultUrl]);

  const handleApply = () => {
    const value = url?.trim() ?? "";
    onConfirm(value);
    onOpenChange(false);
  };

  const handleRemove = () => {
    onConfirm("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Insert link</DialogTitle>
          <DialogDescription>Enter the URL for the link. Leave empty to remove the link.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          <Label htmlFor="link-url">URL</Label>
          <Input
            id="link-url"
            type="url"
            placeholder="https://"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleApply();
              if (e.key === "Escape") onOpenChange(false);
            }}
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          {defaultUrl ? (
            <Button type="button" variant="destructive" size="sm" className="mr-auto" onClick={handleRemove}>
              Remove link
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleApply}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Rough heuristic to decide if a string contains HTML tags. */
function looksLikeHtml(text) {
  return /<\/?[a-z][\s\S]*>/i.test(text ?? "");
}

/**
 * Collapse whitespace between HTML tags so the parser doesn't create
 * extra empty paragraphs from newlines between e.g. </h1>\n\n<p>.
 */
function normalizeHtmlWhitespace(html) {
  return (html ?? "").replace(/>\s+</g, "><").trim();
}

function parseCodeToEditorCommands(editor, codeText) {
  if (!editor) return;

  const lines = codeText.split(/\r?\n/);

  lines.forEach((line) => {
    const trimmed = line.trim();

    // Blank line → empty paragraph (keeps spacing)
    if (!trimmed) {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "paragraph",
          content: [],
        })
        .run();
      return;
    }

    // Markdown-style headings
    if (trimmed.startsWith("# ")) {
      const text = trimmed.slice(2);
      editor
        .chain()
        .focus()
        .insertContent({
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text }],
        })
        .run();
      return;
    }

    if (trimmed.startsWith("## ")) {
      const text = trimmed.slice(3);
      editor
        .chain()
        .focus()
        .insertContent({
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text }],
        })
        .run();
      return;
    }

    if (trimmed.startsWith("### ")) {
      const text = trimmed.slice(4);
      editor
        .chain()
        .focus()
        .insertContent({
          type: "heading",
          attrs: { level: 3 },
          content: [{ type: "text", text }],
        })
        .run();
      return;
    }

    // Bullet list: "- item" or "* item"
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const text = trimmed.replace(/^[-*]\s+/, "");
      editor
        .chain()
        .focus()
        .insertContent({
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text }],
                },
              ],
            },
          ],
        })
        .run();
      return;
    }

    // Ordered list: "1. item"
    if (/^\d+\.\s+/.test(trimmed)) {
      const text = trimmed.replace(/^\d+\.\s+/, "");
      editor
        .chain()
        .focus()
        .insertContent({
          type: "orderedList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text }],
                },
              ],
            },
          ],
        })
        .run();
      return;
    }

    // Default: plain paragraph, treat the whole line as literal text (HTML is NOT parsed)
    editor
      .chain()
      .focus()
      .insertContent({
        type: "paragraph",
        content: [{ type: "text", text: line }],
      })
      .run();
  });
}

function InsertCodeDialog({ open, onOpenChange, onInsert }) {
  const [code, setCode] = useState("");

  useEffect(() => {
    if (open) setCode("");
  }, [open]);

  const handleInsert = () => {
    const trimmed = code?.trimEnd() ?? "";
    if (trimmed) onInsert(trimmed);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-[90vh] flex flex-col gap-4 p-6">
        <DialogHeader>
          <DialogTitle>Insert code</DialogTitle>
          <DialogDescription>
            Paste or type your content below. HTML will be inserted as formatted content, and Markdown-style headings/lists will be parsed.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 flex-1 min-h-0">
          <textarea
            id="insert-code-body"
            placeholder="Paste or type your code here..."
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 min-h-[200px] w-full rounded-lg border border-input bg-muted/30 p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            spellCheck={false}
            onKeyDown={(e) => {
              if (e.key === "Escape") onOpenChange(false);
            }}
          />
        </div>
        <DialogFooter className="gap-2 shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleInsert}>
            Parse &amp; insert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Toolbar – uses useEditorState + selector for optimal re-renders (Tailwind + shadcn). */
function Toolbar({ editor, disabled, onOpenLinkDialog, onOpenInsertCode }) {
  const state = useEditorState({
    editor,
    selector: menuBarStateSelector,
  });

  if (!editor) return null;

  const activeVariant = "info";
  const inactiveVariant = "ghost";

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-input bg-muted/50 px-2 py-1.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" size="icon" variant={inactiveVariant} className="h-8 w-8" disabled={disabled || !state?.canUndo} onClick={() => editor.chain().focus().undo().run()}>
            <Undo2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Undo</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" size="icon" variant={inactiveVariant} className="h-8 w-8" disabled={disabled || !state?.canRedo} onClick={() => editor.chain().focus().redo().run()}>
            <Redo2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Redo</TooltipContent>
      </Tooltip>
      <span className="mx-1 h-5 w-px bg-border" aria-hidden />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" size="icon" variant={state?.isHeading1 ? activeVariant : inactiveVariant} className="h-8 w-8" disabled={disabled} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
            <Heading1 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Heading 1</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" size="icon" variant={state?.isHeading2 ? activeVariant : inactiveVariant} className="h-8 w-8" disabled={disabled} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
            <Heading2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Heading 2</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" size="icon" variant={state?.isHeading3 ? activeVariant : inactiveVariant} className="h-8 w-8" disabled={disabled} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
            <Heading3 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Heading 3</TooltipContent>
      </Tooltip>
      <span className="mx-1 h-5 w-px bg-border" aria-hidden />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" size="icon" variant={state?.isBold ? activeVariant : inactiveVariant} className="h-8 w-8" disabled={disabled || !state?.canBold} onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Bold</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" size="icon" variant={state?.isItalic ? activeVariant : inactiveVariant} className="h-8 w-8" disabled={disabled || !state?.canItalic} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Italic</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" size="icon" variant={state?.isStrike ? activeVariant : inactiveVariant} className="h-8 w-8" disabled={disabled || !state?.canStrike} onClick={() => editor.chain().focus().toggleStrike().run()}>
            <Strikethrough className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Strikethrough</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" size="icon" variant={state?.isCode ? activeVariant : inactiveVariant} className="h-8 w-8" disabled={disabled || !state?.canCode} onClick={() => editor.chain().focus().toggleCode().run()}>
            <Code className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Inline code</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" size="icon" variant={state?.isLink ? activeVariant : inactiveVariant} className="h-8 w-8" disabled={disabled} onClick={onOpenLinkDialog}>
            <Link2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Link</TooltipContent>
      </Tooltip>
      <span className="mx-1 h-5 w-px bg-border" aria-hidden />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" size="icon" variant={state?.isBulletList ? activeVariant : inactiveVariant} className="h-8 w-8" disabled={disabled} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <List className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Bullet list</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" size="icon" variant={state?.isOrderedList ? activeVariant : inactiveVariant} className="h-8 w-8" disabled={disabled} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <ListOrdered className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Numbered list</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" size="icon" variant={state?.isBlockquote ? activeVariant : inactiveVariant} className="h-8 w-8" disabled={disabled} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
            <Quote className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Blockquote</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" size="icon" variant={state?.isCodeBlock ? activeVariant : inactiveVariant} className="h-8 w-8" disabled={disabled} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
            <CodeSquare className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Code block</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" size="icon" variant={inactiveVariant} className="h-8 w-8" disabled={disabled} onClick={onOpenInsertCode}>
            <FileCode className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Insert code</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" size="icon" variant={inactiveVariant} className="h-8 w-8" disabled={disabled} onClick={() => editor.chain().focus().setHorizontalRule().run()}>
            <Minus className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Horizontal rule</TooltipContent>
      </Tooltip>
      <span className="mx-1 h-5 w-px bg-border" aria-hidden />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" size="icon" variant={inactiveVariant} className="h-8 w-8" disabled={disabled} onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}>
            <RemoveFormatting className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Clear formatting</TooltipContent>
      </Tooltip>
    </div>
  );
}

/** Bubble menu – on text selection; uses same selector for state. */
function BubbleMenuBar({ editor, disabled, onOpenLinkDialog }) {
  const state = useEditorState({
    editor,
    selector: menuBarStateSelector,
  });

  if (!editor) return null;

  const activeVariant = "secondary";
  const inactiveVariant = "ghost";

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-input bg-background px-1 py-1 shadow-md">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" size="icon" variant={state?.isBold ? activeVariant : inactiveVariant} className="h-8 w-8" disabled={disabled || !state?.canBold} onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Bold</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" size="icon" variant={state?.isItalic ? activeVariant : inactiveVariant} className="h-8 w-8" disabled={disabled || !state?.canItalic} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Italic</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" size="icon" variant={state?.isStrike ? activeVariant : inactiveVariant} className="h-8 w-8" disabled={disabled || !state?.canStrike} onClick={() => editor.chain().focus().toggleStrike().run()}>
            <Strikethrough className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Strikethrough</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" size="icon" variant={state?.isCode ? activeVariant : inactiveVariant} className="h-8 w-8" disabled={disabled || !state?.canCode} onClick={() => editor.chain().focus().toggleCode().run()}>
            <Code className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Inline code</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" size="icon" variant={state?.isLink ? activeVariant : inactiveVariant} className="h-8 w-8" disabled={disabled} onClick={onOpenLinkDialog}>
            <Link2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Link</TooltipContent>
      </Tooltip>
    </div>
  );
}

/** Floating menu – on empty line; quick block actions. */
function FloatingMenuBar({ editor, disabled }) {
  if (!editor) return null;
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-input bg-background px-1 py-1 shadow-md">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" disabled={disabled} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
            H1
          </Button>
        </TooltipTrigger>
        <TooltipContent>Heading 1</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" disabled={disabled} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
            H2
          </Button>
        </TooltipTrigger>
        <TooltipContent>Heading 2</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" disabled={disabled} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            List
          </Button>
        </TooltipTrigger>
        <TooltipContent>Bullet list</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" disabled={disabled} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
            Code
          </Button>
        </TooltipTrigger>
        <TooltipContent>Code block</TooltipContent>
      </Tooltip>
    </div>
  );
}

function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Enter content...",
  className,
  minHeight = 320,
  disabled = false,
}) {
  const valueRef = useRef(value);
  const isInternalChange = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: "plaintext",
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline underline-offset-2" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    editable: !disabled,
    onUpdate: ({ editor: ed }) => {
      isInternalChange.current = true;
      const html = ed.getHTML();
      valueRef.current = html;
      onChange?.(html);
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[200px] px-3 py-2 text-sm focus:outline-none [&_:first-child]:mt-0",
      },
    },
  });

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkDialogUrl, setLinkDialogUrl] = useState("");

  const handleOpenLinkDialog = () => {
    if (!editor) return;
    setLinkDialogUrl(editor.getAttributes("link").href ?? "");
    setLinkDialogOpen(true);
  };

  const handleLinkConfirm = (url) => {
    if (!editor) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
    setLinkDialogOpen(false);
  };

  const [insertCodeDialogOpen, setInsertCodeDialogOpen] = useState(false);

  const handleOpenInsertCode = () => setInsertCodeDialogOpen(true);

  const handleInsertCode = (codeText) => {
    if (!editor) return;

    // If it looks like HTML, let Tiptap parse and insert the HTML directly
    // so headings, lists, paragraphs, etc. are preserved as-is.
    if (looksLikeHtml(codeText)) {
      const html = normalizeHtmlWhitespace(codeText);
      editor.chain().focus().insertContent(html).run();
    } else {
      // Otherwise, treat it as Markdown-like text and parse line by line.
      parseCodeToEditorCommands(editor, codeText);
    }

    setInsertCodeDialogOpen(false);
  };

  useEffect(() => {
    if (!editor) return;
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    const current = valueRef.current;
    if (value !== undefined && String(value) !== String(current)) {
      valueRef.current = value;
      editor.commands.setContent(value || "", false);
    }
  }, [value, editor]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  const editorContextValue = useMemo(() => ({ editor }), [editor]);

  return (
    <TooltipProvider>
      <EditorContext.Provider value={editorContextValue}>
        <div
          className={cn(
            "rounded-lg border border-input overflow-hidden bg-background",
            "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
            "[&_.tiptap]:min-h-[200px]",
            className
          )}
          style={{ minHeight: typeof minHeight === "number" ? minHeight : 320 }}
        >
          <Toolbar editor={editor} disabled={disabled} onOpenLinkDialog={handleOpenLinkDialog} onOpenInsertCode={handleOpenInsertCode} />
          {editor && (
            <>
              <FloatingMenu editor={editor}>
                <FloatingMenuBar editor={editor} disabled={disabled} />
              </FloatingMenu>
              <BubbleMenu editor={editor}>
                <BubbleMenuBar editor={editor} disabled={disabled} onOpenLinkDialog={handleOpenLinkDialog} />
              </BubbleMenu>
            </>
          )}
          <EditorContent editor={editor} />
        </div>
        <LinkDialog
          open={linkDialogOpen}
          onOpenChange={setLinkDialogOpen}
          defaultUrl={linkDialogUrl}
          onConfirm={handleLinkConfirm}
        />
        <InsertCodeDialog
          open={insertCodeDialogOpen}
          onOpenChange={setInsertCodeDialogOpen}
          onInsert={handleInsertCode}
        />
      </EditorContext.Provider>
    </TooltipProvider>
  );
}

export { RichTextEditor };
