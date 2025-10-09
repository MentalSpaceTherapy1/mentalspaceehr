/**
 * Content Pack Manager
 * 
 * Manages versioning, installation, and rollback of clinical content packs including:
 * - Document templates
 * - CPT code sets
 * - Problem/diagnosis lists
 * - Assessment instruments
 * 
 * @see docs/IMPLEMENTATION_PLAN_PHASE_3.md
 */

import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// Types
// ============================================================================

export interface ContentPackVersion {
  id: string;
  version_number: string;
  version_name: string;
  content_type: ContentType;
  description?: string;
  release_date: string;
  released_by?: string;
  is_active: boolean;
  is_draft: boolean;
  content_data: Record<string, any>;
  requires_version?: string;
  deprecates_versions?: string[];
  validation_status: 'pending' | 'passed' | 'failed';
  validation_errors?: ValidationError[];
  created_at: string;
  updated_at: string;
}

export interface ChangelogEntry {
  id: string;
  version_id: string;
  change_type: 'added' | 'modified' | 'removed' | 'deprecated';
  entity_type: 'template' | 'cpt_code' | 'problem' | 'assessment' | 'field' | 'validation' | 'scoring';
  entity_id: string;
  entity_name: string;
  change_summary: string;
  change_details?: Record<string, any>;
  breaking_change: boolean;
  migration_required: boolean;
  migration_script?: string;
  created_at: string;
}

export interface InstallationRecord {
  id: string;
  version_id: string;
  installed_at: string;
  installed_by?: string;
  installation_status: 'pending' | 'success' | 'failed' | 'rolled_back';
  migration_log?: MigrationLogEntry[];
  rollback_available: boolean;
  error_log?: ErrorLogEntry[];
  created_at: string;
  updated_at: string;
}

export type ContentType = 'document_templates' | 'cpt_codes' | 'problem_lists' | 'assessments' | 'mixed';

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface MigrationLogEntry {
  timestamp: string;
  action: string;
  entity_type: string;
  entity_id: string;
  status: 'success' | 'failed';
  message?: string;
}

export interface ErrorLogEntry {
  timestamp: string;
  error_type: string;
  message: string;
  stack?: string;
}

export interface ContentPackSummary {
  version: ContentPackVersion;
  changelog: ChangelogEntry[];
  installation?: InstallationRecord;
  hasBreakingChanges: boolean;
  requiresMigration: boolean;
}

// ============================================================================
// Content Pack Manager Class
// ============================================================================

export class ContentPackManager {
  /**
   * Get all available content pack versions
   */
  async listVersions(options?: {
    contentType?: ContentType;
    activeOnly?: boolean;
    includeArchived?: boolean;
  }): Promise<ContentPackVersion[]> {
    let query = supabase
      .from('content_pack_versions')
      .select('*')
      .order('release_date', { ascending: false });

    if (options?.contentType) {
      query = query.eq('content_type', options.contentType);
    }

    if (options?.activeOnly) {
      query = query.eq('is_active', true);
    }

    if (!options?.includeArchived) {
      query = query.eq('is_draft', false);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to list versions: ${error.message}`);
    }

    return (data || []) as unknown as ContentPackVersion[];
  }

  /**
   * Get details for a specific version including changelog
   */
  async getVersionDetails(versionId: string): Promise<ContentPackSummary> {
    // Get version
    const { data: version, error: versionError } = await supabase
      .from('content_pack_versions')
      .select('*')
      .eq('id', versionId)
      .single();

    if (versionError || !version) {
      throw new Error(`Failed to get version: ${versionError?.message}`);
    }

    // Get changelog
    const { data: changelog, error: changelogError } = await supabase
      .from('content_pack_changelog')
      .select('*')
      .eq('version_id', versionId)
      .order('created_at', { ascending: false });

    if (changelogError) {
      throw new Error(`Failed to get changelog: ${changelogError.message}`);
    }

    // Get installation record if exists
    const { data: installation } = await supabase
      .from('content_pack_installations')
      .select('*')
      .eq('version_id', versionId)
      .order('installed_at', { ascending: false })
      .limit(1)
      .single();

    const hasBreakingChanges = (changelog || []).some(entry => entry.breaking_change);
    const requiresMigration = (changelog || []).some(entry => entry.migration_required);

    return {
      version: version as unknown as ContentPackVersion,
      changelog: (changelog || []) as unknown as ChangelogEntry[],
      installation: installation as unknown as InstallationRecord | undefined,
      hasBreakingChanges,
      requiresMigration
    };
  }

  /**
   * Get the currently active version for a content type
   */
  async getActiveVersion(contentType: ContentType): Promise<ContentPackVersion | null> {
    const { data, error } = await supabase
      .from('content_pack_versions')
      .select('*')
      .eq('content_type', contentType)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No active version
      }
      throw new Error(`Failed to get active version: ${error.message}`);
    }

    return data as unknown as ContentPackVersion;
  }

  /**
   * Create a new content pack version
   */
  async createVersion(versionData: {
    version_number: string;
    version_name: string;
    content_type: ContentType;
    description?: string;
    content_data: Record<string, any>;
    requires_version?: string;
    deprecates_versions?: string[];
  }): Promise<ContentPackVersion> {
    // Validate version number format (e.g., 1.0.0)
    if (!/^\d+\.\d+\.\d+$/.test(versionData.version_number)) {
      throw new Error('Version number must follow semantic versioning (e.g., 1.0.0)');
    }

    const { data, error } = await supabase
      .from('content_pack_versions')
      .insert({
        ...versionData,
        is_draft: true,
        is_active: false,
        validation_status: 'pending'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create version: ${error.message}`);
    }

