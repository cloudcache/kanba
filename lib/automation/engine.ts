/**
 * Automation Engine
 * Phase 5: Executes automation rules
 */

import type {
  AutomationRule,
  AutomationContext,
  AutomationExecutionResult,
  Trigger,
  TriggerType,
  ConditionGroup,
  Condition,
  ConditionOperator,
  Action,
  ActionType,
} from './types';

// =============================================================================
// Condition Evaluator
// =============================================================================

class ConditionEvaluator {
  evaluate(conditions: ConditionGroup | undefined, context: AutomationContext): boolean {
    if (!conditions || conditions.conditions.length === 0) {
      return true;
    }

    return this.evaluateGroup(conditions, context);
  }

  private evaluateGroup(group: ConditionGroup, context: AutomationContext): boolean {
    const results = group.conditions.map((condition) => {
      if ('conditions' in condition) {
        return this.evaluateGroup(condition as ConditionGroup, context);
      }
      return this.evaluateCondition(condition as Condition, context);
    });

    if (group.operator === 'and') {
      return results.every(Boolean);
    }
    return results.some(Boolean);
  }

  private evaluateCondition(condition: Condition, context: AutomationContext): boolean {
    const fieldValue = this.getFieldValue(condition.fieldId, context);
    const compareValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return fieldValue === compareValue;
      case 'not_equals':
        return fieldValue !== compareValue;
      case 'contains':
        return String(fieldValue || '').includes(String(compareValue || ''));
      case 'not_contains':
        return !String(fieldValue || '').includes(String(compareValue || ''));
      case 'is_empty':
        return fieldValue === null || fieldValue === undefined || fieldValue === '';
      case 'is_not_empty':
        return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
      case 'gt':
        return Number(fieldValue) > Number(compareValue);
      case 'gte':
        return Number(fieldValue) >= Number(compareValue);
      case 'lt':
        return Number(fieldValue) < Number(compareValue);
      case 'lte':
        return Number(fieldValue) <= Number(compareValue);
      case 'is_any_of':
        return Array.isArray(compareValue) && compareValue.includes(fieldValue);
      case 'is_none_of':
        return Array.isArray(compareValue) && !compareValue.includes(fieldValue);
      default:
        return true;
    }
  }

  private getFieldValue(fieldId: string, context: AutomationContext): unknown {
    // Check task fields first
    if (fieldId in context.task) {
      return context.task[fieldId];
    }
    
    // Check for nested paths (e.g., "assignee.name")
    const parts = fieldId.split('.');
    let value: unknown = context.task;
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }
}

// =============================================================================
// Action Executor
// =============================================================================

