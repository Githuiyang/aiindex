-- 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 用户档案表（依赖 Supabase auth.users）
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. AI 优秀实践链接表
CREATE TABLE public.practice_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  source_domain TEXT,
  source_logo_url TEXT,
  cover_image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 生图资源表
CREATE TABLE public.image_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  storage_path TEXT NOT NULL, -- Supabase storage path
  prompt_text TEXT NOT NULL,
  model TEXT,
  width INT,
  height INT,
  blur_data_url TEXT,
  tags TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published','archived')),
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 投稿待审表
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submitted_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL, -- 临时文件路径（submissions 桶）
  prompt_text TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  review_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- 5. 博客文章表
CREATE TABLE public.blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT,
  content_md TEXT NOT NULL,
  cover_image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 行级安全（RLS）
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- 权限：匿名与认证角色基础授权
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT UPDATE ON public.profiles TO authenticated;

-- practice_links：已发布内容公开可读；写权限仅管理员
CREATE POLICY "公开读取已发布实践" ON public.practice_links FOR SELECT TO anon USING (status = 'published');
CREATE POLICY "管理员可管理实践" ON public.practice_links FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- image_assets：已发布图片公开可读；写权限仅管理员
CREATE POLICY "公开读取已发布图片" ON public.image_assets FOR SELECT TO anon USING (status = 'published');
CREATE POLICY "管理员可管理图片" ON public.image_assets FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- submissions：用户可创建与查看自己的投稿；审核仅管理员
CREATE POLICY "用户可创建投稿" ON public.submissions FOR INSERT TO authenticated WITH CHECK (submitted_by = auth.uid());
CREATE POLICY "用户可查看自己投稿" ON public.submissions FOR SELECT TO authenticated USING (submitted_by = auth.uid());
CREATE POLICY "管理员可审核投稿" ON public.submissions FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- blog_posts：已发布文章公开可读；写权限仅管理员
CREATE POLICY "公开读取已发布博客" ON public.blog_posts FOR SELECT TO anon USING (status = 'published');
CREATE POLICY "管理员可管理博客" ON public.blog_posts FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);