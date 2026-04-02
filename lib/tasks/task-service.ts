/**
 * Task Service
 * Phase 3: Enhanced task operations with subtasks, links, and attachments
 */

import { prisma } from '@/lib/database';
import { cuid } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export type TaskType = 'epic' | 'story' | 'task' | 'subtask' | 'bug' | 'milestone';
export type LinkType = 'blocks' | 'blocked_by' | 'relates_to' | 'duplicates' | 'cloned_from' | 'parent_of';

export interface CreateTaskInput {
  projectId: string;
  columnId?: string;
  title: string;
  description?: string;
  parentId?: string;
  taskType?: TaskType;
  position?: number;
  createdBy?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  columnId?: string;
  position?: number;
  statusId?: string;
  taskType?: TaskType;
  updatedBy?: string;
}

export interface CreateSubtaskInput {
  parentId: string;
  title: string;
  description?: string;
  position?: number;
  createdBy?: string;
}

export interface CreateLinkInput {
  fromTaskId: string;
  toTaskId: string;
  linkType: LinkType;
  createdBy?: string;
}

export interface CreateAttachmentInput {
  taskId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  thumbnailUrl?: string;
  storageProvider?: string;
  storagePath?: string;
  uploadedBy?: string;
}

export interface CreateTimeEntryInput {
  taskId: string;
  userId: string;
  description?: string;
  startedAt: Date;
  endedAt?: Date;
  duration?: number;
  billable?: boolean;
}

// =============================================================================
// Task Service
// =============================================================================

export class TaskService {
  // =============================================================================
  // Task CRUD
  // =============================================================================

  /**
   * Create a new task
   */
  static async createTask(input: CreateTaskInput) {
    const {
      projectId,
      columnId,
      title,
      description,
      parentId,
      taskType = 'task',
      createdBy,
    } = input;
    
    // Get next position
    const position = input.position ?? await this.getNextPosition(columnId, parentId);
    
    const task = await prisma.task.create({
      data: {
        id: cuid(),
        project_id: projectId,
        column_id: columnId,
        title,
        description,
        parent_id: parentId,
        task_type: taskType,
        position,
        created_by: createdBy,
      },
      include: {
        subtasks: true,
        parent: true,
      },
    });
    
    return task;
  }

