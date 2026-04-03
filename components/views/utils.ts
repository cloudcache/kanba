/**
 * View Utilities
 * Common utilities for view components
 */

import type { Task, ProjectMember } from '@/lib/types';
import type { FilterGroup, FilterCondition, SortConfig, FilterOperator } from '@/lib/views/types';

// =============================================================================
// Task Filtering
// =============================================================================

export function applyFilters(tasks: Task[], filters?: FilterGroup): Task[] {
  if (!filters || filters.conditions.length === 0) {
    return tasks;
  }

  return tasks.filter(task => evaluateFilterGroup(task, filters));
}

function evaluateFilterGroup(task: Task, group: FilterGroup): boolean {
  const results = group.conditions.map(condition => {
    if ('operator' in condition && 'conditions' in condition) {
      // Nested group
      return evaluateFilterGroup(task, condition as FilterGroup);
    }
    // Single condition
    return evaluateCondition(task, condition as FilterCondition);
  });

  if (group.operator === 'and') {
    return results.every(Boolean);
  }
  return results.some(Boolean);
}

function evaluateCondition(task: Task, condition: FilterCondition): boolean {
  const fieldValue = getFieldValue(task, condition.fieldId);
  const compareValue = condition.value;

  switch (condition.operator) {
    case 'equals':
      return fieldValue === compareValue;
    case 'not_equals':
      return fieldValue !== compareValue;
    case 'contains':
      return String(fieldValue || '').toLowerCase().includes(String(compareValue || '').toLowerCase());
    case 'not_contains':
      return !String(fieldValue || '').toLowerCase().includes(String(compareValue || '').toLowerCase());
    case 'starts_with':
      return String(fieldValue || '').toLowerCase().startsWith(String(compareValue || '').toLowerCase());
    case 'ends_with':
      return String(fieldValue || '').toLowerCase().endsWith(String(compareValue || '').toLowerCase());
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
    case 'today':
      return isToday(fieldValue);
    case 'tomorrow':
      return isTomorrow(fieldValue);
    case 'yesterday':
      return isYesterday(fieldValue);
    case 'this_week':
      return isThisWeek(fieldValue);
    case 'next_week':
      return isNextWeek(fieldValue);
    case 'last_week':
      return isLastWeek(fieldValue);
    case 'this_month':
      return isThisMonth(fieldValue);
    case 'past':
      return isPast(fieldValue);
    case 'future':
      return isFuture(fieldValue);
    default:
      return true;
  }
}

function getFieldValue(task: Task, fieldId: string): unknown {
  const fieldMap: Record<string, unknown> = {
    title: task.title,
    description: task.description,
    priority: task.priority,
    due_date: task.due_date,
    is_done: task.is_done,
    created_at: task.created_at,
    assigned_to: task.assigned_to,
    column_id: task.column_id,
  };
  return fieldMap[fieldId];
}

// =============================================================================
// Task Sorting
// =============================================================================

export function applySorts(tasks: Task[], sorts?: SortConfig[]): Task[] {
  if (!sorts || sorts.length === 0) {
    return tasks;
  }

  return [...tasks].sort((a, b) => {
    for (const sort of sorts) {
      const aValue = getFieldValue(a, sort.fieldId);
      const bValue = getFieldValue(b, sort.fieldId);
      
      let comparison = 0;
      
      if (aValue === null || aValue === undefined) comparison = 1;
      else if (bValue === null || bValue === undefined) comparison = -1;
      else if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime();
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      if (comparison !== 0) {
        return sort.direction === 'desc' ? -comparison : comparison;
      }
    }
    return 0;
  });
}

// =============================================================================
// Task Grouping
// =============================================================================

export function groupTasks<T extends Task>(
  tasks: T[],
  groupFieldId: string
): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  for (const task of tasks) {
    const groupValue = String(getFieldValue(task, groupFieldId) || 'undefined');
    const existing = groups.get(groupValue) || [];
    existing.push(task);
    groups.set(groupValue, existing);
  }

  return groups;
}

