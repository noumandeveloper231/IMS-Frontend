import { Editor } from "@tinymce/tinymce-react";
import { useRef } from "react";

export function RichTextEditor({ value, onChange }) {
  const editorRef = useRef(null);
  const tinyMCEKey = import.meta.env.VITE_TINYMCE_API_KEY;

  return (
    <Editor
      apiKey={tinyMCEKey}
      onInit={(evt, editor) => (editorRef.current = editor)}
      value={value}
      init={{
        height: 400,
        menubar: false,
        plugins: [
          "advlist", "autolink", "lists", "link", "image",
          "charmap", "preview", "anchor", "searchreplace",
          "visualblocks", "code", "fullscreen", "insertdatetime",
          "media", "table", "help"
        ],
        toolbar:
          "undo redo | bold italic underline | alignleft aligncenter alignright | bullist numlist | link image | code"
      }}
      onEditorChange={(content) => onChange(content)}
    />
  );
}