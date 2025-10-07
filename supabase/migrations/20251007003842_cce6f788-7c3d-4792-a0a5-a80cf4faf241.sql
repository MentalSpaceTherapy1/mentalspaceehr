-- Enhance document_templates table for rich template functionality
ALTER TABLE document_templates
ADD COLUMN IF NOT EXISTS template_content text,
ADD COLUMN IF NOT EXISTS variables jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS signature_fields jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS template_category text,
ADD COLUMN IF NOT EXISTS default_file_name text,
ADD COLUMN IF NOT EXISTS auto_generate_pdf boolean DEFAULT true;

-- Add comment for clarity
COMMENT ON COLUMN document_templates.template_content IS 'HTML/rich text content with variable placeholders like {{clientName}}';
COMMENT ON COLUMN document_templates.variables IS 'Array of variable definitions: [{name, type, defaultValue, required}]';
COMMENT ON COLUMN document_templates.signature_fields IS 'Array of signature requirements: [{fieldId, label, requiredSigner, position}]';

-- Create index for faster template searches
CREATE INDEX IF NOT EXISTS idx_document_templates_category ON document_templates(template_category);
CREATE INDEX IF NOT EXISTS idx_document_templates_active ON document_templates(is_active);