// =============================================================================
// Date Utilities
// =============================================================================

function isToday(value: unknown): boolean {
  if (!value) return false;
  const date = new Date(value as string);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function isTomorrow(value: unknown): boolean {
  if (!value) return false;
  const date = new Date(value as string);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return date.toDateString() === tomorrow.toDateString();
}

function isYesterday(value: unknown): boolean {
  if (!value) return false;
  const date = new Date(value as string);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toDateString() === yesterday.toDateString();
}

function isThisWeek(value: unknown): boolean {
  if (!value) return false;
  const date = new Date(value as string);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  return date >= startOfWeek && date < endOfWeek;
}

function isNextWeek(value: unknown): boolean {
  if (!value) return false;
  const date = new Date(value as string);
  const now = new Date();
  const startOfNextWeek = new Date(now);
  startOfNextWeek.setDate(now.getDate() - now.getDay() + 7);
  startOfNextWeek.setHours(0, 0, 0, 0);
  const endOfNextWeek = new Date(startOfNextWeek);
  endOfNextWeek.setDate(startOfNextWeek.getDate() + 7);
  return date >= startOfNextWeek && date < endOfNextWeek;
}

function isLastWeek(value: unknown): boolean {
  if (!value) return false;
  const date = new Date(value as string);
  const now = new Date();
  const startOfLastWeek = new Date(now);
  startOfLastWeek.setDate(now.getDate() - now.getDay() - 7);
  startOfLastWeek.setHours(0, 0, 0, 0);
  const endOfLastWeek = new Date(startOfLastWeek);
  endOfLastWeek.setDate(startOfLastWeek.getDate() + 7);
  return date >= startOfLastWeek && date < endOfLastWeek;
}

function isThisMonth(value: unknown): boolean {
  if (!value) return false;
  const date = new Date(value as string);
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

function isPast(value: unknown): boolean {
  if (!value) return false;
  const date = new Date(value as string);
  return date < new Date();
}

function isFuture(value: unknown): boolean {
  if (!value) return false;
  const date = new Date(value as string);
  return date > new Date();
}

// =============================================================================
// Formatting Utilities
// =============================================================================

export function formatDate(date: string | Date | null, format: 'short' | 'medium' | 'long' = 'short'): string {
  if (!date) return '';
  const d = new Date(date);
  
  switch (format) {
    case 'short':
      return d.toLocaleDateString();
    case 'medium':
      return d.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    case 'long':
      return d.toLocaleDateString(undefined, { 
        weekday: 'long',
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
      });
  }
}

export function formatDateTime(date: string | Date | null): string {
  if (!date) return '';
  return new Date(date).toLocaleString();
}

export function getRelativeDate(date: string | Date | null): string {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days > 1 && days <= 7) return `In ${days} days`;
  if (days < -1 && days >= -7) return `${Math.abs(days)} days ago`;
  
  return formatDate(date, 'short');
}

// =============================================================================
// User Utilities
// =============================================================================

export function getMemberName(memberId: string | null, members: ProjectMember[]): string {
  if (!memberId) return 'Unassigned';
  const member = members.find(m => m.user_id === memberId);
  return member?.profiles?.full_name || member?.profiles?.email || 'Unknown';
}

export function getMemberAvatar(memberId: string | null, members: ProjectMember[]): string | null {
  if (!memberId) return null;
  const member = members.find(m => m.user_id === memberId);
  return member?.profiles?.avatar_url || null;
}

// =============================================================================
// Priority Utilities
// =============================================================================

export const PRIORITY_CONFIG = {
  high: {
    label: 'High',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
    dotColor: 'bg-red-500',
    sortOrder: 3,
  },
  medium: {
    label: 'Medium',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
    dotColor: 'bg-yellow-500',
    sortOrder: 2,
  },
  low: {
    label: 'Low',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    dotColor: 'bg-green-500',
    sortOrder: 1,
  },
} as const;

export function getPriorityConfig(priority: string) {
  return PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium;
}
