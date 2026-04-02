/**
 * View Service
 * Phase 3: CRUD operations for views
 */

import { prisma } from '@/lib/database';
import { cuid } from '@/lib/utils';
import type { View, ViewType, ViewConfig, DEFAULT_VIEWS } from './types';

// =============================================================================
// Types
// =============================================================================

export interface CreateViewInput {
  projectId: string;
  name: string;
  type: ViewType;
  config: ViewConfig;
  isDefault?: boolean;
  isPersonal?: boolean;
  position?: number;
  createdBy?: string;
}

export interface UpdateViewInput {
  name?: string;
  config?: ViewConfig;
  isDefault?: boolean;
  isLocked?: boolean;
  position?: number;
}

export interface DuplicateViewInput {
  viewId: string;
  name?: string;
  createdBy?: string;
}

// =============================================================================
// View Service
// =============================================================================

export class ViewService {
  /**
   * Create a new view
   */
  static async createView(input: CreateViewInput): Promise<View> {
    const {
      projectId,
      name,
      type,
      config,
      isDefault = false,
      isPersonal = false,
      createdBy,
    } = input;
    
    // Get next position if not provided
    const position = input.position ?? await this.getNextPosition(projectId);
    
    // If this is set as default, unset other defaults
    if (isDefault) {
      await this.unsetDefaultView(projectId);
    }
    
    const view = await prisma.view.create({
      data: {
        id: cuid(),
        project_id: projectId,
        name,
        type,
        config: JSON.parse(JSON.stringify(config)),
        is_default: isDefault,
        is_personal: isPersonal,
        is_locked: false,
        created_by: createdBy,
        position,
      },
    });
    
    return this.mapToView(view);
  }

  /**
   * Get all views for a project
   */
  static async getProjectViews(
    projectId: string,
    options?: {
      includePersonal?: boolean;
      userId?: string;
    }
  ): Promise<View[]> {
    const where: any = { project_id: projectId };
    
    if (!options?.includePersonal) {
      where.is_personal = false;
    } else if (options.userId) {
      // Include shared views and personal views for this user
      where.OR = [
        { is_personal: false },
        { is_personal: true, created_by: options.userId },
      ];
    }
    
    const views = await prisma.view.findMany({
      where,
      orderBy: { position: 'asc' },
    });
    
    return views.map(this.mapToView);
  }

  /**
   * Get a single view by ID
   */
  static async getView(viewId: string): Promise<View | null> {
    const view = await prisma.view.findUnique({
      where: { id: viewId },
    });
    
    return view ? this.mapToView(view) : null;
  }

  /**
   * Get the default view for a project
   */
  static async getDefaultView(projectId: string): Promise<View | null> {
    const view = await prisma.view.findFirst({
      where: {
        project_id: projectId,
        is_default: true,
      },
    });
    
    if (view) {
      return this.mapToView(view);
    }
    
    // Return first view if no default set
    const firstView = await prisma.view.findFirst({
      where: { project_id: projectId },
      orderBy: { position: 'asc' },
    });
    
    return firstView ? this.mapToView(firstView) : null;
  }

  /**
   * Update a view
   */
  static async updateView(viewId: string, input: UpdateViewInput): Promise<View> {
    const existingView = await prisma.view.findUnique({
      where: { id: viewId },
    });
    
    if (!existingView) {
      throw new Error('View not found');
    }
    
    if (existingView.is_locked && !input.isLocked) {
      // Allow unlocking
    } else if (existingView.is_locked) {
      throw new Error('Cannot modify locked view');
    }
    
    // If setting as default, unset other defaults
    if (input.isDefault) {
      await this.unsetDefaultView(existingView.project_id);
    }
    
    const view = await prisma.view.update({
      where: { id: viewId },
      data: {
        name: input.name,
        config: input.config ? JSON.parse(JSON.stringify(input.config)) : undefined,
        is_default: input.isDefault,
        is_locked: input.isLocked,
        position: input.position,
      },
    });
    
    return this.mapToView(view);
  }

  /**
   * Delete a view
   */
  static async deleteView(viewId: string): Promise<void> {
    const view = await prisma.view.findUnique({
      where: { id: viewId },
    });
    
    if (!view) {
      throw new Error('View not found');
    }
    
    if (view.is_locked) {
      throw new Error('Cannot delete locked view');
    }
    
    // Check if this is the only view
    const viewCount = await prisma.view.count({
      where: { project_id: view.project_id },
    });
    
    if (viewCount <= 1) {
      throw new Error('Cannot delete the only view');
    }
    
    await prisma.view.delete({
      where: { id: viewId },
    });
    
    // If this was the default view, set another as default
    if (view.is_default) {
      const firstView = await prisma.view.findFirst({
        where: { project_id: view.project_id },
        orderBy: { position: 'asc' },
      });
      
      if (firstView) {
        await prisma.view.update({
          where: { id: firstView.id },
          data: { is_default: true },
        });
      }
    }
  }