class ActionExecutor {
  async execute(
    action: Action,
    context: AutomationContext
  ): Promise<{ success: boolean; error?: string }> {
    try {
      switch (action.type) {
        case 'update_field':
          return this.executeUpdateField(action, context);
        case 'move_task':
          return this.executeMoveTask(action, context);
        case 'assign_user':
          return this.executeAssignUser(action, context);
        case 'add_label':
          return this.executeAddLabel(action, context);
        case 'remove_label':
          return this.executeRemoveLabel(action, context);
        case 'add_comment':
          return this.executeAddComment(action, context);
        case 'send_notification':
          return this.executeSendNotification(action, context);
        case 'send_email':
          return this.executeSendEmail(action, context);
        case 'send_webhook':
          return this.executeSendWebhook(action, context);
        case 'create_task':
          return this.executeCreateTask(action, context);
        case 'archive_task':
          return this.executeArchiveTask(action, context);
        default:
          return { success: false, error: `Unknown action type: ${action.type}` };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async executeUpdateField(
    action: Action & { type: 'update_field' },
    context: AutomationContext
  ): Promise<{ success: boolean; error?: string }> {
    const { fieldId, value, useFormula } = action.config;
    
    let finalValue = value;
    if (useFormula && typeof value === 'string') {
      finalValue = this.interpolateVariables(value, context);
    }

    // In a real implementation, this would call the database
    console.log(`[Automation] Update field ${fieldId} to ${finalValue} for task ${context.task.id}`);
    
    return { success: true };
  }

  private async executeMoveTask(
    action: Action & { type: 'move_task' },
    context: AutomationContext
  ): Promise<{ success: boolean; error?: string }> {
    const { columnId, projectId, position } = action.config;
    
    console.log(`[Automation] Move task ${context.task.id} to column ${columnId}`);
    
    return { success: true };
  }

  private async executeAssignUser(
    action: Action & { type: 'assign_user' },
    context: AutomationContext
  ): Promise<{ success: boolean; error?: string }> {
    const { userId, useCreator, useRoundRobin, roundRobinUserIds } = action.config;
    
    let assigneeId = userId;
    
    if (useCreator && context.task.created_by) {
      assigneeId = context.task.created_by as string;
    } else if (useRoundRobin && roundRobinUserIds?.length) {
      // Simple round-robin: pick based on task count % user count
      const index = Math.floor(Math.random() * roundRobinUserIds.length);
      assigneeId = roundRobinUserIds[index];
    }

    console.log(`[Automation] Assign task ${context.task.id} to user ${assigneeId}`);
    
    return { success: true };
  }

  private async executeAddLabel(
    action: Action & { type: 'add_label' },
    context: AutomationContext
  ): Promise<{ success: boolean; error?: string }> {
    const { labelId } = action.config;
    
    console.log(`[Automation] Add label ${labelId} to task ${context.task.id}`);
    
    return { success: true };
  }

  private async executeRemoveLabel(
    action: Action & { type: 'remove_label' },
    context: AutomationContext
  ): Promise<{ success: boolean; error?: string }> {
    const { labelId } = (action as any).config;
    
    console.log(`[Automation] Remove label ${labelId} from task ${context.task.id}`);
    
    return { success: true };
  }

  private async executeAddComment(
    action: Action & { type: 'add_comment' },
    context: AutomationContext
  ): Promise<{ success: boolean; error?: string }> {
    const { content, authorId } = action.config;
    
    const interpolatedContent = this.interpolateVariables(content, context);
    
    console.log(`[Automation] Add comment to task ${context.task.id}: ${interpolatedContent}`);
    
    return { success: true };
  }

  private async executeSendNotification(
    action: Action & { type: 'send_notification' },
    context: AutomationContext
  ): Promise<{ success: boolean; error?: string }> {
    const { recipientType, recipientIds, title, body } = action.config;
    
    const interpolatedTitle = this.interpolateVariables(title, context);
    const interpolatedBody = this.interpolateVariables(body, context);
    
    // Determine recipients
    let recipients: string[] = [];
    switch (recipientType) {
      case 'assignee':
        if (context.task.assigned_to) {
          recipients = [context.task.assigned_to as string];
        }
        break;
      case 'creator':
        if (context.task.created_by) {
          recipients = [context.task.created_by as string];
        }
        break;
      case 'specific':
        recipients = recipientIds || [];
        break;
    }

    console.log(`[Automation] Send notification to ${recipients.join(', ')}: ${interpolatedTitle}`);
    
    return { success: true };
  }

  private async executeSendEmail(
    action: Action & { type: 'send_email' },
    context: AutomationContext
  ): Promise<{ success: boolean; error?: string }> {
    const { recipientType, recipientEmails, subject, body, isHtml } = action.config;
    
    const interpolatedSubject = this.interpolateVariables(subject, context);
    const interpolatedBody = this.interpolateVariables(body, context);
    
    console.log(`[Automation] Send email: ${interpolatedSubject}`);
    
    // In a real implementation, this would use an email service
    return { success: true };
  }

  private async executeSendWebhook(
    action: Action & { type: 'send_webhook' },
    context: AutomationContext
  ): Promise<{ success: boolean; error?: string }> {
    const { url, method, headers, body, includeTaskData } = action.config;
    
    try {
      const payload = includeTaskData
        ? { task: context.task, ...((body as object) || {}) }
        : body;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: method !== 'GET' ? JSON.stringify(payload) : undefined,
      });

      if (!response.ok) {
        return { success: false, error: `Webhook failed: ${response.status}` };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Webhook request failed',
      };
    }
  }

  private async executeCreateTask(
    action: Action & { type: 'create_task' },
    context: AutomationContext
  ): Promise<{ success: boolean; error?: string }> {
    const { title, description, columnId, priority, assignedTo, linkToTriggerTask, linkType } = action.config;
    
    const interpolatedTitle = this.interpolateVariables(title, context);
    const interpolatedDescription = description ? this.interpolateVariables(description, context) : undefined;
    
    console.log(`[Automation] Create task: ${interpolatedTitle}`);
    
    return { success: true };
  }

  private async executeArchiveTask(
    action: Action,
    context: AutomationContext
  ): Promise<{ success: boolean; error?: string }> {
    console.log(`[Automation] Archive task ${context.task.id}`);
    
    return { success: true };
  }

  /**
   * Interpolate variables in a string
   * Supports: {task.fieldName}, {project.name}, {user.name}, etc.
   */
  private interpolateVariables(template: string, context: AutomationContext): string {
    return template.replace(/\{([^}]+)\}/g, (match, path) => {
      const parts = path.split('.');
      
      if (parts[0] === 'task') {
        let value: unknown = context.task;
        for (let i = 1; i < parts.length; i++) {
          if (value && typeof value === 'object' && parts[i] in value) {
            value = (value as Record<string, unknown>)[parts[i]];
          } else {
            return match;
          }
        }
        return String(value ?? '');
      }
      
      if (parts[0] === 'project') {
        if (parts[1] === 'name') return context.project.name;
        if (parts[1] === 'id') return context.project.id;
      }
      
      if (parts[0] === 'user' && context.triggeredBy) {
        if (parts[1] === 'name') return context.triggeredBy.name || context.triggeredBy.email;
        if (parts[1] === 'email') return context.triggeredBy.email;
      }
      
      return match;
    });
  }
}

