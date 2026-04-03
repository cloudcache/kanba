/**
 * Automation System Types
 * Phase 5: Workflow automation for tasks
 */

// =============================================================================
// Trigger Types
// =============================================================================

export type TriggerType =
  | 'task_created'
  | 'task_updated'
  | 'task_deleted'
  | 'task_moved'
  | 'task_completed'
  | 'field_changed'
  | 'due_date_approaching'
  | 'due_date_passed'
  | 'comment_added'
  | 'attachment_added'
  | 'assignee_changed'
  | 'scheduled';

export interface BaseTrigger {
  id: string;
  type: TriggerType;
  enabled: boolean;
}

export interface TaskCreatedTrigger extends BaseTrigger {
  type: 'task_created';
  config: {
    projectId?: string;
    columnId?: string;
  };
}

export interface TaskUpdatedTrigger extends BaseTrigger {
  type: 'task_updated';
  config: {
    projectId?: string;
    fields?: string[]; // Specific fields to watch
  };
}

export interface FieldChangedTrigger extends BaseTrigger {
  type: 'field_changed';
  config: {
    fieldId: string;
    fromValue?: unknown;
    toValue?: unknown;
  };
}

export interface DueDateTrigger extends BaseTrigger {
  type: 'due_date_approaching' | 'due_date_passed';
  config: {
    daysBefore?: number; // For approaching
    daysAfter?: number;  // For passed
  };
}

export interface ScheduledTrigger extends BaseTrigger {
  type: 'scheduled';
  config: {
    cron: string; // Cron expression
    timezone?: string;
  };
}

export type Trigger = 
  | TaskCreatedTrigger
  | TaskUpdatedTrigger
  | FieldChangedTrigger
  | DueDateTrigger
  | ScheduledTrigger
  | BaseTrigger;

// =============================================================================
// Condition Types
// =============================================================================

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'is_empty'
  | 'is_not_empty'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'is_any_of'
  | 'is_none_of';

export interface Condition {
  id: string;
  fieldId: string;
  operator: ConditionOperator;
  value?: unknown;
}

export interface ConditionGroup {
  id: string;
  operator: 'and' | 'or';
  conditions: (Condition | ConditionGroup)[];
}

// =============================================================================
// Action Types
// =============================================================================

export type ActionType =
  | 'update_field'
  | 'move_task'
  | 'assign_user'
  | 'add_label'
  | 'remove_label'
  | 'add_comment'
  | 'send_notification'
  | 'send_email'
  | 'send_webhook'
  | 'create_task'
  | 'duplicate_task'
  | 'archive_task'
  | 'delete_task';

export interface BaseAction {
  id: string;
  type: ActionType;
  enabled: boolean;
}

export interface UpdateFieldAction extends BaseAction {
  type: 'update_field';
  config: {
    fieldId: string;
    value: unknown; // Can be static value or formula
    useFormula?: boolean;
  };
}

export interface MoveTaskAction extends BaseAction {
  type: 'move_task';
  config: {
    columnId?: string;
    projectId?: string;
    position?: 'top' | 'bottom';
  };
}

export interface AssignUserAction extends BaseAction {
  type: 'assign_user';
  config: {
    userId?: string;
    useCreator?: boolean;
    useRoundRobin?: boolean;
    roundRobinUserIds?: string[];
  };
}

export interface AddLabelAction extends BaseAction {
  type: 'add_label';
  config: {
    labelId: string;
  };
}

export interface AddCommentAction extends BaseAction {
  type: 'add_comment';
  config: {
    content: string; // Can include variables like {task.title}
    authorId?: string; // If not set, uses system user
  };
}

export interface SendNotificationAction extends BaseAction {
  type: 'send_notification';
  config: {
    recipientType: 'assignee' | 'creator' | 'specific' | 'project_members';
    recipientIds?: string[];
    title: string;
    body: string;
  };
}

export interface SendEmailAction extends BaseAction {
  type: 'send_email';
  config: {
    recipientType: 'assignee' | 'creator' | 'specific';
    recipientEmails?: string[];
    subject: string;
    body: string;
    isHtml?: boolean;
  };
}

export interface SendWebhookAction extends BaseAction {
  type: 'send_webhook';
  config: {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH';
    headers?: Record<string, string>;
    body?: unknown;
    includeTaskData?: boolean;
  };
}

