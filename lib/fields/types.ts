/**
 * Field System Types
 * Phase 3: Multi-dimensional table field definitions
 */

// =============================================================================
// Field Type Definitions
// =============================================================================

export type FieldType =
  // Basic types
  | 'text'
  | 'textarea'
  | 'number'
  | 'currency'
  | 'percent'
  // Date/Time
  | 'date'
  | 'datetime'
  | 'duration'
  // Selection types
  | 'select'
  | 'multiselect'
  | 'status'
  | 'priority'
  // Relation types
  | 'user'
  | 'users'
  | 'relation'
  // Media types
  | 'attachment'
  | 'url'
  | 'email'
  | 'phone'
  // Advanced types
  | 'formula'
  | 'rollup'
  | 'lookup'
  | 'progress'
  | 'rating'
  | 'checkbox';

// =============================================================================
// Field Configuration Types
// =============================================================================

export interface TextFieldConfig {
  maxLength?: number;
  minLength?: number;
  placeholder?: string;
  isTitle?: boolean;
}

export interface TextareaFieldConfig {
  maxLength?: number;
  placeholder?: string;
  enableRichText?: boolean;
}

export interface NumberFieldConfig {
  min?: number;
  max?: number;
  precision?: number;
  format?: 'number' | 'currency' | 'percent';
  currencyCode?: string;
  prefix?: string;
  suffix?: string;
}

export interface DateFieldConfig {
  includeTime?: boolean;
  defaultToToday?: boolean;
  dateFormat?: string;
  timeFormat?: '12h' | '24h';
  allowPastDates?: boolean;
  allowFutureDates?: boolean;
}

export interface DurationFieldConfig {
  format?: 'hours' | 'days' | 'weeks';
  showSeconds?: boolean;
}

export interface SelectOption {
  id: string;
  label: string;
  color?: string;
  icon?: string;
  position?: number;
}

export interface SelectFieldConfig {
  options: SelectOption[];
  allowCreate?: boolean;
  defaultValue?: string;
}

export interface MultiSelectFieldConfig {
  options: SelectOption[];
  allowCreate?: boolean;
  maxSelections?: number;
}

export interface StatusFieldConfig {
  options: SelectOption[];
  doneStatuses?: string[]; // IDs of statuses that mark task as done
  defaultStatus?: string;
}

export interface PriorityFieldConfig {
  options: SelectOption[];
  defaultPriority?: string;
}

export interface UserFieldConfig {
  allowMultiple?: boolean;
  scope?: 'project' | 'workspace' | 'organization';
  includeGuests?: boolean;
}

export interface RelationFieldConfig {
  targetProjectId?: string; // null = same project
  relationType?: 'one-to-one' | 'one-to-many' | 'many-to-many';
  reverseName?: string;
  reverseFieldId?: string;
}

export interface FormulaFieldConfig {
  expression: string;
  resultType: 'text' | 'number' | 'date' | 'boolean';
  referencedFields?: string[];
}

export interface RollupFieldConfig {
  relationFieldId: string;
  targetFieldId: string;
  aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'percent_empty' | 'percent_filled' | 'array_unique';
}

export interface LookupFieldConfig {
  relationFieldId: string;
  targetFieldId: string;
}

export interface ProgressFieldConfig {
  min?: number;
  max?: number;
  showPercentage?: boolean;
  color?: string;
}

export interface RatingFieldConfig {
  maxRating?: number;
  icon?: 'star' | 'heart' | 'thumbsup' | 'flag';
  allowHalf?: boolean;
}

export interface CheckboxFieldConfig {
  label?: string;
  defaultValue?: boolean;
}

export interface AttachmentFieldConfig {
  maxFiles?: number;
  maxFileSize?: number; // bytes
  allowedTypes?: string[]; // MIME types
}

export interface UrlFieldConfig {
  placeholder?: string;
  showPreview?: boolean;
}

export interface EmailFieldConfig {
  placeholder?: string;
}

export interface PhoneFieldConfig {
  placeholder?: string;
  defaultCountry?: string;
}

// Union type for all field configs
export type FieldConfig =
  | TextFieldConfig
  | TextareaFieldConfig
  | NumberFieldConfig
  | DateFieldConfig
  | DurationFieldConfig
  | SelectFieldConfig
  | MultiSelectFieldConfig
  | StatusFieldConfig
  | PriorityFieldConfig
  | UserFieldConfig
  | RelationFieldConfig
  | FormulaFieldConfig
  | RollupFieldConfig
  | LookupFieldConfig
  | ProgressFieldConfig
  | RatingFieldConfig
  | CheckboxFieldConfig
  | AttachmentFieldConfig
  | UrlFieldConfig
  | EmailFieldConfig
  | PhoneFieldConfig;

