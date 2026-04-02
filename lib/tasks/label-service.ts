/**
 * Label Service
 * Phase 3: Project-level label management
 */

import { prisma } from '@/lib/database';
import { cuid } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface CreateLabelInput {
  projectId: string;
  name: string;
  color: string;
  description?: string;
}

export interface UpdateLabelInput {
  name?: string;
  color?: string;
  description?: string;
}

export interface Label {
  id: string;
  projectId: string;
  name: string;
  color: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// Label Service
// =============================================================================

export class LabelService {
  /**
   * Create a new label
   */
  static async createLabel(input: CreateLabelInput): Promise<Label> {
    const label = await prisma.label.create({
      data: {
        id: cuid(),
        project_id: input.projectId,
        name: input.name,
        color: input.color,
        description: input.description,
      },
    });
    
    return this.mapToLabel(label);
  }

  /**
   * Get all labels for a project
   */
  static async getProjectLabels(projectId: string): Promise<Label[]> {
    const labels = await prisma.label.findMany({
      where: { project_id: projectId },
      orderBy: { name: 'asc' },
    });
    
    return labels.map(this.mapToLabel);
  }

  /**
   * Get a label by ID
   */
  static async getLabel(labelId: string): Promise<Label | null> {
    const label = await prisma.label.findUnique({
      where: { id: labelId },
    });
    
    return label ? this.mapToLabel(label) : null;
  }

  /**
   * Update a label
   */
  static async updateLabel(labelId: string, input: UpdateLabelInput): Promise<Label> {
    const label = await prisma.label.update({
      where: { id: labelId },
      data: {
        name: input.name,
        color: input.color,
        description: input.description,
      },
    });
    
    return this.mapToLabel(label);
  }

  /**
   * Delete a label
   */
  static async deleteLabel(labelId: string): Promise<void> {
    // TaskLabel entries will be cascade deleted
    await prisma.label.delete({
      where: { id: labelId },
    });
  }

  /**
   * Get tasks with a specific label
   */
  static async getLabelTasks(labelId: string) {
    const taskLabels = await prisma.taskLabel.findMany({
      where: { label_id: labelId },
    });
    
    const taskIds = taskLabels.map(tl => tl.task_id);
    
    return prisma.task.findMany({
      where: { id: { in: taskIds } },
    });
  }

  /**
   * Get label usage count
   */
  static async getLabelUsageCount(labelId: string): Promise<number> {
    return prisma.taskLabel.count({
      where: { label_id: labelId },
    });
  }

  /**
   * Initialize default labels for a new project
   */
  static async initializeProjectLabels(projectId: string): Promise<Label[]> {
    const defaultLabels = [
      { name: 'Bug', color: '#ef4444' },
      { name: 'Feature', color: '#3b82f6' },
      { name: 'Enhancement', color: '#8b5cf6' },
      { name: 'Documentation', color: '#06b6d4' },
      { name: 'Help Wanted', color: '#22c55e' },
      { name: 'Question', color: '#f59e0b' },
    ];
    
    const labels = await prisma.$transaction(
      defaultLabels.map((label) =>
        prisma.label.create({
          data: {
            id: cuid(),
            project_id: projectId,
            name: label.name,
            color: label.color,
          },
        })
      )
    );
    
    return labels.map(this.mapToLabel);
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  private static mapToLabel(label: any): Label {
    return {
      id: label.id,
      projectId: label.project_id,
      name: label.name,
      color: label.color,
      description: label.description || undefined,
      createdAt: label.created_at,
      updatedAt: label.updated_at,
    };
  }
}

export default LabelService;
