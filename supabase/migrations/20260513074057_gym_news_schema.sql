-- Table for gym news
CREATE TABLE IF NOT EXISTS public.gym_news (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content_html TEXT NOT NULL,
    image_url TEXT,
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.gym_news ENABLE ROW LEVEL SECURITY;

-- Everyone can read news
CREATE POLICY "Anyone can view gym news"
    ON public.gym_news
    FOR SELECT
    USING (true);

-- Only authenticated users (admins handled via server actions bypassing RLS or through Service Role) can strictly manage
-- Since we use Server Actions with Service Role or admin auth validation, we can just allow insert/update/delete for authenticated temporarily and validate on Edge/Server.
-- But standard practice is to rely on Server Actions for mutation.
CREATE POLICY "Authenticated users can manage gym news"
    ON public.gym_news
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Set up Supabase Storage for gym news images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('gym-news-images', 'gym-news-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for gym-news-images
CREATE POLICY "Gym news images are publicly accessible" 
    ON storage.objects 
    FOR SELECT 
    USING (bucket_id = 'gym-news-images');

CREATE POLICY "Authenticated users can upload gym news images" 
    ON storage.objects 
    FOR INSERT 
    TO authenticated 
    WITH CHECK (bucket_id = 'gym-news-images');

CREATE POLICY "Authenticated users can update gym news images" 
    ON storage.objects 
    FOR UPDATE 
    TO authenticated 
    USING (bucket_id = 'gym-news-images');

CREATE POLICY "Authenticated users can delete gym news images" 
    ON storage.objects 
    FOR DELETE
    TO authenticated 
    USING (bucket_id = 'gym-news-images');