// =============================================================================
// Field Definition Interface
// =============================================================================

export interface FieldDefinition {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  type: FieldType;
  config?: FieldConfig;
  position: number;
  isRequired: boolean;
  isSystem: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FieldOption {
  id: string;
  fieldDefinitionId: string;
  label: string;
  value: string;
  color?: string;
  icon?: string;
  position: number;
  isDefault: boolean;
}

// =============================================================================
// Field Value Types
// =============================================================================

export interface FieldValue {
  id: string;
  taskId: string;
  fieldDefinitionId: string;
  textValue?: string;
  numberValue?: number;
  dateValue?: Date;
  jsonValue?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

// Type-safe field value getters
export type FieldValueMap = {
  text: string;
  textarea: string;
  number: number;
  currency: number;
  percent: number;
  date: Date;
  datetime: Date;
  duration: number;
  select: string;
  multiselect: string[];
  status: string;
  priority: string;
  user: string;
  users: string[];
  relation: string[];
  attachment: string[];
  url: string;
  email: string;
  phone: string;
  formula: string | number | Date | boolean;
  rollup: string | number;
  lookup: unknown;
  progress: number;
  rating: number;
  checkbox: boolean;
};

// =============================================================================
// Field Template
// =============================================================================

export interface FieldTemplate {
  id: string;
  name: string;
  slug: string;
  type: FieldType;
  config?: FieldConfig;
  position: number;
  isDefault: boolean;
  description?: string;
}

// =============================================================================
// System Field Slugs
// =============================================================================

export const SYSTEM_FIELD_SLUGS = {
  TITLE: 'title',
  DESCRIPTION: 'description',
  STATUS: 'status',
  PRIORITY: 'priority',
  ASSIGNEE: 'assignee',
  DUE_DATE: 'due_date',
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
  CREATED_BY: 'created_by',
} as const;

// =============================================================================
// Default Field Templates
// =============================================================================

export const DEFAULT_FIELD_TEMPLATES: Omit<FieldTemplate, 'id'>[] = [
  {
    name: 'Title',
    slug: 'title',
    type: 'text',
    config: { isTitle: true, maxLength: 500 } as TextFieldConfig,
    position: 0,
    isDefault: true,
    description: 'Task title',
  },
  {
    name: 'Description',
    slug: 'description',
    type: 'textarea',
    config: { enableRichText: true } as TextareaFieldConfig,
    position: 1,
    isDefault: true,
    description: 'Task description',
  },
  {
    name: 'Status',
    slug: 'status',
    type: 'status',
    config: {
      options: [
        { id: 'todo', label: 'To Do', color: '#6b7280' },
        { id: 'in_progress', label: 'In Progress', color: '#3b82f6' },
        { id: 'done', label: 'Done', color: '#22c55e' },
      ],
      doneStatuses: ['done'],
      defaultStatus: 'todo',
    } as StatusFieldConfig,
    position: 2,
    isDefault: true,
    description: 'Task status',
  },
  {
    name: 'Priority',
    slug: 'priority',
    type: 'priority',
    config: {
      options: [
        { id: 'low', label: 'Low', color: '#22c55e' },
        { id: 'medium', label: 'Medium', color: '#eab308' },
        { id: 'high', label: 'High', color: '#ef4444' },
        { id: 'urgent', label: 'Urgent', color: '#dc2626' },
      ],
      defaultPriority: 'medium',
    } as PriorityFieldConfig,
    position: 3,
    isDefault: true,
    description: 'Task priority',
  },
  {
    name: 'Assignee',
    slug: 'assignee',
    type: 'user',
    config: { allowMultiple: false, scope: 'project' } as UserFieldConfig,
    position: 4,
    isDefault: true,
    description: 'Task assignee',
  },
  {
    name: 'Due Date',
    slug: 'due_date',
    type: 'date',
    config: { includeTime: false } as DateFieldConfig,
    position: 5,
    isDefault: true,
    description: 'Task due date',
  },
  {
    name: 'Labels',
    slug: 'labels',
    type: 'multiselect',
    config: { options: [], allowCreate: true } as MultiSelectFieldConfig,
    position: 6,
    isDefault: false,
    description: 'Task labels',
  },
  {
    name: 'Estimate',
    slug: 'estimate',
    type: 'number',
    config: { min: 0, format: 'number', suffix: ' hours' } as NumberFieldConfig,
    position: 7,
    isDefault: false,
    description: 'Time estimate in hours',
  },
];