  /**
   * Get a task by ID with all related data
   */
  static async getTask(taskId: string) {
    return prisma.task.findUnique({
      where: { id: taskId },
      include: {
        subtasks: {
          orderBy: { position: 'asc' },
        },
        parent: true,
        task_comments: {
          orderBy: { created_at: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                full_name: true,
                avatar_url: true,
              },
            },
          },
        },
        assignee: {
          select: {
            id: true,
            full_name: true,
            avatar_url: true,
          },
        },
        creator: {
          select: {
            id: true,
            full_name: true,
            avatar_url: true,
          },
        },
      },
    });
  }

  /**
   * Update a task
   */
  static async updateTask(taskId: string, input: UpdateTaskInput) {
    const { title, description, columnId, position, statusId, taskType, updatedBy } = input;
    
    return prisma.task.update({
      where: { id: taskId },
      data: {
        title,
        description,
        column_id: columnId,
        position,
        status_id: statusId,
        task_type: taskType,
        updated_by: updatedBy,
      },
    });
  }

  /**
   * Archive a task
   */
  static async archiveTask(taskId: string): Promise<void> {
    await prisma.task.update({
      where: { id: taskId },
      data: { archived_at: new Date() },
    });
  }

  /**
   * Restore an archived task
   */
  static async restoreTask(taskId: string): Promise<void> {
    await prisma.task.update({
      where: { id: taskId },
      data: { archived_at: null },
    });
  }

  /**
   * Complete a task
   */
  static async completeTask(taskId: string): Promise<void> {
    await prisma.task.update({
      where: { id: taskId },
      data: {
        is_done: true,
        completed_at: new Date(),
      },
    });
  }

  /**
   * Reopen a task
   */
  static async reopenTask(taskId: string): Promise<void> {
    await prisma.task.update({
      where: { id: taskId },
      data: {
        is_done: false,
        completed_at: null,
      },
    });
  }

  // =============================================================================
  // Subtasks
  // =============================================================================

  /**
   * Create a subtask
   */
  static async createSubtask(input: CreateSubtaskInput) {
    const { parentId, title, description, createdBy } = input;
    
    // Get parent task to find project
    const parent = await prisma.task.findUnique({
      where: { id: parentId },
    });
    
    if (!parent) {
      throw new Error('Parent task not found');
    }
    
    const position = input.position ?? await this.getNextSubtaskPosition(parentId);
    
    return prisma.task.create({
      data: {
        id: cuid(),
        project_id: parent.project_id,
        column_id: parent.column_id,
        parent_id: parentId,
        title,
        description,
        task_type: 'subtask',
        position,
        created_by: createdBy,
      },
    });
  }

  /**
   * Get subtasks for a task
   */
  static async getSubtasks(parentId: string) {
    return prisma.task.findMany({
      where: {
        parent_id: parentId,
        archived_at: null,
      },
      orderBy: { position: 'asc' },
      include: {
        assignee: {
          select: {
            id: true,
            full_name: true,
            avatar_url: true,
          },
        },
      },
    });
  }

  /**
   * Reorder subtasks
   */
  static async reorderSubtasks(parentId: string, taskIds: string[]): Promise<void> {
    const updates = taskIds.map((id, index) =>
      prisma.task.update({
        where: { id },
        data: { position: index },
      })
    );
    
    await prisma.$transaction(updates);
  }

  /**
   * Convert a task to a subtask
   */
  static async convertToSubtask(taskId: string, parentId: string): Promise<void> {
    const position = await this.getNextSubtaskPosition(parentId);
    
    await prisma.task.update({
      where: { id: taskId },
      data: {
        parent_id: parentId,
        task_type: 'subtask',
        position,
      },
    });
  }

  /**
   * Convert a subtask to a regular task
   */
  static async convertToTask(taskId: string): Promise<void> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });
    
    if (!task) {
      throw new Error('Task not found');
    }
    
    const position = await this.getNextPosition(task.column_id, null);
    
    await prisma.task.update({
      where: { id: taskId },
      data: {
        parent_id: null,
        task_type: 'task',
        position,
      },
    });
  }

  // =============================================================================
  // Task Links
  // =============================================================================

  /**
   * Create a link between tasks
   */
  static async createLink(input: CreateLinkInput) {
    const { fromTaskId, toTaskId, linkType, createdBy } = input;
    
    // Check for existing link
    const existing = await prisma.taskLink.findUnique({
      where: {
        from_task_id_to_task_id_link_type: {
          from_task_id: fromTaskId,
          to_task_id: toTaskId,
          link_type: linkType,
        },
      },
    });
    
    if (existing) {
      throw new Error('Link already exists');
    }
    
    // Prevent self-links
    if (fromTaskId === toTaskId) {
      throw new Error('Cannot link task to itself');
    }
    
    return prisma.taskLink.create({
      data: {
        id: cuid(),
        from_task_id: fromTaskId,
        to_task_id: toTaskId,
        link_type: linkType,
        created_by: createdBy,
      },
    });
  }

  /**
   * Get all links for a task
   */
  static async getTaskLinks(taskId: string) {
    const [outgoing, incoming] = await Promise.all([
      prisma.taskLink.findMany({
        where: { from_task_id: taskId },
      }),
      prisma.taskLink.findMany({
        where: { to_task_id: taskId },
      }),
    ]);
    
    return { outgoing, incoming };
  }

  /**
   * Delete a link
   */
  static async deleteLink(linkId: string): Promise<void> {
    await prisma.taskLink.delete({
      where: { id: linkId },
    });
  }

  /**
   * Get tasks blocked by this task
   */
  static async getBlockedTasks(taskId: string) {
    const links = await prisma.taskLink.findMany({
      where: {
        from_task_id: taskId,
        link_type: 'blocks',
      },
    });
    
    const taskIds = links.map(l => l.to_task_id);
    
    return prisma.task.findMany({
      where: { id: { in: taskIds } },
    });
  }

  /**
   * Get tasks blocking this task
   */
  static async getBlockingTasks(taskId: string) {
    const links = await prisma.taskLink.findMany({
      where: {
        to_task_id: taskId,
        link_type: 'blocks',
      },
    });
    
    const taskIds = links.map(l => l.from_task_id);
    
    return prisma.task.findMany({
      where: { id: { in: taskIds } },
    });
  }

  // =============================================================================
  // Attachments
  // =============================================================================

  /**
   * Add an attachment to a task
   */
  static async addAttachment(input: CreateAttachmentInput) {
    return prisma.attachment.create({
      data: {
        id: cuid(),
        task_id: input.taskId,
        file_name: input.fileName,
        file_url: input.fileUrl,
        file_size: BigInt(input.fileSize),
        file_type: input.fileType,
        thumbnail_url: input.thumbnailUrl,
        storage_provider: input.storageProvider || 'supabase',
        storage_path: input.storagePath,
        uploaded_by: input.uploadedBy,
      },
    });
  }

  /**
   * Get attachments for a task
   */
  static async getAttachments(taskId: string) {
    return prisma.attachment.findMany({
      where: { task_id: taskId },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Delete an attachment
   */
  static async deleteAttachment(attachmentId: string): Promise<void> {
    await prisma.attachment.delete({
      where: { id: attachmentId },
    });
  }

  // =============================================================================
  // Task Watchers
  // =============================================================================

  /**
   * Add a watcher to a task
   */
  static async addWatcher(taskId: string, userId: string): Promise<void> {
    await prisma.taskWatcher.create({
      data: {
        id: cuid(),
        task_id: taskId,
        user_id: userId,
      },
    });
  }

  /**
   * Remove a watcher from a task
   */
  static async removeWatcher(taskId: string, userId: string): Promise<void> {
    await prisma.taskWatcher.delete({
      where: {
        task_id_user_id: {
          task_id: taskId,
          user_id: userId,
        },
      },
    });
  }

  /**
   * Get watchers for a task
   */
  static async getWatchers(taskId: string) {
    const watchers = await prisma.taskWatcher.findMany({
      where: { task_id: taskId },
    });
    
    const userIds = watchers.map(w => w.user_id);
    
    return prisma.profile.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        full_name: true,
        avatar_url: true,
        email: true,
      },
    });
  }

  /**
   * Check if user is watching a task
   */
  static async isWatching(taskId: string, userId: string): Promise<boolean> {
    const watcher = await prisma.taskWatcher.findUnique({
      where: {
        task_id_user_id: {
          task_id: taskId,
          user_id: userId,
        },
      },
    });
    
    return !!watcher;
  }

  // =============================================================================
  // Time Tracking
  // =============================================================================

  /**
   * Start a time entry
   */
  static async startTimeEntry(
    taskId: string,
    userId: string,
    description?: string
  ) {
    return prisma.timeEntry.create({
      data: {
        id: cuid(),
        task_id: taskId,
        user_id: userId,
        description,
        started_at: new Date(),
      },
    });
  }

  /**
   * Stop a time entry
   */
  static async stopTimeEntry(timeEntryId: string) {
    const entry = await prisma.timeEntry.findUnique({
      where: { id: timeEntryId },
    });
    
    if (!entry) {
      throw new Error('Time entry not found');
    }
    
    const endedAt = new Date();
    const duration = Math.floor((endedAt.getTime() - entry.started_at.getTime()) / 1000);
    
    return prisma.timeEntry.update({
      where: { id: timeEntryId },
      data: {
        ended_at: endedAt,
        duration,
      },
    });
  }

  /**
   * Add a manual time entry
   */
  static async addTimeEntry(input: CreateTimeEntryInput) {
    return prisma.timeEntry.create({
      data: {
        id: cuid(),
        task_id: input.taskId,
        user_id: input.userId,
        description: input.description,
        started_at: input.startedAt,
        ended_at: input.endedAt,
        duration: input.duration,
        billable: input.billable ?? false,
      },
    });
  }

  /**
   * Get time entries for a task
   */
  static async getTimeEntries(taskId: string) {
    return prisma.timeEntry.findMany({
      where: { task_id: taskId },
      orderBy: { started_at: 'desc' },
    });
  }

  /**
   * Get total time for a task
   */
  static async getTotalTime(taskId: string): Promise<number> {
    const entries = await prisma.timeEntry.findMany({
      where: { task_id: taskId },
      select: { duration: true },
    });
    
    return entries.reduce((sum, e) => sum + (e.duration || 0), 0);
  }

  /**
   * Delete a time entry
   */
  static async deleteTimeEntry(timeEntryId: string): Promise<void> {
    await prisma.timeEntry.delete({
      where: { id: timeEntryId },
    });
  }

  // =============================================================================
  // Labels
  // =============================================================================

  /**
   * Add a label to a task
   */
  static async addLabel(taskId: string, labelId: string): Promise<void> {
    await prisma.taskLabel.create({
      data: {
        id: cuid(),
        task_id: taskId,
        label_id: labelId,
      },
    });
  }

  /**
   * Remove a label from a task
   */
  static async removeLabel(taskId: string, labelId: string): Promise<void> {
    await prisma.taskLabel.delete({
      where: {
        task_id_label_id: {
          task_id: taskId,
          label_id: labelId,
        },
      },
    });
  }

  /**
   * Get labels for a task
   */
  static async getLabels(taskId: string) {
    const taskLabels = await prisma.taskLabel.findMany({
      where: { task_id: taskId },
      include: { label: true },
    });
    
    return taskLabels.map(tl => tl.label);
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  private static async getNextPosition(
    columnId: string | null | undefined,
    parentId: string | null | undefined
  ): Promise<number> {
    if (parentId) {
      return this.getNextSubtaskPosition(parentId);
    }
    
    if (!columnId) {
      return 0;
    }
    
    const lastTask = await prisma.task.findFirst({
      where: {
        column_id: columnId,
        parent_id: null,
      },
      orderBy: { position: 'desc' },
    });
    
    return (lastTask?.position ?? -1) + 1;
  }

  private static async getNextSubtaskPosition(parentId: string): Promise<number> {
    const lastSubtask = await prisma.task.findFirst({
      where: { parent_id: parentId },
      orderBy: { position: 'desc' },
    });
    
    return (lastSubtask?.position ?? -1) + 1;
  }
}

export default TaskService;
