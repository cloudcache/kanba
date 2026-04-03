'use client';

import React, { useState } from 'react';
import { Check, ChevronDown, ChevronRight, Flag, Calendar, User, MessageSquare, MoreHorizontal, Edit, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { Task, Column, ProjectMember } from '@/lib/types';
import type { ListConfig } from '@/lib/views/types';
import { formatDate, getMemberName, getPriorityConfig, groupTasks } from './utils';

interface ListViewProps {
  tasks: Task[];
  columns: Column[];
  projectMembers: ProjectMember[];
  config?: ListConfig;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onViewComments: (task: Task) => void;
  onToggleDone: (taskId: string, isDone: boolean) => void;
  onAddTask?: (columnId?: string) => void;
  readOnly?: boolean;
}

interface TaskRowProps {
  task: Task;
  projectMembers: ProjectMember[];
  config?: ListConfig;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onViewComments: (task: Task) => void;
  onToggleDone: (taskId: string, isDone: boolean) => void;
  readOnly?: boolean;
  depth?: number;
  subtasks?: Task[];
}

function TaskRow({
  task,
  projectMembers,
  config,
  onEditTask,
  onDeleteTask,
  onViewComments,
  onToggleDone,
  readOnly = false,
  depth = 0,
  subtasks = [],
}: TaskRowProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const priorityConfig = getPriorityConfig(task.priority);
  const hasSubtasks = subtasks.length > 0;

  const rowHeightClass = {
    compact: 'py-1.5',
    normal: 'py-2.5',
    comfortable: 'py-3.5',
  }[config?.rowHeight || 'normal'];

  return (
    <>
      <div 
        className={`flex items-center gap-3 ${rowHeightClass} px-4 hover:bg-muted/50 border-b border-border/50 group`}
        style={{ paddingLeft: config?.indentation ? `${16 + depth * 24}px` : '16px' }}
      >
        {/* Expand/Collapse */}
        {hasSubtasks ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        ) : (
          <div className="w-5" />
        )}

        {/* Checkbox */}
        {config?.showCheckboxes !== false && (
          <Checkbox
            checked={task.is_done}
            onCheckedChange={(checked) => onToggleDone(task.id, checked as boolean)}
            disabled={readOnly}
            className="data-[state=checked]:bg-primary"
          />
        )}

        {/* Title */}
        <div className="flex-1 min-w-0">
          <span className={`text-sm ${task.is_done ? 'line-through text-muted-foreground' : ''}`}>
            {task.title}
          </span>
        </div>

        {/* Priority */}
        <Badge variant="secondary" className={`text-xs ${priorityConfig.color}`}>
          <Flag className="h-3 w-3 mr-1" />
          {priorityConfig.label}
        </Badge>

        {/* Assignee */}
        <div className="w-32 flex items-center text-sm text-muted-foreground">
          <User className="h-3 w-3 mr-1.5" />
          <span className="truncate">{getMemberName(task.assigned_to, projectMembers)}</span>
        </div>

        {/* Due Date */}
        <div className="w-28 flex items-center text-sm text-muted-foreground">
          {task.due_date && (
            <>
              <Calendar className="h-3 w-3 mr-1.5" />
              <span>{formatDate(task.due_date)}</span>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="w-20 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onViewComments(task)}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
          {!readOnly && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEditTask(task)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDeleteTask(task.id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Subtasks */}
      {hasSubtasks && isExpanded && (
        <div>
          {subtasks.map((subtask) => (
            <TaskRow
              key={subtask.id}
              task={subtask}
              projectMembers={projectMembers}
              config={config}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              onViewComments={onViewComments}
              onToggleDone={onToggleDone}
              readOnly={readOnly}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </>
  );
}

export function ListView({
  tasks,
  columns,
  projectMembers,
  config,
  onEditTask,
  onDeleteTask,
  onViewComments,
  onToggleDone,
  onAddTask,
  readOnly = false,
}: ListViewProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Group tasks by column if groupFieldId is set
  const groupFieldId = config?.groupFieldId || 'column_id';
  const groupedTasks = groupTasks(tasks, groupFieldId);

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const getGroupLabel = (groupId: string): string => {
    if (groupFieldId === 'column_id') {
      const column = columns.find((c) => c.id === groupId);
      return column?.name || 'No Status';
    }
    if (groupFieldId === 'priority') {
      return getPriorityConfig(groupId).label;
    }
    if (groupFieldId === 'assigned_to') {
      return getMemberName(groupId === 'undefined' ? null : groupId, projectMembers);
    }
    return groupId;
  };

  // If no grouping, render flat list
  if (!groupFieldId) {
    return (
      <div className="border rounded-lg bg-card">
        {/* Header */}
        <div className="flex items-center gap-3 py-2 px-4 border-b bg-muted/30 text-sm font-medium text-muted-foreground">
          <div className="w-5" />
          {config?.showCheckboxes !== false && <div className="w-4" />}
          <div className="flex-1">Task</div>
          <div className="w-20">Priority</div>
          <div className="w-32">Assignee</div>
          <div className="w-28">Due Date</div>
          <div className="w-20" />
        </div>

        {/* Tasks */}
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            projectMembers={projectMembers}
            config={config}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
            onViewComments={onViewComments}
            onToggleDone={onToggleDone}
            readOnly={readOnly}
          />
        ))}

        {/* Add Task Button */}
        {!readOnly && onAddTask && (
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-foreground py-2 px-4"
            onClick={() => onAddTask()}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add task
          </Button>
        )}
      </div>
    );
  }

  // Render grouped list
  const groups = groupFieldId === 'column_id' 
    ? columns.map(c => ({ id: c.id, tasks: groupedTasks.get(c.id) || [] }))
    : Array.from(groupedTasks.entries()).map(([id, tasks]) => ({ id, tasks }));

  return (
    <div className="space-y-4">
      {groups.map(({ id: groupId, tasks: groupTasks }) => {
        const isCollapsed = collapsedGroups.has(groupId);
        const columnId = groupFieldId === 'column_id' ? groupId : columns[0]?.id;

        return (
          <Collapsible key={groupId} open={!isCollapsed} onOpenChange={() => toggleGroup(groupId)}>
            <div className="border rounded-lg bg-card overflow-hidden">
              {/* Group Header */}
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-2 py-2 px-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-medium text-sm">{getGroupLabel(groupId)}</span>
                  <Badge variant="secondary" className="text-xs">
                    {groupTasks.length}
                  </Badge>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                {/* Tasks */}
                {groupTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    projectMembers={projectMembers}
                    config={config}
                    onEditTask={onEditTask}
                    onDeleteTask={onDeleteTask}
                    onViewComments={onViewComments}
                    onToggleDone={onToggleDone}
                    readOnly={readOnly}
                  />
                ))}

                {/* Add Task Button */}
                {!readOnly && onAddTask && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-muted-foreground hover:text-foreground py-2 px-4"
                    onClick={() => onAddTask(columnId)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add task
                  </Button>
                )}
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}
    </div>
  );
}