// =============================================================================
// Automation Engine
// =============================================================================

export class AutomationEngine {
  private conditionEvaluator = new ConditionEvaluator();
  private actionExecutor = new ActionExecutor();

  /**
   * Check if a trigger matches the event
   */
  matchesTrigger(trigger: Trigger, eventType: TriggerType, eventData: Record<string, unknown>): boolean {
    if (!trigger.enabled || trigger.type !== eventType) {
      return false;
    }

    // Additional trigger-specific matching
    switch (trigger.type) {
      case 'task_created':
        if (trigger.config.projectId && eventData.projectId !== trigger.config.projectId) {
          return false;
        }
        if (trigger.config.columnId && eventData.columnId !== trigger.config.columnId) {
          return false;
        }
        break;

      case 'field_changed':
        if (trigger.config.fieldId) {
          const changedFields = eventData.changedFields as string[] | undefined;
          if (!changedFields?.includes(trigger.config.fieldId)) {
            return false;
          }
          if (trigger.config.toValue !== undefined) {
            const newValue = (eventData.task as Record<string, unknown>)?.[trigger.config.fieldId];
            if (newValue !== trigger.config.toValue) {
              return false;
            }
          }
        }
        break;
    }

    return true;
  }

  /**
   * Execute an automation rule
   */
  async execute(
    rule: AutomationRule,
    context: AutomationContext
  ): Promise<AutomationExecutionResult> {
    const startTime = Date.now();
    const actionResults: AutomationExecutionResult['actionResults'] = [];

    try {
      // Check conditions
      if (!this.conditionEvaluator.evaluate(rule.conditions, context)) {
        return {
          ruleId: rule.id,
          success: true,
          actionsExecuted: 0,
          actionResults: [],
          executedAt: new Date(),
          duration: Date.now() - startTime,
        };
      }

      // Execute actions
      for (const action of rule.actions) {
        if (!action.enabled) continue;

        const result = await this.actionExecutor.execute(action, context);
        actionResults.push({
          actionId: action.id,
          actionType: action.type,
          success: result.success,
          error: result.error,
        });

        // Stop on error (can be made configurable)
        if (!result.success) {
          break;
        }
      }

      const allSucceeded = actionResults.every((r) => r.success);

      return {
        ruleId: rule.id,
        success: allSucceeded,
        actionsExecuted: actionResults.filter((r) => r.success).length,
        actionResults,
        executedAt: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        ruleId: rule.id,
        success: false,
        actionsExecuted: actionResults.filter((r) => r.success).length,
        actionResults,
        error: error instanceof Error ? error.message : 'Unknown error',
        executedAt: new Date(),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Process an event and execute matching automations
   */
  async processEvent(
    eventType: TriggerType,
    eventData: Record<string, unknown>,
    rules: AutomationRule[]
  ): Promise<AutomationExecutionResult[]> {
    const results: AutomationExecutionResult[] = [];

    // Find matching rules
    const matchingRules = rules.filter((rule) => {
      if (!rule.enabled) return false;
      return this.matchesTrigger(rule.trigger, eventType, eventData);
    });

    // Execute each matching rule
    for (const rule of matchingRules) {
      const context: AutomationContext = {
        task: eventData.task as Record<string, unknown>,
        previousTask: eventData.previousTask as Record<string, unknown> | undefined,
        changedFields: eventData.changedFields as string[] | undefined,
        project: eventData.project as { id: string; name: string },
        triggeredBy: eventData.triggeredBy as { id: string; email: string; name?: string } | undefined,
        triggeredAt: new Date(),
      };

      const result = await this.execute(rule, context);
      results.push(result);
    }

    return results;
  }
}

// Export singleton instance
export const automationEngine = new AutomationEngine();
