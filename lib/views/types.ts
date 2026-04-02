/**
 * View System Types
 * Phase 3: Multi-view support for tasks
 */

// =============================================================================
// View Types
// =============================================================================

export type ViewType =
  | 'kanban'
  | 'list'
  | 'table'
  | 'calendar'
  | 'timeline'
  | 'gantt'
  | 'gallery';

// =============================================================================
// Filter Types
// =============================================================================

export type FilterOperator =
  // Equality
  | 'equals'
  | 'not_equals'
  // String
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  // Empty
  | 'is_empty'
  | 'is_not_empty'
  // Comparison
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  // Array
  | 'is_any_of'
  | 'is_none_of'
  // Date
  | 'today'
  | 'tomorrow'
  | 'yesterday'
  | 'this_week'
  | 'next_week'
  | 'last_week'
  | 'this_month'
  | 'next_month'
  | 'last_month'
  | 'past'
  | 'future'
  | 'days_ago'
  | 'days_from_now';

export interface FilterCondition {
  id: string;
  fieldId: string;
  operator: FilterOperator;
  value?: unknown;
}

export interface FilterGroup {
  operator: 'and' | 'or';
  conditions: (FilterCondition | FilterGroup)[];
}

// =============================================================================
// Sort Types
// =============================================================================

export interface SortConfig {
  fieldId: string;
  direction: 'asc' | 'desc';
}

// =============================================================================
// Field Display Config
// =============================================================================

export interface FieldDisplayConfig {
  visible: string[];       // Field IDs to show
  order: string[];         // Field order
  widths?: Record<string, number>; // Column widths in pixels
  frozen?: string[];       // Frozen/pinned fields
}

// =============================================================================
// View-Specific Configurations
// =============================================================================

export interface KanbanConfig {
  groupFieldId: string;    // Field to group by (usually status)
  cardFields: string[];    // Fields to show on cards
  cardSize?: 'compact' | 'normal' | 'large';
  showEmptyGroups?: boolean;
  showTaskCount?: boolean;
  colorFieldId?: string;   // Field to use for card color
  coverFieldId?: string;   // Attachment field for card cover
  columnSettings?: Record<string, {
    collapsed?: boolean;
    limit?: number;
    color?: string;
  }>;
}

export interface ListConfig {
  groupFieldId?: string;
  showCheckboxes?: boolean;
  indentation?: boolean;   // Show task hierarchy indentation
  rowHeight?: 'compact' | 'normal' | 'comfortable';
}

export interface TableConfig {
  rowHeight?: 'compact' | 'normal' | 'comfortable';
  wrapText?: boolean;
  showRowNumbers?: boolean;
  alternateRowColors?: boolean;
  horizontalLines?: boolean;
  verticalLines?: boolean;
}

export interface CalendarConfig {
  startDateFieldId: string;
  endDateFieldId?: string;
  titleFieldId?: string;
  colorFieldId?: string;
  defaultView?: 'month' | 'week' | 'day' | 'agenda';
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday
  showWeekNumbers?: boolean;
}

export interface TimelineConfig {
  dateFieldId: string;
  groupByFieldId?: string;
  scale?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  showMilestones?: boolean;
  milestoneFieldId?: string;
}

export interface GanttConfig {
  startDateFieldId: string;
  endDateFieldId: string;
  progressFieldId?: string;
  dependencyLinkType?: 'blocks' | 'blocked_by';
  showCriticalPath?: boolean;
  showDependencies?: boolean;
  showProgress?: boolean;
  scale?: 'day' | 'week' | 'month' | 'quarter';
  columnWidth?: number;
}

export interface GalleryConfig {
  coverFieldId?: string;   // Attachment field for cover
  titleFieldId?: string;
  cardFields?: string[];
  cardSize?: 'small' | 'medium' | 'large';
  cardsPerRow?: number;
  showEmptyCover?: boolean;
}

