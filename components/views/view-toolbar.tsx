'use client';

import React, { useState } from 'react';
import {
  Filter,
  ArrowUpDown,
  Settings2,
  X,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { View, FilterGroup, FilterCondition, SortConfig, FilterOperator } from '@/lib/views/types';

interface ViewToolbarProps {
  view?: View;
  filters?: FilterGroup;
  sorts: SortConfig[];
  onFiltersChange: (filters: FilterGroup) => void;
  onSortsChange: (sorts: SortConfig[]) => void;
  readOnly?: boolean;
}

// Available fields for filtering/sorting
const AVAILABLE_FIELDS = [
  { id: 'title', label: 'Title', type: 'text' },
  { id: 'priority', label: 'Priority', type: 'select', options: ['high', 'medium', 'low'] },
  { id: 'is_done', label: 'Done', type: 'boolean' },
  { id: 'due_date', label: 'Due Date', type: 'date' },
  { id: 'assigned_to', label: 'Assignee', type: 'user' },
  { id: 'created_at', label: 'Created', type: 'date' },
];

const FILTER_OPERATORS: Record<string, { value: FilterOperator; label: string }[]> = {
  text: [
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Does not contain' },
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Does not equal' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
  ],
  select: [
    { value: 'equals', label: 'Is' },
    { value: 'not_equals', label: 'Is not' },
    { value: 'is_any_of', label: 'Is any of' },
    { value: 'is_none_of', label: 'Is none of' },
  ],
  boolean: [
    { value: 'equals', label: 'Is' },
  ],
  date: [
    { value: 'equals', label: 'Is' },
    { value: 'today', label: 'Is today' },
    { value: 'this_week', label: 'Is this week' },
    { value: 'this_month', label: 'Is this month' },
    { value: 'past', label: 'Is in the past' },
    { value: 'future', label: 'Is in the future' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
  ],
  user: [
    { value: 'equals', label: 'Is' },
    { value: 'not_equals', label: 'Is not' },
    { value: 'is_empty', label: 'Is unassigned' },
    { value: 'is_not_empty', label: 'Is assigned' },
  ],
};

export function ViewToolbar({
  view,
  filters,
  sorts,
  onFiltersChange,
  onSortsChange,
  readOnly = false,
}: ViewToolbarProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  const filterCount = filters?.conditions?.length || 0;
  const sortCount = sorts.length;

  // Add a new filter condition
  const addFilter = () => {
    const newCondition: FilterCondition = {
      id: `filter-${Date.now()}`,
      fieldId: 'title',
      operator: 'contains',
      value: '',
    };

    const newFilters: FilterGroup = {
      operator: filters?.operator || 'and',
      conditions: [...(filters?.conditions || []), newCondition],
    };

    onFiltersChange(newFilters);
  };

  // Remove a filter condition
  const removeFilter = (conditionId: string) => {
    if (!filters) return;

    const newFilters: FilterGroup = {
      ...filters,
      conditions: filters.conditions.filter(
        (c) => 'id' in c && c.id !== conditionId
      ),
    };

    onFiltersChange(newFilters);
  };

  // Update a filter condition
  const updateFilter = (conditionId: string, updates: Partial<FilterCondition>) => {
    if (!filters) return;

    const newFilters: FilterGroup = {
      ...filters,
      conditions: filters.conditions.map((c) => {
        if ('id' in c && c.id === conditionId) {
          return { ...c, ...updates };
        }
        return c;
      }),
    };

    onFiltersChange(newFilters);
  };

  // Add a new sort
  const addSort = () => {
    const usedFields = new Set(sorts.map((s) => s.fieldId));
    const availableField = AVAILABLE_FIELDS.find((f) => !usedFields.has(f.id));
    
    if (availableField) {
      onSortsChange([...sorts, { fieldId: availableField.id, direction: 'asc' }]);
    }
  };

  // Remove a sort
  const removeSort = (index: number) => {
    const newSorts = [...sorts];
    newSorts.splice(index, 1);
    onSortsChange(newSorts);
  };

  // Update a sort
  const updateSort = (index: number, updates: Partial<SortConfig>) => {
    const newSorts = [...sorts];
    newSorts[index] = { ...newSorts[index], ...updates };
    onSortsChange(newSorts);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Filter Button */}
      <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5">
            <Filter className="h-3.5 w-3.5" />
            <span>Filter</span>
            {filterCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {filterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-4" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filters</h4>
              {filterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onFiltersChange({ operator: 'and', conditions: [] })}
                >
                  Clear all
                </Button>
              )}
            </div>

            {/* Filter Conditions */}
            <div className="space-y-2">
              {filters?.conditions?.map((condition) => {
                if (!('id' in condition)) return null;
                const field = AVAILABLE_FIELDS.find((f) => f.id === condition.fieldId);
                const operators = FILTER_OPERATORS[field?.type || 'text'] || [];

                return (
                  <div key={condition.id} className="flex items-center gap-2">
                    <Select
                      value={condition.fieldId}
                      onValueChange={(v) => updateFilter(condition.id, { fieldId: v })}
                      disabled={readOnly}
                    >
                      <SelectTrigger className="w-28 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_FIELDS.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={condition.operator}
                      onValueChange={(v) => updateFilter(condition.id, { operator: v as FilterOperator })}
                      disabled={readOnly}
                    >
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {!['is_empty', 'is_not_empty', 'today', 'this_week', 'this_month', 'past', 'future'].includes(condition.operator) && (
                      <Input
                        value={String(condition.value || '')}
                        onChange={(e) => updateFilter(condition.id, { value: e.target.value })}
                        className="flex-1 h-8"
                        placeholder="Value"
                        disabled={readOnly}
                      />
                    )}

                    {!readOnly && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => removeFilter(condition.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add Filter Button */}
            {!readOnly && (
              <Button variant="outline" size="sm" onClick={addFilter} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add filter
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Sort Button */}
      <Popover open={isSortOpen} onOpenChange={setIsSortOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5">
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span>Sort</span>
            {sortCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {sortCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-4" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Sort</h4>
              {sortCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onSortsChange([])}
                >
                  Clear all
                </Button>
              )}
            </div>

            {/* Sort Conditions */}
            <div className="space-y-2">
              {sorts.map((sort, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Select
                    value={sort.fieldId}
                    onValueChange={(v) => updateSort(index, { fieldId: v })}
                    disabled={readOnly}
                  >
                    <SelectTrigger className="flex-1 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_FIELDS.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={sort.direction}
                    onValueChange={(v) => updateSort(index, { direction: v as 'asc' | 'desc' })}
                    disabled={readOnly}
                  >
                    <SelectTrigger className="w-28 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
                    </SelectContent>
                  </Select>

                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => removeSort(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Add Sort Button */}
            {!readOnly && sorts.length < AVAILABLE_FIELDS.length && (
              <Button variant="outline" size="sm" onClick={addSort} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add sort
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* View Settings Button */}
      {!readOnly && (
        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
          <Settings2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