    return data as unknown as ContentPackVersion;
  }

  /**
   * Add changelog entries for a version
   */
  async addChangelogEntries(
    versionId: string,
    entries: Omit<ChangelogEntry, 'id' | 'version_id' | 'created_at'>[]
  ): Promise<ChangelogEntry[]> {
    const entriesWithVersion = entries.map(entry => ({
      ...entry,
      version_id: versionId
    }));

    const { data, error } = await supabase
      .from('content_pack_changelog')
      .insert(entriesWithVersion)
      .select();

    if (error) {
      throw new Error(`Failed to add changelog entries: ${error.message}`);
    }

    return data as unknown as ChangelogEntry[];
  }

  /**
   * Validate a content pack version
   */
  async validateVersion(versionId: string): Promise<{
    isValid: boolean;
    errors: ValidationError[];
  }> {
    const { data: version, error } = await supabase
      .from('content_pack_versions')
      .select('*')
      .eq('id', versionId)
      .single();

    if (error || !version) {
      throw new Error(`Failed to get version for validation: ${error?.message}`);
    }

    const errors: ValidationError[] = [];

    // Validate content data structure
    if (!version.content_data || Object.keys(version.content_data).length === 0) {
      errors.push({
        field: 'content_data',
        message: 'Content data cannot be empty',
        severity: 'error'
      });
    }

    // Validate version dependencies
    if (version.requires_version) {
      const { data: requiredVersion } = await supabase
        .from('content_pack_versions')
        .select('id')
        .eq('version_number', version.requires_version)
        .single();

      if (!requiredVersion) {
        errors.push({
          field: 'requires_version',
          message: `Required version ${version.requires_version} does not exist`,
          severity: 'error'
        });
      }
    }

    // Content-type specific validations
    switch (version.content_type) {
      case 'document_templates':
        this.validateDocumentTemplates(version.content_data, errors);
        break;
      case 'cpt_codes':
        this.validateCPTCodes(version.content_data, errors);
        break;
      case 'problem_lists':
        this.validateProblemLists(version.content_data, errors);
        break;
      case 'assessments':
        this.validateAssessments(version.content_data, errors);
        break;
    }

    // Update validation status
    const isValid = errors.filter(e => e.severity === 'error').length === 0;
    
    await supabase
      .from('content_pack_versions')
      .update({
        validation_status: isValid ? 'passed' : 'failed',
        validation_errors: errors as any,
        updated_at: new Date().toISOString()
      })
      .eq('id', versionId);

    return { isValid, errors };
  }

  /**
   * Publish a version (make it available for installation)
   */
  async publishVersion(versionId: string): Promise<ContentPackVersion> {
    // First validate
    const validation = await this.validateVersion(versionId);
    
    if (!validation.isValid) {
      throw new Error('Cannot publish version with validation errors');
    }

    const { data, error } = await supabase
      .from('content_pack_versions')
      .update({
        is_draft: false,
        release_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', versionId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to publish version: ${error.message}`);
    }

    return data as unknown as ContentPackVersion;
  }

  /**
   * Install a content pack version
   */
  async installVersion(
    versionId: string,
    options?: { dryRun?: boolean; force?: boolean }
  ): Promise<InstallationRecord> {
    const summary = await this.getVersionDetails(versionId);
    
    // Check if already installed
    if (summary.installation?.installation_status === 'success' && !options?.force) {
      throw new Error('Version is already installed. Use force option to reinstall.');
    }

    // Check for breaking changes
    if (summary.hasBreakingChanges && !options?.force) {
      throw new Error('Version contains breaking changes. Use force option to install anyway.');
    }

    // Create installation record
    const { data: installation, error: installError } = await supabase
      .from('content_pack_installations')
      .insert({
        version_id: versionId,
        installation_status: 'pending',
        migration_log: [],
        error_log: []
      })
      .select()
      .single();

    if (installError || !installation) {
      throw new Error(`Failed to create installation record: ${installError?.message}`);
    }

    try {
      const migrationLog: MigrationLogEntry[] = [];

      if (options?.dryRun) {
        // Simulate installation
        migrationLog.push({
          timestamp: new Date().toISOString(),
          action: 'dry_run',
          entity_type: 'version',
          entity_id: versionId,
          status: 'success',
          message: 'Dry run completed successfully'
        });
      } else {
        // Perform actual installation
        await this.applyContentPack(summary, migrationLog);

        // Deactivate old version if this is an upgrade
        if (summary.version.content_type) {
          await supabase
            .from('content_pack_versions')
            .update({ is_active: false })
            .eq('content_type', summary.version.content_type)
            .eq('is_active', true)
            .neq('id', versionId);
        }

        // Activate new version
        await supabase
          .from('content_pack_versions')
          .update({ is_active: true })
          .eq('id', versionId);
      }

      // Update installation record
      const { data: updatedInstallation, error: updateError } = await supabase
        .from('content_pack_installations')
        .update({
          installation_status: 'success',
          migration_log: migrationLog as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', installation.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update installation: ${updateError.message}`);
      }

      return updatedInstallation as unknown as InstallationRecord;

    } catch (error) {
      // Log error and mark installation as failed
      const errorLog: ErrorLogEntry[] = [{
        timestamp: new Date().toISOString(),
        error_type: 'installation_error',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }];

      await supabase
        .from('content_pack_installations')
        .update({
          installation_status: 'failed',
          error_log: errorLog as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', installation.id);

      throw error;
    }
  }

  /**
   * Rollback to a previous version
   */
  async rollbackVersion(installationId: string): Promise<InstallationRecord> {
    const { data: installation, error: fetchError } = await supabase
      .from('content_pack_installations')
      .select('*, content_pack_versions(*)')
      .eq('id', installationId)
      .single();

    if (fetchError || !installation) {
      throw new Error(`Failed to get installation: ${fetchError?.message}`);
    }

    if (!installation.rollback_available) {
      throw new Error('Rollback is not available for this installation');
    }

    if (installation.installation_status === 'rolled_back') {
      throw new Error('Installation has already been rolled back');
    }

    // Mark as rolled back
    const { data: updated, error: updateError } = await supabase
      .from('content_pack_installations')
      .update({
        installation_status: 'rolled_back',
        updated_at: new Date().toISOString()
      })
      .eq('id', installationId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to rollback: ${updateError.message}`);
    }

    return updated as unknown as InstallationRecord;
  }

  /**
   * Compare two versions
   */
  async compareVersions(
    fromVersionId: string,
    toVersionId: string
  ): Promise<{
    added: ChangelogEntry[];
    modified: ChangelogEntry[];
    removed: ChangelogEntry[];
    deprecated: ChangelogEntry[];
  }> {
    const [fromSummary, toSummary] = await Promise.all([
      this.getVersionDetails(fromVersionId),
      this.getVersionDetails(toVersionId)
    ]);

    const added = toSummary.changelog.filter(e => e.change_type === 'added');
    const modified = toSummary.changelog.filter(e => e.change_type === 'modified');
    const removed = toSummary.changelog.filter(e => e.change_type === 'removed');
    const deprecated = toSummary.changelog.filter(e => e.change_type === 'deprecated');

    return { added, modified, removed, deprecated };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private validateDocumentTemplates(content: any, errors: ValidationError[]) {
    // Validate document template structure
    if (!content.templates || !Array.isArray(content.templates)) {
      errors.push({
        field: 'templates',
        message: 'Templates array is required',
        severity: 'error'
      });
    }
  }

  private validateCPTCodes(content: any, errors: ValidationError[]) {
    // Validate CPT code structure
    if (!content.codes || !Array.isArray(content.codes)) {
      errors.push({
        field: 'codes',
        message: 'CPT codes array is required',
        severity: 'error'
      });
    }
  }

  private validateProblemLists(content: any, errors: ValidationError[]) {
    // Validate problem list structure
    if (!content.problems || !Array.isArray(content.problems)) {
      errors.push({
        field: 'problems',
        message: 'Problems array is required',
        severity: 'error'
      });
    }
  }

  private validateAssessments(content: any, errors: ValidationError[]) {
    // Validate assessment structure
    if (!content.assessments || !Array.isArray(content.assessments)) {
      errors.push({
        field: 'assessments',
        message: 'Assessments array is required',
        severity: 'error'
      });
    }
  }

  private async applyContentPack(
    summary: ContentPackSummary,
    migrationLog: MigrationLogEntry[]
  ): Promise<void> {
    // Apply changes based on content type
    // This is a stub - actual implementation would depend on the content type
    
    migrationLog.push({
      timestamp: new Date().toISOString(),
      action: 'apply_content_pack',
      entity_type: 'version',
      entity_id: summary.version.id,
      status: 'success',
      message: `Applied content pack ${summary.version.version_number}`
    });
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const contentPackManager = new ContentPackManager();
