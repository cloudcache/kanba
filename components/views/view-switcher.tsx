'use client';

import React, { useState } from 'react';
import {
  LayoutGrid,
  List,
  Table2,
  Calendar,
  GanttChart,
  Image,
  Clock,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Lock,
  Unlock,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { View, ViewType } from '@/lib/views/types';

interface ViewSwitcherProps {
  views: View[];
  currentViewId: string;
  onViewChange: (viewId: string) => void;
  onCreateView: (name: string, type: ViewType) => void;
  onUpdateView: (viewId: string, updates: Partial<View>) => void;
  onDeleteView: (viewId: string) => void;
  onDuplicateView: (viewId: string) => void;
  readOnly?: boolean;
}

const VIEW_TYPE_CONFIG: Record<ViewType, { icon: React.ElementType; label: string }> = {
  kanban: { icon: LayoutGrid, label: 'Board' },
  list: { icon: List, label: 'List' },
  table: { icon: Table2, label: 'Table' },
  calendar: { icon: Calendar, label: 'Calendar' },
  timeline: { icon: Clock, label: 'Timeline' },
  gantt: { icon: GanttChart, label: 'Gantt' },
  gallery: { icon: Image, label: 'Gallery' },
};

export function ViewSwitcher({
  views,
  currentViewId,
  onViewChange,
  onCreateView,
  onUpdateView,
  onDeleteView,
  onDuplicateView,
  readOnly = false,
}: ViewSwitcherProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [newViewType, setNewViewType] = useState<ViewType>('list');
  const [viewToRename, setViewToRename] = useState<View | null>(null);

  const currentView = views.find((v) => v.id === currentViewId);

  const handleCreateView = () => {
    if (newViewName.trim()) {
      onCreateView(newViewName.trim(), newViewType);
      setNewViewName('');
      setNewViewType('list');
      setIsCreateDialogOpen(false);
    }
  };

  const handleRenameView = () => {
    if (viewToRename && newViewName.trim()) {
      onUpdateView(viewToRename.id, { name: newViewName.trim() });
      setNewViewName('');
      setViewToRename(null);
      setIsRenameDialogOpen(false);
    }
  };

  const openRenameDialog = (view: View) => {
    setViewToRename(view);
    setNewViewName(view.name);
    setIsRenameDialogOpen(true);
  };

  return (
    <>
      <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-lg">
        {/* View Tabs */}
        {views.map((view) => {
          const config = VIEW_TYPE_CONFIG[view.type];
          const Icon = config.icon;
          const isActive = view.id === currentViewId;

          return (
            <div key={view.id} className="relative group">
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                size="sm"
                className={cn(
                  'h-8 gap-1.5 pr-6',
                  isActive && 'bg-background shadow-sm'
                )}
                onClick={() => onViewChange(view.id)}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="text-sm">{view.name}</span>
                {view.isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                {view.isPersonal && (
                  <Badge variant="outline" className="h-4 text-[10px] px-1">
                    Personal
                  </Badge>
                )}
              </Button>

              {/* View Actions Dropdown */}
              {!readOnly && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'absolute right-0 top-0 h-8 w-6 p-0 opacity-0 group-hover:opacity-100',
                        isActive && 'opacity-100'
                      )}
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openRenameDialog(view)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDuplicateView(view.id)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onUpdateView(view.id, { isLocked: !view.isLocked })}
                    >
                      {view.isLocked ? (
                        <>
                          <Unlock className="h-4 w-4 mr-2" />
                          Unlock
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4 mr-2" />
                          Lock
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDeleteView(view.id)}
                      className="text-destructive"
                      disabled={view.isDefault || views.length === 1}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        })}

        {/* Add View Button */}
        {!readOnly && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Create View Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New View</DialogTitle>
            <DialogDescription>
              Create a new view to organize and visualize your tasks differently.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="view-name">View Name</Label>
              <Input
                id="view-name"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                placeholder="My View"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="view-type">View Type</Label>
              <Select value={newViewType} onValueChange={(v) => setNewViewType(v as ViewType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(VIEW_TYPE_CONFIG).map(([type, config]) => {
                    const Icon = config.icon;
                    return (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{config.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateView} disabled={!newViewName.trim()}>
              Create View
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename View Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename View</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename-view">View Name</Label>
            <Input
              id="rename-view"
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              placeholder="View name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameView} disabled={!newViewName.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
