// File validation utilities for secure uploads
// Prevents malicious files and ensures proper file handling

const ALLOWED_FILE_TYPES = {
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  insurance: ['image/jpeg', 'image/png', 'application/pdf'],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const VALID_EXTENSIONS: Record<string, string[]> = {
  'application/pdf': ['pdf'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/gif': ['gif'],
  'image/webp': ['webp'],
};

export type FileCategory = 'documents' | 'images' | 'insurance';

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFile(file: File, category: FileCategory): FileValidationResult {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size exceeds 10MB limit (${formatFileSize(file.size)})` };
  }

  // Check file type
  const allowedTypes = ALLOWED_FILE_TYPES[category];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedTypes
        .map((t) => t.split('/')[1].toUpperCase())
        .join(', ')}`,
    };
  }

  // Check file extension matches MIME type
  const extension = file.name.split('.').pop()?.toLowerCase();
  const validExtensions = VALID_EXTENSIONS[file.type];

  if (!extension || !validExtensions?.includes(extension)) {
    return {
      valid: false,
      error: 'File extension does not match file type. This could indicate a security risk.',
    };
  }

  return { valid: true };
}

export function sanitizeFilename(filename: string): string {
  // Remove special characters, keep only alphanumeric, dots, dashes, underscores
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
