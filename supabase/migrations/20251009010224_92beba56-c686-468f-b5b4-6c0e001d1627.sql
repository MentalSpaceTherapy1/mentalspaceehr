-- Create content pack versioning tables

-- Content pack versions table
CREATE TABLE IF NOT EXISTS public.content_pack_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version_number TEXT NOT NULL UNIQUE,
  version_name TEXT NOT NULL,
  content_type TEXT NOT NULL, -- 'document_templates', 'cpt_codes', 'problem_lists', 'assessments', 'mixed'
  description TEXT,
  
  -- Version metadata
  release_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  released_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_draft BOOLEAN NOT NULL DEFAULT true,
  
  -- Content data (JSONB for flexibility)
  content_data JSONB NOT NULL DEFAULT '{}',
  
  -- Dependencies
  requires_version TEXT,
  deprecates_versions TEXT[],
  
  -- Validation
  validation_status TEXT NOT NULL DEFAULT 'pending', -- pending, passed, failed
  validation_errors JSONB DEFAULT '[]',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_content_type CHECK (content_type IN ('document_templates', 'cpt_codes', 'problem_lists', 'assessments', 'mixed')),
  CONSTRAINT valid_validation_status CHECK (validation_status IN ('pending', 'passed', 'failed'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_content_pack_versions_active ON public.content_pack_versions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_content_pack_versions_type ON public.content_pack_versions(content_type);
CREATE INDEX IF NOT EXISTS idx_content_pack_versions_release_date ON public.content_pack_versions(release_date DESC);

-- Content pack changelog table
CREATE TABLE IF NOT EXISTS public.content_pack_changelog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version_id UUID NOT NULL REFERENCES public.content_pack_versions(id) ON DELETE CASCADE,
  
  -- Change details
  change_type TEXT NOT NULL, -- 'added', 'modified', 'removed', 'deprecated'
  entity_type TEXT NOT NULL, -- 'template', 'cpt_code', 'problem', 'assessment', 'field'
  entity_id TEXT NOT NULL,
  entity_name TEXT NOT NULL,
  
  -- Change description
  change_summary TEXT NOT NULL,
  change_details JSONB DEFAULT '{}',
  
  -- Impact assessment
  breaking_change BOOLEAN NOT NULL DEFAULT false,
  migration_required BOOLEAN NOT NULL DEFAULT false,
  migration_script TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_change_type CHECK (change_type IN ('added', 'modified', 'removed', 'deprecated')),
  CONSTRAINT valid_entity_type CHECK (entity_type IN ('template', 'cpt_code', 'problem', 'assessment', 'field', 'validation', 'scoring'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_changelog_version ON public.content_pack_changelog(version_id);
CREATE INDEX IF NOT EXISTS idx_changelog_entity ON public.content_pack_changelog(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_changelog_breaking ON public.content_pack_changelog(breaking_change) WHERE breaking_change = true;

-- Content pack installations table (tracks which versions are applied to the system)
CREATE TABLE IF NOT EXISTS public.content_pack_installations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version_id UUID NOT NULL REFERENCES public.content_pack_versions(id),
  
  -- Installation details
  installed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  installed_by UUID REFERENCES auth.users(id),
  installation_status TEXT NOT NULL DEFAULT 'pending', -- pending, success, failed, rolled_back
  
  -- Migration tracking
  migration_log JSONB DEFAULT '[]',
  rollback_available BOOLEAN NOT NULL DEFAULT true,
  
  -- Error handling
  error_log JSONB DEFAULT '[]',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_installation_status CHECK (installation_status IN ('pending', 'success', 'failed', 'rolled_back'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_installations_version ON public.content_pack_installations(version_id);
CREATE INDEX IF NOT EXISTS idx_installations_status ON public.content_pack_installations(installation_status);
CREATE INDEX IF NOT EXISTS idx_installations_date ON public.content_pack_installations(installed_at DESC);

-- Enable RLS
ALTER TABLE public.content_pack_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_pack_changelog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_pack_installations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for content_pack_versions
CREATE POLICY "Administrators can manage content pack versions"
  ON public.content_pack_versions FOR ALL
  USING (has_role(auth.uid(), 'administrator'));

CREATE POLICY "All authenticated users can view active versions"
  ON public.content_pack_versions FOR SELECT
  USING (auth.uid() IS NOT NULL AND (is_active = true OR is_draft = false));

-- RLS Policies for content_pack_changelog
CREATE POLICY "Administrators can manage changelog"
  ON public.content_pack_changelog FOR ALL
  USING (has_role(auth.uid(), 'administrator'));

CREATE POLICY "All authenticated users can view changelog"
  ON public.content_pack_changelog FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- RLS Policies for content_pack_installations
CREATE POLICY "Administrators can manage installations"
  ON public.content_pack_installations FOR ALL
  USING (has_role(auth.uid(), 'administrator'));

CREATE POLICY "All authenticated users can view installations"
  ON public.content_pack_installations FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Add comments
COMMENT ON TABLE public.content_pack_versions IS 'Stores different versions of clinical content packs including templates, code sets, and assessments';
COMMENT ON TABLE public.content_pack_changelog IS 'Tracks changes between content pack versions for migration and documentation';
COMMENT ON TABLE public.content_pack_installations IS 'Tracks which content pack versions have been installed and their status';