export interface CreateTaskAction extends BaseAction {
  type: 'create_task';
  config: {
    title: string;
    description?: string;
    columnId?: string;
    priority?: string;
    assignedTo?: string;
    linkToTriggerTask?: boolean;
    linkType?: string;
  };
}

export type Action =
  | UpdateFieldAction
  | MoveTaskAction
  | AssignUserAction
  | AddLabelAction
  | AddCommentAction
  | SendNotificationAction
  | SendEmailAction
  | SendWebhookAction
  | CreateTaskAction
  | BaseAction;

// =============================================================================
// Automation Rule
// =============================================================================

export interface AutomationRule {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  enabled: boolean;
  
  // Trigger
  trigger: Trigger;
  
  // Conditions (optional)
  conditions?: ConditionGroup;
  
  // Actions
  actions: Action[];
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastTriggeredAt?: Date;
  triggerCount: number;
}

// =============================================================================
// Execution Context
// =============================================================================

export interface AutomationContext {
  // The task that triggered the automation
  task: Record<string, unknown>;
  
  // Previous task state (for update triggers)
  previousTask?: Record<string, unknown>;
  
  // Changed fields (for update triggers)
  changedFields?: string[];
  
  // Project context
  project: {
    id: string;
    name: string;
  };
  
  // User who triggered the automation (if applicable)
  triggeredBy?: {
    id: string;
    email: string;
    name?: string;
  };
  
  // Timestamp
  triggeredAt: Date;
}

export interface AutomationExecutionResult {
  ruleId: string;
  success: boolean;
  actionsExecuted: number;
  actionResults: {
    actionId: string;
    actionType: ActionType;
    success: boolean;
    error?: string;
  }[];
  error?: string;
  executedAt: Date;
  duration: number; // ms
}

// =============================================================================
// Automation Templates
// =============================================================================

export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  trigger: Omit<Trigger, 'id'>;
  conditions?: Omit<ConditionGroup, 'id'>;
  actions: Omit<Action, 'id'>[];
}

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    id: 'auto-assign-on-create',
    name: 'Auto-assign new tasks',
    description: 'Automatically assign newly created tasks to a team member',
    category: 'assignment',
    trigger: {
      type: 'task_created',
      enabled: true,
      config: {},
    },
    actions: [
      {
        type: 'assign_user',
        enabled: true,
        config: {
          useRoundRobin: true,
          roundRobinUserIds: [],
        },
      },
    ],
  },
  {
    id: 'move-on-complete',
    name: 'Move completed tasks',
    description: 'Move tasks to Done column when marked as complete',
    category: 'workflow',
    trigger: {
      type: 'task_completed',
      enabled: true,
      config: {},
    },
    actions: [
      {
        type: 'move_task',
        enabled: true,
        config: {
          // Column ID to be filled in
        },
      },
    ],
  },
  {
    id: 'notify-on-due-date',
    name: 'Due date reminder',
    description: 'Send notification when due date is approaching',
    category: 'notification',
    trigger: {
      type: 'due_date_approaching',
      enabled: true,
      config: {
        daysBefore: 1,
      },
    },
    actions: [
      {
        type: 'send_notification',
        enabled: true,
        config: {
          recipientType: 'assignee',
          title: 'Task due soon',
          body: 'Your task "{task.title}" is due tomorrow.',
        },
      },
    ],
  },
  {
    id: 'add-label-high-priority',
    name: 'Label high priority tasks',
    description: 'Add urgent label when priority is set to high',
    category: 'labeling',
    trigger: {
      type: 'field_changed',
      enabled: true,
      config: {
        fieldId: 'priority',
        toValue: 'high',
      },
    },
    actions: [
      {
        type: 'add_label',
        enabled: true,
        config: {
          labelId: '', // To be filled in
        },
      },
    ],
  },
  {
    id: 'webhook-on-complete',
    name: 'Webhook on completion',
    description: 'Send webhook when task is completed',
    category: 'integration',
    trigger: {
      type: 'task_completed',
      enabled: true,
      config: {},
    },
    actions: [
      {
        type: 'send_webhook',
        enabled: true,
        config: {
          url: '',
          method: 'POST',
          includeTaskData: true,
        },
      },
    ],
  },
];
