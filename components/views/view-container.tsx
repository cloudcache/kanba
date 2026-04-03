'use client';

import React, { useState, useMemo } from 'react';
import { KanbanBoard } from '@/components/kanban-board';
import { ListView } from './list-view';
import { TableView } from './table-view';
import { CalendarView } from './calendar-view';
import { GanttView } from './gantt-view';
import { ViewSwitcher } from './view-switcher';
import { ViewToolbar } from './view-toolbar';
import { applyFilters, applySorts } from './utils';
import type { Task, Column, ProjectMember } from '@/lib/types';
import type { View, ViewType, ViewConfig, SortConfig, FilterGroup } from '@/lib/views/types';
import { DropResult } from '@hello-pangea/dnd';

interface ViewContainerProps {
  // Data
  tasks: Task[];
  columns: Column[];
  projectMembers: ProjectMember[];
  
  // Views
  views: View[];
  currentViewId: string;
  
  // View management
  onViewChange: (viewId: string) => void;
  onCreateView: (name: string, type: ViewType) => void;
  onUpdateView: (viewId: string, updates: Partial<View>) => void;
  onDeleteView: (viewId: string) => void;
  onDuplicateView: (viewId: string) => void;
  
  // Task actions
  handleDragEnd: (result: DropResult) => void;
  onEditColumn: (column: Column) => void;
  onDeleteColumn: (columnId: string) => void;
  onAddTask: (columnId?: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onViewComments: (task: Task) => void;
  onToggleDone: (taskId: string, isDone: boolean) => void;
  
  // Permissions
  readOnly?: boolean;
}

export function ViewContainer({
  tasks,
  columns,
  projectMembers,
  views,
  currentViewId,
  onViewChange,
  onCreateView,
  onUpdateView,
  onDeleteView,
  onDuplicateView,
  handleDragEnd,
  onEditColumn,
  onDeleteColumn,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onViewComments,
  onToggleDone,
  readOnly = false,
}: ViewContainerProps) {
  // Get current view
  const currentView = views.find((v) => v.id === currentViewId) || views[0];
  
  // Local state for filters and sorts (can be synced with view config)
  const [filters, setFilters] = useState<FilterGroup | undefined>(currentView?.config?.filters);
  const [sorts, setSorts] = useState<SortConfig[]>(currentView?.config?.sorts || []);

  // Apply filters and sorts to tasks
  const processedTasks = useMemo(() => {
    let result = [...tasks];
    
    // Apply filters
    if (filters) {
      result = applyFilters(result, filters);
    }
    
    // Apply sorts
    if (sorts.length > 0) {
      result = applySorts(result, sorts);
    }
    
    return result;
  }, [tasks, filters, sorts]);

  // Flatten tasks from columns for non-kanban views
  const allTasks = useMemo(() => {
    if (processedTasks.length > 0) {
      return processedTasks;
    }
    return columns.flatMap((col) => col.tasks || []);
  }, [processedTasks, columns]);

  // Handle sort change
  const handleSortChange = (newSorts: SortConfig[]) => {
    setSorts(newSorts);
    // Optionally save to view config
    // onUpdateView(currentViewId, { config: { ...currentView?.config, sorts: newSorts } });
  };

  // Handle filter change
  const handleFilterChange = (newFilters: FilterGroup) => {
    setFilters(newFilters);
    // Optionally save to view config
    // onUpdateView(currentViewId, { config: { ...currentView?.config, filters: newFilters } });
  };

  // Render appropriate view based on type
  const renderView = () => {
    if (!currentView) {
      return <div className="p-4 text-muted-foreground">No view selected</div>;
    }

    switch (currentView.type) {
      case 'kanban':
        return (
          <KanbanBoard
            columns={columns}
            projectMembers={projectMembers}
            handleDragEnd={handleDragEnd}
            onEditColumn={onEditColumn}
            onDeleteColumn={onDeleteColumn}
            onAddTask={onAddTask}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
            onViewComments={onViewComments}
            onToggleDone={onToggleDone}
            readOnly={readOnly}
          />
        );

      case 'list':
        return (
          <ListView
            tasks={allTasks}
            columns={columns}
            projectMembers={projectMembers}
            config={currentView.config?.list}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
            onViewComments={onViewComments}
            onToggleDone={onToggleDone}
            onAddTask={onAddTask}
            readOnly={readOnly}
          />
        );

      case 'table':
        return (
          <TableView
            tasks={allTasks}
            columns={columns}
            projectMembers={projectMembers}
            config={currentView.config?.table}
            visibleFields={currentView.config?.fields?.visible}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
            onViewComments={onViewComments}
            onToggleDone={onToggleDone}
            onAddTask={() => onAddTask()}
            onSort={handleSortChange}
            currentSorts={sorts}
            readOnly={readOnly}
          />
        );

      case 'calendar':
        return (
          <CalendarView
            tasks={allTasks}
            columns={columns}
            projectMembers={projectMembers}
            config={currentView.config?.calendar}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
            onViewComments={onViewComments}
            onToggleDone={onToggleDone}
            onAddTask={(date) => onAddTask()}
            readOnly={readOnly}
          />
        );

      case 'gantt':
        return (
          <GanttView
            tasks={allTasks}
            columns={columns}
            projectMembers={projectMembers}
            config={currentView.config?.gantt}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
            onViewComments={onViewComments}
            onToggleDone={onToggleDone}
            readOnly={readOnly}
          />
        );

      case 'timeline':
        // Fallback to gantt for now
        return (
          <GanttView
            tasks={allTasks}
            columns={columns}
            projectMembers={projectMembers}
            config={currentView.config?.gantt}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
            onViewComments={onViewComments}
            onToggleDone={onToggleDone}
            readOnly={readOnly}
          />
        );

      case 'gallery':
        // Fallback to list for now
        return (
          <ListView
            tasks={allTasks}
            columns={columns}
            projectMembers={projectMembers}
            config={currentView.config?.list}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
            onViewComments={onViewComments}
            onToggleDone={onToggleDone}
            onAddTask={onAddTask}
            readOnly={readOnly}
          />
        );

      default:
        return <div className="p-4 text-muted-foreground">Unknown view type</div>;
    }
  };

  return (
    <div className="space-y-4">
      {/* View Switcher */}
      <div className="flex items-center justify-between">
        <ViewSwitcher
          views={views}
          currentViewId={currentViewId}
          onViewChange={onViewChange}
          onCreateView={onCreateView}
          onUpdateView={onUpdateView}
          onDeleteView={onDeleteView}
          onDuplicateView={onDuplicateView}
          readOnly={readOnly}
        />
        
        {/* View Toolbar (filters, sorts, etc.) */}
        <ViewToolbar
          view={currentView}
          filters={filters}
          sorts={sorts}
          onFiltersChange={handleFilterChange}
          onSortsChange={handleSortChange}
          readOnly={readOnly || currentView?.isLocked}
        />
      </div>

      {/* View Content */}
      <div className="min-h-[500px]">
        {renderView()}
      </div>
    </div>
  );
}
