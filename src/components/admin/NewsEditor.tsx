"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState, useTransition } from "react";
import { Bold, Italic, List, ListOrdered, Heading2, Heading3, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface NewsEditorProps {
  initialData?: {
    id: string;
    title: string;
    content_html: string;
    image_url: string | null;
    valid_from: string | null;
    valid_to: string | null;
  };
  onSubmit: (formData: FormData) => Promise<{ success: boolean }>;
}

export default function NewsEditor({ initialData, onSubmit }: NewsEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  
  const [title, setTitle] = useState(initialData?.title || "");
  const [validFrom, setValidFrom] = useState(initialData?.valid_from ? new Date(initialData.valid_from).toISOString().slice(0, 16) : "");
  const [validTo, setValidTo] = useState(initialData?.valid_to ? new Date(initialData.valid_to).toISOString().slice(0, 16) : "");
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.image_url || null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialData?.content_html || "",
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none focus:outline-none min-h-[200px] p-4",
      },
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editor) return;

    setError(null);
    const content_html = editor.getHTML();

    if (!title.trim() || !content_html || content_html === "<p></p>") {
      setError("Title and content are required.");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("content_html", content_html);
    
    if (validFrom) formData.append("valid_from", new Date(validFrom).toISOString());
    if (validTo) formData.append("valid_to", new Date(validTo).toISOString());
    if (imageFile) formData.append("image", imageFile);

    startTransition(async () => {
      try {
        await onSubmit(formData);
        router.push("/admin/news");
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to save news.";
        setError(errorMessage);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-red-500 transition-colors"
            placeholder="e.g. New Equipment Arrival!"
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Valid From (Optional)</label>
            <input
              type="datetime-local"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              className="w-full min-w-0 appearance-none bg-[#1a1a1a] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-red-500 transition-colors [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Valid To (Optional)</label>
            <input
              type="datetime-local"
              value={validTo}
              onChange={(e) => setValidTo(e.target.value)}
              className="w-full min-w-0 appearance-none bg-[#1a1a1a] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-red-500 transition-colors [color-scheme:dark]"
            />
          </div>
        </div>

        {/* Cover Image */}
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Cover Image (Optional)</label>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-4">
            <label className="cursor-pointer bg-white/5 border border-white/10 border-dashed rounded-lg p-6 flex-1 flex flex-col items-center justify-center hover:bg-white/10 transition-colors h-40">
              <span className="text-zinc-400 mb-2">Click to upload image</span>
              <span className="text-xs text-zinc-600">JPEG, PNG, WEBP</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>

            {imagePreview && (
              <div className="relative w-full sm:w-64 h-40 rounded-lg overflow-hidden border border-white/10 shrink-0">
                <Image src={imagePreview} alt="Preview" fill className="object-cover" />
              </div>
            )}
          </div>
        </div>

        {/* Rich Text Editor */}
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Content</label>
          <div className="bg-[#1a1a1a] border border-white/10 rounded-lg overflow-hidden focus-within:border-red-500 transition-colors">
            {editor && (
              <div className="bg-black/50 border-b border-white/10 p-2 flex flex-wrap gap-1 items-center">
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={`p-2 rounded transition-colors ${editor.isActive("bold") ? "bg-white/20 text-white" : "text-zinc-400 hover:text-white hover:bg-white/10"}`}
                >
                  <Bold size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={`p-2 rounded transition-colors ${editor.isActive("italic") ? "bg-white/20 text-white" : "text-zinc-400 hover:text-white hover:bg-white/10"}`}
                >
                  <Italic size={16} />
                </button>
                <div className="w-px h-4 bg-white/10 mx-1" />
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  className={`p-2 rounded transition-colors ${editor.isActive("heading", { level: 2 }) ? "bg-white/20 text-white" : "text-zinc-400 hover:text-white hover:bg-white/10"}`}
                >
                  <Heading2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                  className={`p-2 rounded transition-colors ${editor.isActive("heading", { level: 3 }) ? "bg-white/20 text-white" : "text-zinc-400 hover:text-white hover:bg-white/10"}`}
                >
                  <Heading3 size={16} />
                </button>
                <div className="w-px h-4 bg-white/10 mx-1" />
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  className={`p-2 rounded transition-colors ${editor.isActive("bulletList") ? "bg-white/20 text-white" : "text-zinc-400 hover:text-white hover:bg-white/10"}`}
                >
                  <List size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  className={`p-2 rounded transition-colors ${editor.isActive("orderedList") ? "bg-white/20 text-white" : "text-zinc-400 hover:text-white hover:bg-white/10"}`}
                >
                  <ListOrdered size={16} />
                </button>
              </div>
            )}
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      <div className="flex gap-4 pt-4 border-t border-white/10">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 rounded-lg bg-white/5 text-white hover:bg-white/10 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-6 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {isPending ? <Loader2 className="animate-spin" size={18} /> : null}
          <span>{initialData ? "Update News" : "Publish News"}</span>
        </button>
      </div>
    </form>
  );
}
