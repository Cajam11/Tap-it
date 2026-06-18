"use server";

import { createClient } from "@/lib/supabase/server";
import { hasServerAdminAccess } from "@/lib/admin-access";
import { revalidatePath } from "next/cache";
import { sendGymNewsPushNotification } from "@/lib/expo-push";
import { randomUUID } from "crypto";

export async function getGymNews() {
  const supabase = await createClient();
  const hasAccess = await hasServerAdminAccess(supabase, "owner");
  if (!hasAccess) throw new Error("Unauthorized");
  
  const { data, error } = await supabase
    .from("gym_news")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function createNews(formData: FormData) {
  const supabase = await createClient();
  const hasAccess = await hasServerAdminAccess(supabase, "owner");
  if (!hasAccess) throw new Error("Unauthorized");

  const title = formData.get("title") as string;
  const content_html = formData.get("content_html") as string;
  let image_url = null;
  const image = formData.get("image") as File | null;
  
  const valid_from = formData.get("valid_from") as string || null;
  const valid_to = formData.get("valid_to") as string || null;

  if (image && image.size > 0 && image.name !== "undefined") {
    const ext = image.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    
    const { error: uploadError } = await supabase.storage
      .from("gym-news-images")
      .upload(fileName, image);

    if (uploadError) {
      console.error(uploadError);
      throw new Error("Failed to upload image.");
    }

    const { data: publicUrlData } = supabase.storage
      .from("gym-news-images")
      .getPublicUrl(fileName);
      
    image_url = publicUrlData.publicUrl;
  }

  const newsId = randomUUID();

  const { error } = await supabase.from("gym_news").insert({
    id: newsId,
    title,
    content_html,
    image_url,
    valid_from: valid_from || null,
    valid_to: valid_to || null,
  });

  if (error) {
    console.error(error);
    throw new Error(error.message);
  }

  revalidatePath("/admin/news");
  revalidatePath("/");
  await sendGymNewsPushNotification({
    id: newsId,
    title,
    contentHtml: content_html,
  }).catch((pushError) => {
    console.error("Failed to send gym news push notification", pushError);
  });
  return { success: true };
}

export async function updateNews(id: string, formData: FormData) {
  const supabase = await createClient();
  const hasAccess = await hasServerAdminAccess(supabase, "owner");
  if (!hasAccess) throw new Error("Unauthorized");

  const title = formData.get("title") as string;
  const content_html = formData.get("content_html") as string;
  const image = formData.get("image") as File | null;
  
  const valid_from = formData.get("valid_from") as string || null;
  const valid_to = formData.get("valid_to") as string || null;

  interface UpdateData {
    title: string;
    content_html: string;
    valid_from: string | null;
    valid_to: string | null;
    updated_at: string;
    image_url?: string;
  }

  const updateData: UpdateData = {
    title,
    content_html,
    valid_from: valid_from || null,
    valid_to: valid_to || null,
    updated_at: new Date().toISOString()
  };

  if (image && image.size > 0 && image.name !== "undefined") {
    // Delete existing old image from bucket if we are uploading a new one
    const { data: oldNews } = await supabase.from("gym_news").select("image_url").eq("id", id).single();
    if (oldNews?.image_url) {
      const oldFileName = oldNews.image_url.split('/').pop();
      if (oldFileName) {
        await supabase.storage.from("gym-news-images").remove([oldFileName]);
      }
    }

    const ext = image.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    
    const { error: uploadError } = await supabase.storage
      .from("gym-news-images")
      .upload(fileName, image);

    if (uploadError) {
      throw new Error("Failed to upload image.");
    }

    const { data: publicUrlData } = supabase.storage
      .from("gym-news-images")
      .getPublicUrl(fileName);
      
    updateData.image_url = publicUrlData.publicUrl;
  }

  const { error } = await supabase
    .from("gym_news")
    .update(updateData)
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/news");
  revalidatePath("/");
  return { success: true };
}

export async function deleteNews(id: string) {
  const supabase = await createClient();
  const hasAccess = await hasServerAdminAccess(supabase, "owner");
  if (!hasAccess) throw new Error("Unauthorized");
  
  const { data: oldNews } = await supabase.from("gym_news").select("image_url").eq("id", id).single();

  const { error } = await supabase
    .from("gym_news")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  // Once record is deleted, delete the associated image
  if (oldNews?.image_url) {
    const oldFileName = oldNews.image_url.split('/').pop();
    if (oldFileName) {
      await supabase.storage.from("gym-news-images").remove([oldFileName]);
    }
  }

  revalidatePath("/admin/news");
  revalidatePath("/");
  return { success: true };
}
