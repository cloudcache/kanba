'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Flag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Task, Column, ProjectMember } from '@/lib/types';
import type { GanttConfig } from '@/lib/views/types';
import { formatDate, getMemberName, getPriorityConfig } from './utils';

interface GanttViewProps {
  tasks: Task[];
  columns: Column[];
  projectMembers: ProjectMember[];
  config?: GanttConfig;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onViewComments: (task: Task) => void;
  onToggleDone: (taskId: string, isDone: boolean) => void;
  readOnly?: boolean;
}

type Scale = 'day' | 'week' | 'month';

interface GanttTask extends Task {
  startDate: Date;
  endDate: Date;
  progress?: number;
}

export function GanttView({
  tasks,
  columns,
  projectMembers,
  config,
  onEditTask,
  onDeleteTask,
  onViewComments,
  onToggleDone,
  readOnly = false,
}: GanttViewProps) {
  const [scale, setScale] = useState<Scale>(config?.scale || 'week');
  const [viewStart, setViewStart] = useState<Date>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date;
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter tasks with dates and convert to GanttTask
  const ganttTasks = useMemo((): GanttTask[] => {
    return tasks
      .filter((task) => task.due_date)
      .map((task) => {
        // For simplicity, use due_date as both start and end
        // In a real implementation, you'd have separate start_date field
        const endDate = new Date(task.due_date!);
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 3); // Default 3-day duration

        return {
          ...task,
          startDate,
          endDate,
          progress: task.is_done ? 100 : 0,
        };
      })
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }, [tasks]);

  // Calculate date range
  const { startDate, endDate, totalDays, columns: dateColumns } = useMemo(() => {
    let start = new Date(viewStart);
    let days = 0;
    const cols: Date[] = [];

    switch (scale) {
      case 'day':
        days = 30;
        break;
      case 'week':
        days = 12 * 7; // 12 weeks
        break;
      case 'month':
        days = 180; // 6 months
        break;
    }

    const end = new Date(start);
    end.setDate(end.getDate() + days);

    // Generate column dates
    const current = new Date(start);
    while (current <= end) {
      cols.push(new Date(current));
      if (scale === 'day') {
        current.setDate(current.getDate() + 1);
      } else if (scale === 'week') {
        current.setDate(current.getDate() + 7);
      } else {
        current.setMonth(current.getMonth() + 1);
      }
    }

    return { startDate: start, endDate: end, totalDays: days, columns: cols };
  }, [viewStart, scale]);

  // Calculate column width based on scale
  const columnWidth = useMemo(() => {
    switch (scale) {
      case 'day':
        return 40;
      case 'week':
        return 100;
      case 'month':
        return 150;
    }
  }, [scale]);

  // Navigation
  const goToPrevious = () => {
    const newDate = new Date(viewStart);
    switch (scale) {
      case 'day':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() - 28);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() - 2);
        break;
    }
    setViewStart(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(viewStart);
    switch (scale) {
      case 'day':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + 28);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + 2);
        break;
    }
    setViewStart(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    today.setDate(today.getDate() - 7);
    setViewStart(today);
  };

  // Calculate bar position and width
  const getBarStyle = (task: GanttTask) => {
    const taskStart = Math.max(task.startDate.getTime(), startDate.getTime());
    const taskEnd = Math.min(task.endDate.getTime(), endDate.getTime());

    if (taskEnd < startDate.getTime() || taskStart > endDate.getTime()) {
      return { display: 'none' };
    }

    const dayMs = 24 * 60 * 60 * 1000;
    const totalMs = endDate.getTime() - startDate.getTime();
    const startOffset = taskStart - startDate.getTime();
    const duration = taskEnd - taskStart;

    const left = (startOffset / totalMs) * 100;
    const width = Math.max((duration / totalMs) * 100, 2); // Minimum 2% width

    return {
      left: `${left}%`,
      width: `${width}%`,
    };
  };

  // Format column header
  const formatColumnHeader = (date: Date): string => {
    switch (scale) {
      case 'day':
        return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
      case 'week':
        return `Week ${getWeekNumber(date)}`;
      case 'month':
        return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    }
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
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={scale === 'day' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setScale('day')}
          >
            Day
          </Button>
          <Button
            variant={scale === 'week' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setScale('week')}
          >
            Week
          </Button>
          <Button
            variant={scale === 'month' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setScale('month')}
          >
            Month
          </Button>
        </div>
      </div>

      <div className="flex overflow-hidden">
        {/* Task List (Left Side) */}
        <div className="w-64 flex-shrink-0 border-r bg-muted/10">
          <div className="h-10 border-b bg-muted/30 px-4 flex items-center">
            <span className="text-sm font-medium">Tasks</span>
          </div>
          <div className="divide-y">
            {ganttTasks.map((task) => (
              <div
                key={task.id}
                className="h-10 px-4 flex items-center gap-2 hover:bg-muted/30 cursor-pointer"
                onClick={() => !readOnly && onEditTask(task)}
              >
                <div className={cn('w-2 h-2 rounded-full', getPriorityConfig(task.priority).dotColor)} />
                <span className={cn('text-sm truncate flex-1', task.is_done && 'line-through text-muted-foreground')}>
                  {task.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline (Right Side) */}
        <div className="flex-1 overflow-x-auto" ref={containerRef}>
          {/* Timeline Header */}
          <div className="h-10 border-b bg-muted/30 flex">
            {dateColumns.map((date, index) => (
              <div
                key={index}
                className="flex-shrink-0 border-r text-center text-xs font-medium flex items-center justify-center text-muted-foreground"
                style={{ width: columnWidth }}
              >
                {formatColumnHeader(date)}
              </div>
            ))}
          </div>

          {/* Timeline Grid & Bars */}
          <div className="relative">
            {/* Grid Lines */}
            <div className="absolute inset-0 flex pointer-events-none">
              {dateColumns.map((_, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 border-r border-dashed border-border/50"
                  style={{ width: columnWidth }}
                />
              ))}
            </div>

            {/* Today Line */}
            <TodayLine startDate={startDate} endDate={endDate} />

            {/* Task Bars */}
            {ganttTasks.map((task) => (
              <div key={task.id} className="h-10 relative">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'absolute top-2 h-6 rounded cursor-pointer transition-all hover:brightness-110',
                          task.is_done ? 'bg-muted-foreground/50' : getPriorityConfig(task.priority).dotColor.replace('bg-', 'bg-')
                        )}
                        style={getBarStyle(task)}
                        onClick={() => !readOnly && onEditTask(task)}
                      >
                        {/* Progress indicator */}
                        {config?.showProgress && task.progress !== undefined && (
                          <div
                            className="absolute inset-y-0 left-0 bg-white/30 rounded-l"
                            style={{ width: `${task.progress}%` }}
                          />
                        )}
                        <span className="absolute inset-0 flex items-center px-2 text-xs text-white font-medium truncate">
                          {task.title}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <div className="font-medium">{task.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(task.startDate, 'medium')} - {formatDate(task.endDate, 'medium')}
                        </div>
                        <div className="text-xs">
                          Assignee: {getMemberName(task.assigned_to, projectMembers)}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Today Line Component
function TodayLine({ startDate, endDate }: { startDate: Date; endDate: Date }) {
  const today = new Date();
  if (today < startDate || today > endDate) return null;

  const totalMs = endDate.getTime() - startDate.getTime();
  const offset = today.getTime() - startDate.getTime();
  const left = (offset / totalMs) * 100;

  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
      style={{ left: `${left}%` }}
    >
      <div className="absolute -top-2 -left-1.5 w-3 h-3 bg-red-500 rounded-full" />
    </div>
  );
}

// Utility function to get week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