// =============================================================================
// View Configuration
// =============================================================================

export interface ViewConfig {
  // Common config
  fields: FieldDisplayConfig;
  
  // Filters
  filters?: FilterGroup;
  
  // Sorting
  sorts?: SortConfig[];
  
  // Grouping (for views that support it)
  groupBy?: {
    fieldId: string;
    collapsed?: string[];    // Collapsed group IDs
    order?: string[];        // Custom group order
  };
  
  // View-specific config
  kanban?: KanbanConfig;
  list?: ListConfig;
  table?: TableConfig;
  calendar?: CalendarConfig;
  timeline?: TimelineConfig;
  gantt?: GanttConfig;
  gallery?: GalleryConfig;
}

// =============================================================================
// View Interface
// =============================================================================

export interface View {
  id: string;
  projectId: string;
  name: string;
  type: ViewType;
  config: ViewConfig;
  isDefault: boolean;
  isPersonal: boolean;
  isLocked: boolean;
  createdBy?: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// Default View Configs
// =============================================================================

export const DEFAULT_KANBAN_CONFIG: KanbanConfig = {
  groupFieldId: 'status',
  cardFields: ['assignee', 'priority', 'due_date'],
  cardSize: 'normal',
  showEmptyGroups: true,
  showTaskCount: true,
};

export const DEFAULT_LIST_CONFIG: ListConfig = {
  showCheckboxes: true,
  indentation: true,
  rowHeight: 'normal',
};

export const DEFAULT_TABLE_CONFIG: TableConfig = {
  rowHeight: 'normal',
  wrapText: false,
  showRowNumbers: false,
  alternateRowColors: true,
  horizontalLines: true,
  verticalLines: false,
};

export const DEFAULT_CALENDAR_CONFIG: CalendarConfig = {
  startDateFieldId: 'due_date',
  defaultView: 'month',
  weekStartsOn: 1,
  showWeekNumbers: false,
};

export const DEFAULT_TIMELINE_CONFIG: TimelineConfig = {
  dateFieldId: 'due_date',
  scale: 'week',
  showMilestones: true,
};

export const DEFAULT_GANTT_CONFIG: GanttConfig = {
  startDateFieldId: 'start_date',
  endDateFieldId: 'due_date',
  showCriticalPath: false,
  showDependencies: true,
  showProgress: true,
  scale: 'week',
};

export const DEFAULT_GALLERY_CONFIG: GalleryConfig = {
  cardSize: 'medium',
  cardsPerRow: 4,
  showEmptyCover: true,
};

// =============================================================================
// Default Views
// =============================================================================

export const DEFAULT_VIEWS: Omit<View, 'id' | 'projectId' | 'createdBy' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Board',
    type: 'kanban',
    config: {
      fields: {
        visible: ['title', 'assignee', 'priority', 'due_date'],
        order: ['title', 'assignee', 'priority', 'due_date'],
      },
      kanban: DEFAULT_KANBAN_CONFIG,
    },
    isDefault: true,
    isPersonal: false,
    isLocked: false,
    position: 0,
  },
  {
    name: 'List',
    type: 'list',
    config: {
      fields: {
        visible: ['title', 'status', 'assignee', 'priority', 'due_date'],
        order: ['title', 'status', 'assignee', 'priority', 'due_date'],
      },
      list: DEFAULT_LIST_CONFIG,
    },
    isDefault: false,
    isPersonal: false,
    isLocked: false,
    position: 1,
  },
  {
    name: 'Table',
    type: 'table',
    config: {
      fields: {
        visible: ['title', 'status', 'assignee', 'priority', 'due_date', 'created_at'],
        order: ['title', 'status', 'assignee', 'priority', 'due_date', 'created_at'],
      },
      table: DEFAULT_TABLE_CONFIG,
    },
    isDefault: false,
    isPersonal: false,
    isLocked: false,
    position: 2,
  },
];
