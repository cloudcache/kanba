'use client';

import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Flag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { Task, Column, ProjectMember } from '@/lib/types';
import type { CalendarConfig } from '@/lib/views/types';
import { getPriorityConfig, getMemberName } from './utils';

interface CalendarViewProps {
  tasks: Task[];
  columns: Column[];
  projectMembers: ProjectMember[];
  config?: CalendarConfig;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onViewComments: (task: Task) => void;
  onToggleDone: (taskId: string, isDone: boolean) => void;
  onAddTask?: (date?: Date) => void;
  readOnly?: boolean;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  tasks: Task[];
}

export function CalendarView({
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
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>(
    config?.defaultView === 'week' ? 'week' : 'month'
  );

  const weekStartsOn = config?.weekStartsOn ?? 1; // Default to Monday

  // Get tasks with due dates organized by date
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    const dateFieldId = config?.startDateFieldId || 'due_date';

    tasks.forEach((task) => {
      const dateValue = dateFieldId === 'due_date' ? task.due_date : null;
      if (dateValue) {
        const dateKey = new Date(dateValue).toDateString();
        const existing = map.get(dateKey) || [];
        existing.push(task);
        map.set(dateKey, existing);
      }
    });

    return map;
  }, [tasks, config?.startDateFieldId]);

  // Generate calendar days for the current month view
  const calendarDays = useMemo((): CalendarDay[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const today = new Date();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Get the start of the calendar (may include days from previous month)
    const startDay = new Date(firstDayOfMonth);
    const dayOfWeek = startDay.getDay();
    const diff = (dayOfWeek - weekStartsOn + 7) % 7;
    startDay.setDate(startDay.getDate() - diff);

    // Get the end of the calendar (may include days from next month)
    const endDay = new Date(lastDayOfMonth);
    const endDayOfWeek = endDay.getDay();
    const endDiff = (6 - endDayOfWeek + weekStartsOn) % 7;
    endDay.setDate(endDay.getDate() + endDiff);

    const days: CalendarDay[] = [];
    const current = new Date(startDay);

    while (current <= endDay) {
      const dateKey = current.toDateString();
      days.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === month,
        isToday: current.toDateString() === today.toDateString(),
        tasks: tasksByDate.get(dateKey) || [],
      });
      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [currentDate, weekStartsOn, tasksByDate]);

  // Navigation
  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setDate(newDate.getDate() - 7);
    }
    setCurrentDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Week day headers
  const weekDays = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result = [];
    for (let i = 0; i < 7; i++) {
      result.push(days[(weekStartsOn + i) % 7]);
    }
    return result;
  }, [weekStartsOn]);

  const formatMonthYear = (date: Date): string => {
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  };

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <div className="flex items-center">
            <Button variant="ghost" size="sm" onClick={goToPrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={goToNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-lg font-semibold">{formatMonthYear(currentDate)}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'month' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('month')}
          >
            Month
          </Button>
          <Button
            variant={viewMode === 'week' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('week')}
          >
            Week
          </Button>
        </div>
      </div>

      {/* Week Day Headers */}
      <div className="grid grid-cols-7 border-b">
        {weekDays.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => (
          <div
            key={index}
            className={cn(
              'min-h-[120px] p-1 border-r border-b last:border-r-0',
              !day.isCurrentMonth && 'bg-muted/20',
              day.isToday && 'bg-primary/5'
            )}
          >
            {/* Day Number */}
            <div className="flex items-center justify-between mb-1">
              <span
                className={cn(
                  'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full',
                  day.isToday && 'bg-primary text-primary-foreground',
                  !day.isCurrentMonth && 'text-muted-foreground'
                )}
              >
                {day.date.getDate()}
              </span>
              {!readOnly && onAddTask && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 hover:opacity-100 group-hover:opacity-100"
                  onClick={() => onAddTask(day.date)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Tasks */}
            <div className="space-y-1">
              {day.tasks.slice(0, 3).map((task) => (
                <TaskPill
                  key={task.id}
                  task={task}
                  projectMembers={projectMembers}
                  onEditTask={onEditTask}
                  readOnly={readOnly}
                />
              ))}
              {day.tasks.length > 3 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-5 text-xs w-full">
                      +{day.tasks.length - 3} more
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2">
                    <div className="space-y-1">
                      {day.tasks.map((task) => (
                        <TaskPill
                          key={task.id}
                          task={task}
                          projectMembers={projectMembers}
                          onEditTask={onEditTask}
                          readOnly={readOnly}
                          expanded
                        />
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface TaskPillProps {
  task: Task;
  projectMembers: ProjectMember[];
  onEditTask: (task: Task) => void;
  readOnly?: boolean;
  expanded?: boolean;
}

function TaskPill({ task, projectMembers, onEditTask, readOnly, expanded }: TaskPillProps) {
  const priorityConfig = getPriorityConfig(task.priority);

  if (expanded) {
    return (
      <div
        className={cn(
          'p-2 rounded text-xs cursor-pointer hover:bg-muted/50 border',
          task.is_done && 'opacity-60'
        )}
        onClick={() => !readOnly && onEditTask(task)}
      >
        <div className={cn('font-medium', task.is_done && 'line-through')}>
          {task.title}
        </div>
        <div className="flex items-center gap-2 mt-1 text-muted-foreground">
          <Badge variant="secondary" className={cn('text-xs h-4', priorityConfig.color)}>
            <Flag className="h-2 w-2 mr-0.5" />
            {task.priority}
          </Badge>
          <span>{getMemberName(task.assigned_to, projectMembers)}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'px-2 py-0.5 rounded text-xs truncate cursor-pointer',
        priorityConfig.color,
        task.is_done && 'opacity-60 line-through'
      )}
      onClick={() => !readOnly && onEditTask(task)}
      title={task.title}
    >
      {task.title}
    </div>
  );
}
