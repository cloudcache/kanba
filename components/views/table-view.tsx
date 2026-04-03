'use client';

import React, { useState } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Check,
  Flag,
  Calendar,
  User,
  MoreHorizontal,
  Edit,
  Trash2,
  Plus,
  GripVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Task, Column, ProjectMember } from '@/lib/types';
import type { TableConfig, SortConfig } from '@/lib/views/types';
import { formatDate, getMemberName, getPriorityConfig } from './utils';

interface TableViewProps {
  tasks: Task[];
  columns: Column[];
  projectMembers: ProjectMember[];
  config?: TableConfig;
  visibleFields?: string[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onViewComments: (task: Task) => void;
  onToggleDone: (taskId: string, isDone: boolean) => void;
  onAddTask?: () => void;
  onSort?: (sorts: SortConfig[]) => void;
  currentSorts?: SortConfig[];
  readOnly?: boolean;
}

interface ColumnDef {
  id: string;
  label: string;
  width?: number;
  sortable?: boolean;
  render: (task: Task) => React.ReactNode;
}

export function TableView({
  tasks,
  columns,
  projectMembers,
  config,
  visibleFields = ['title', 'status', 'priority', 'assignee', 'due_date', 'created_at'],
  onEditTask,
  onDeleteTask,
  onViewComments,
  onToggleDone,
  onAddTask,
  onSort,
  currentSorts = [],
  readOnly = false,
}: TableViewProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const rowHeightClass = {
    compact: 'h-8',
    normal: 'h-10',
    comfortable: 'h-12',
  }[config?.rowHeight || 'normal'];

  const getColumnName = (columnId: string): string => {
    const column = columns.find((c) => c.id === columnId);
    return column?.name || 'Unknown';
  };

  // Define all available columns
  const allColumnDefs: ColumnDef[] = [
    {
      id: 'title',
      label: 'Title',
      width: 300,
      sortable: true,
      render: (task) => (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={task.is_done}
            onCheckedChange={(checked) => onToggleDone(task.id, checked as boolean)}
            disabled={readOnly}
            className="data-[state=checked]:bg-primary"
          />
          <span className={`font-medium ${task.is_done ? 'line-through text-muted-foreground' : ''}`}>
            {task.title}
          </span>
        </div>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      width: 150,
      sortable: true,
      render: (task) => (
        <Badge variant="outline" className="text-xs">
          {getColumnName(task.column_id)}
        </Badge>
      ),
    },
    {
      id: 'priority',
      label: 'Priority',
      width: 100,
      sortable: true,
      render: (task) => {
        const priorityConfig = getPriorityConfig(task.priority);
        return (
          <Badge variant="secondary" className={`text-xs ${priorityConfig.color}`}>
            <Flag className="h-3 w-3 mr-1" />
            {priorityConfig.label}
          </Badge>
        );
      },
    },
    {
      id: 'assignee',
      label: 'Assignee',
      width: 150,
      sortable: true,
      render: (task) => (
        <div className="flex items-center text-sm text-muted-foreground">
          <User className="h-3 w-3 mr-1.5" />
          <span className="truncate">{getMemberName(task.assigned_to, projectMembers)}</span>
        </div>
      ),
    },
    {
      id: 'due_date',
      label: 'Due Date',
      width: 120,
      sortable: true,
      render: (task) => (
        <div className="flex items-center text-sm text-muted-foreground">
          {task.due_date && (
            <>
              <Calendar className="h-3 w-3 mr-1.5" />
              <span>{formatDate(task.due_date)}</span>
            </>
          )}
        </div>
      ),
    },
    {
      id: 'created_at',
      label: 'Created',
      width: 120,
      sortable: true,
      render: (task) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(task.created_at)}
        </span>
      ),
    },
    {
      id: 'description',
      label: 'Description',
      width: 250,
      sortable: false,
      render: (task) => (
        <span className="text-sm text-muted-foreground truncate block max-w-[250px]">
          {task.description || '-'}
        </span>
      ),
    },
  ];

  // Filter columns based on visibleFields
  const visibleColumnDefs = visibleFields
    .map((fieldId) => allColumnDefs.find((col) => col.id === fieldId))
    .filter((col): col is ColumnDef => col !== undefined);

  const handleSort = (fieldId: string) => {
    if (!onSort) return;

    const existingSort = currentSorts.find((s) => s.fieldId === fieldId);
    let newSorts: SortConfig[];

    if (!existingSort) {
      newSorts = [{ fieldId, direction: 'asc' }];
    } else if (existingSort.direction === 'asc') {
      newSorts = [{ fieldId, direction: 'desc' }];
    } else {
      newSorts = [];
    }

    onSort(newSorts);
  };

  const getSortIcon = (fieldId: string) => {
    const sort = currentSorts.find((s) => s.fieldId === fieldId);
    if (!sort) return <ArrowUpDown className="h-3 w-3" />;
    return sort.direction === 'asc' ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    );
  };

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className={`bg-muted/30 ${rowHeightClass}`}>
              {config?.showRowNumbers && (
                <TableHead className="w-12 text-center">#</TableHead>
              )}
              {visibleColumnDefs.map((col) => (
                <TableHead
                  key={col.id}
                  style={{ width: col.width }}
                  className={`${col.sortable ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                  onClick={() => col.sortable && handleSort(col.id)}
                >
                  <div className="flex items-center gap-1">
                    <span>{col.label}</span>
                    {col.sortable && getSortIcon(col.id)}
                  </div>
                </TableHead>
              ))}
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task, index) => (
              <TableRow
                key={task.id}
                className={`${rowHeightClass} ${
                  config?.alternateRowColors && index % 2 === 1 ? 'bg-muted/20' : ''
                } hover:bg-muted/40`}
                onMouseEnter={() => setHoveredRow(task.id)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                {config?.showRowNumbers && (
                  <TableCell className="text-center text-muted-foreground text-sm">
                    {index + 1}
                  </TableCell>
                )}
                {visibleColumnDefs.map((col) => (
                  <TableCell 
                    key={col.id}
                    className={config?.wrapText ? '' : 'truncate'}
                  >
                    {col.render(task)}
                  </TableCell>
                ))}
                <TableCell>
                  <div className={`flex items-center justify-end gap-1 ${
                    hoveredRow === task.id ? 'opacity-100' : 'opacity-0'
                  } transition-opacity`}>
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
                          <DropdownMenuItem onClick={() => onViewComments(task)}>
                            View Comments
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
                </TableCell>
              </TableRow>
            ))}

            {/* Add Task Row */}
            {!readOnly && onAddTask && (
              <TableRow className={rowHeightClass}>
                <TableCell colSpan={visibleColumnDefs.length + (config?.showRowNumbers ? 2 : 1)}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-muted-foreground hover:text-foreground"
                    onClick={onAddTask}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add task
                  </Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
