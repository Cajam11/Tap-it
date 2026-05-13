import { getGymNews, deleteNews } from "./actions";
import { format } from "date-fns";
import Link from "next/link";
import { Plus, Edit } from "lucide-react";
import Image from "next/image";
import { revalidatePath } from "next/cache";
import { DeleteNewsButton } from "@/components/admin/DeleteNewsButton";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const news = await getGymNews();

  async function handleDelete(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await deleteNews(id);
    revalidatePath("/admin/news");
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">News & Announcements</h1>
        <Link 
          href="/admin/news/create" 
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
        >
          <Plus size={18} />
          <span>Add News</span>
        </Link>
      </div>

      <div className="bg-[#1a1a1a] rounded-lg border border-white/10 overflow-hidden">
        {news.length === 0 ? (
          <div className="p-8 text-center text-zinc-400">
            No news entries found. Click <span className="text-white">Add News</span> to create one.
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-black/50 text-zinc-400 text-sm border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-medium">Cover</th>
                <th className="px-6 py-4 font-medium">Title</th>
                <th className="px-6 py-4 font-medium">Valid Period</th>
                <th className="px-6 py-4 font-medium">Date Created</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {news.map((item) => (
                <tr key={item.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    {item.image_url ? (
                      <div className="relative w-16 h-12 rounded overflow-hidden">
                        <Image src={item.image_url} alt={item.title} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-16 h-12 rounded bg-white/5 flex items-center justify-center text-zinc-500 text-xs shadow-inner">
                        None
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium">{item.title}</td>
                  <td className="px-6 py-4 text-zinc-400 text-sm">
                    {item.valid_from && item.valid_to ? (
                      <>{format(new Date(item.valid_from), "MMM d")} - {format(new Date(item.valid_to), "MMM d")}</>
                    ) : (
                      <span className="text-zinc-500">Always</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-zinc-400 text-sm">
                    {format(new Date(item.created_at), "MMM d, yyyy")}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-3">
                      <Link 
                        href={`/admin/news/edit/${item.id}`} 
                        className="p-2 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors"
                      >
                        <Edit size={16} />
                      </Link>
                      <form action={handleDelete}>
                        <input type="hidden" name="id" value={item.id} />
                        <DeleteNewsButton />
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
