import NewsEditor from "@/components/admin/NewsEditor";
import { createNews } from "../actions";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CreateNewsPage() {
  async function handleSubmit(formData: FormData) {
    "use server";
    return await createNews(formData);
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="p-6 border-b border-white/10 flex-shrink-0">
        <Link 
          href="/admin/news" 
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-4 transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          <span>Back to News</span>
        </Link>
        <h1 className="text-2xl font-bold">Create News Announcement</h1>
        <p className="text-zinc-400 mt-1">Publish a new announcement for gym members.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <NewsEditor onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
