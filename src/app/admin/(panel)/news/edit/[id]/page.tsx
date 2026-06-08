import NewsEditor from "@/components/admin/NewsEditor";
import { updateNews } from "../../actions";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function EditNewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: news } = await supabase
    .from("gym_news")
    .select("*")
    .eq("id", id)
    .single();

  if (!news) {
    notFound();
  }

  async function handleSubmit(formData: FormData) {
    "use server";
    return await updateNews(id, formData);
  }

  return (
    <div className="flex flex-col md:h-screen">
      <div className="p-6 border-b border-white/10 flex-shrink-0">
        <Link 
          href="/admin/news" 
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-4 transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          <span>Back to News</span>
        </Link>
        <h1 className="text-2xl font-bold">Edit Announcement</h1>
      </div>

      <div className="flex-1 p-6 md:overflow-y-auto">
        <NewsEditor initialData={news} onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