  /**
   * Duplicate a view
   */
  static async duplicateView(input: DuplicateViewInput): Promise<View> {
    const { viewId, name, createdBy } = input;
    
    const originalView = await prisma.view.findUnique({
      where: { id: viewId },
    });
    
    if (!originalView) {
      throw new Error('View not found');
    }
    
    const position = await this.getNextPosition(originalView.project_id);
    
    const newView = await prisma.view.create({
      data: {
        id: cuid(),
        project_id: originalView.project_id,
        name: name || `${originalView.name} (Copy)`,
        type: originalView.type,
        config: originalView.config,
        is_default: false,
        is_personal: false,
        is_locked: false,
        created_by: createdBy,
        position,
      },
    });
    
    return this.mapToView(newView);
  }

  /**
   * Reorder views
   */
  static async reorderViews(projectId: string, viewIds: string[]): Promise<void> {
    const updates = viewIds.map((id, index) =>
      prisma.view.update({
        where: { id },
        data: { position: index },
      })
    );
    
    await prisma.$transaction(updates);
  }

  /**
   * Initialize default views for a new project
   */
  static async initializeProjectViews(
    projectId: string,
    createdBy?: string,
    templates?: typeof DEFAULT_VIEWS
  ): Promise<View[]> {
    const viewsToCreate = templates || (await this.getDefaultViewTemplates());
    
    const views = await prisma.$transaction(
      viewsToCreate.map((template, index) =>
        prisma.view.create({
          data: {
            id: cuid(),
            project_id: projectId,
            name: template.name,
            type: template.type,
            config: JSON.parse(JSON.stringify(template.config)),
            is_default: template.isDefault,
            is_personal: template.isPersonal,
            is_locked: template.isLocked,
            created_by: createdBy,
            position: index,
          },
        })
      )
    );
    
    return views.map(this.mapToView);
  }

  /**
   * Update view filters
   */
  static async updateViewFilters(
    viewId: string,
    filters: ViewConfig['filters']
  ): Promise<View> {
    const view = await prisma.view.findUnique({
      where: { id: viewId },
    });
    
    if (!view) {
      throw new Error('View not found');
    }
    
    const config = view.config as ViewConfig;
    config.filters = filters;
    
    const updatedView = await prisma.view.update({
      where: { id: viewId },
      data: {
        config: JSON.parse(JSON.stringify(config)),
      },
    });
    
    return this.mapToView(updatedView);
  }

  /**
   * Update view sorts
   */
  static async updateViewSorts(
    viewId: string,
    sorts: ViewConfig['sorts']
  ): Promise<View> {
    const view = await prisma.view.findUnique({
      where: { id: viewId },
    });
    
    if (!view) {
      throw new Error('View not found');
    }
    
    const config = view.config as ViewConfig;
    config.sorts = sorts;
    
    const updatedView = await prisma.view.update({
      where: { id: viewId },
      data: {
        config: JSON.parse(JSON.stringify(config)),
      },
    });
    
    return this.mapToView(updatedView);
  }

  /**
   * Update view field display settings
   */
  static async updateViewFields(
    viewId: string,
    fields: ViewConfig['fields']
  ): Promise<View> {
    const view = await prisma.view.findUnique({
      where: { id: viewId },
    });
    
    if (!view) {
      throw new Error('View not found');
    }
    
    const config = view.config as ViewConfig;
    config.fields = fields;
    
    const updatedView = await prisma.view.update({
      where: { id: viewId },
      data: {
        config: JSON.parse(JSON.stringify(config)),
      },
    });
    
    return this.mapToView(updatedView);
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  private static async getNextPosition(projectId: string): Promise<number> {
    const lastView = await prisma.view.findFirst({
      where: { project_id: projectId },
      orderBy: { position: 'desc' },
    });
    
    return (lastView?.position ?? -1) + 1;
  }

  private static async unsetDefaultView(projectId: string): Promise<void> {
    await prisma.view.updateMany({
      where: {
        project_id: projectId,
        is_default: true,
      },
      data: { is_default: false },
    });
  }

  private static async getDefaultViewTemplates() {
    const { DEFAULT_VIEWS } = await import('./types');
    return DEFAULT_VIEWS;
  }

  private static mapToView(view: any): View {
    return {
      id: view.id,
      projectId: view.project_id,
      name: view.name,
      type: view.type as ViewType,
      config: view.config as ViewConfig,
      isDefault: view.is_default,
      isPersonal: view.is_personal,
      isLocked: view.is_locked,
      createdBy: view.created_by || undefined,
      position: view.position,
      createdAt: view.created_at,
      updatedAt: view.updated_at,
    };
  }
}

export default ViewService;
