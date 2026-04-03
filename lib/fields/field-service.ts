/**
 * Field Service
 * Phase 3: CRUD operations for custom fields
 */

import { prisma } from '@/lib/database';
import { cuid } from '@/lib/utils';
import type {
  FieldType,
  FieldConfig,
  FieldDefinition,
  FieldOption,
  FieldValue,
  DEFAULT_FIELD_TEMPLATES,
} from './types';

// =============================================================================
// Types
// =============================================================================

export interface CreateFieldInput {
  projectId: string;
  name: string;
  slug?: string;
  type: FieldType;
  config?: FieldConfig;
  position?: number;
  isRequired?: boolean;
  description?: string;
}

export interface UpdateFieldInput {
  name?: string;
  config?: FieldConfig;
  position?: number;
  isRequired?: boolean;
  description?: string;
}

export interface CreateFieldOptionInput {
  fieldDefinitionId: string;
  label: string;
  value?: string;
  color?: string;
  icon?: string;
  position?: number;
  isDefault?: boolean;
}

export interface SetFieldValueInput {
  taskId: string;
  fieldDefinitionId: string;
  value: unknown;
}

// =============================================================================
// Field Definition Service
// =============================================================================

export class FieldService {
  /**
   * Create a new field definition
   */
  static async createField(input: CreateFieldInput): Promise<FieldDefinition> {
    const { projectId, name, type, config, position, isRequired, description } = input;
    
    // Generate slug from name if not provided
    const slug = input.slug || this.generateSlug(name);
    
    // Get next position if not provided
    const nextPosition = position ?? await this.getNextPosition(projectId);
    
    const field = await prisma.fieldDefinition.create({
      data: {
        id: cuid(),
        project_id: projectId,
        name,
        slug,
        type,
        config: config ? JSON.parse(JSON.stringify(config)) : null,
        position: nextPosition,
        is_required: isRequired ?? false,
        is_system: false,
        description,
      },
    });
    
    return this.mapToFieldDefinition(field);
  }

  /**
   * Get all fields for a project
   */
  static async getProjectFields(projectId: string): Promise<FieldDefinition[]> {
    const fields = await prisma.fieldDefinition.findMany({
      where: { project_id: projectId },
      orderBy: { position: 'asc' },
      include: {
        options: {
          orderBy: { position: 'asc' },
        },
      },
    });
    
    return fields.map(this.mapToFieldDefinition);
  }

  /**
   * Get a single field by ID
   */
  static async getField(fieldId: string): Promise<FieldDefinition | null> {
    const field = await prisma.fieldDefinition.findUnique({
      where: { id: fieldId },
      include: {
        options: {
          orderBy: { position: 'asc' },
        },
      },
    });
    
    return field ? this.mapToFieldDefinition(field) : null;
  }

  /**
   * Get a field by slug within a project
   */
  static async getFieldBySlug(projectId: string, slug: string): Promise<FieldDefinition | null> {
    const field = await prisma.fieldDefinition.findUnique({
      where: {
        project_id_slug: {
          project_id: projectId,
          slug,
        },
      },
      include: {
        options: {
          orderBy: { position: 'asc' },
        },
      },
    });
    
    return field ? this.mapToFieldDefinition(field) : null;
  }

  /**
   * Update a field definition
   */
  static async updateField(fieldId: string, input: UpdateFieldInput): Promise<FieldDefinition> {
    const field = await prisma.fieldDefinition.update({
      where: { id: fieldId },
      data: {
        name: input.name,
        config: input.config ? JSON.parse(JSON.stringify(input.config)) : undefined,
        position: input.position,
        is_required: input.isRequired,
        description: input.description,
      },
      include: {
        options: {
          orderBy: { position: 'asc' },
        },
      },
    });
    
    return this.mapToFieldDefinition(field);
  }

  /**
   * Delete a field definition (non-system fields only)
   */
  static async deleteField(fieldId: string): Promise<void> {
    const field = await prisma.fieldDefinition.findUnique({
      where: { id: fieldId },
    });
    
    if (!field) {
      throw new Error('Field not found');
    }
    
    if (field.is_system) {
      throw new Error('Cannot delete system fields');
    }
    
    await prisma.fieldDefinition.delete({
      where: { id: fieldId },
    });
  }

  /**
   * Reorder fields
   */
  static async reorderFields(projectId: string, fieldIds: string[]): Promise<void> {
    const updates = fieldIds.map((id, index) =>
      prisma.fieldDefinition.update({
        where: { id },
        data: { position: index },
      })
    );
    
    await prisma.$transaction(updates);
  }

  /**
   * Initialize default fields for a new project
   */
  static async initializeProjectFields(projectId: string, templates?: typeof DEFAULT_FIELD_TEMPLATES): Promise<FieldDefinition[]> {
    const fieldsToCreate = templates || (await this.getDefaultTemplates());
    
    const fields = await prisma.$transaction(
      fieldsToCreate.map((template, index) =>
        prisma.fieldDefinition.create({
          data: {
            id: cuid(),
            project_id: projectId,
            name: template.name,
            slug: template.slug,
            type: template.type as FieldType,
            config: template.config ? JSON.parse(JSON.stringify(template.config)) : null,
            position: index,
            is_required: template.slug === 'title',
            is_system: template.isDefault,
            description: template.description,
          },
        })
      )
    );
    
    return fields.map(this.mapToFieldDefinition);
  }

  // =============================================================================
  // Field Options
  // =============================================================================

  /**
   * Add an option to a select/multiselect/status field
   */
  static async addFieldOption(input: CreateFieldOptionInput): Promise<FieldOption> {
    const { fieldDefinitionId, label, color, icon, position, isDefault } = input;
    
    // Generate value from label if not provided
    const value = input.value || this.generateSlug(label);
    
    // Get next position if not provided
    const nextPosition = position ?? await this.getNextOptionPosition(fieldDefinitionId);
    
    const option = await prisma.fieldOption.create({
      data: {
        id: cuid(),
        field_definition_id: fieldDefinitionId,
        label,
        value,
        color,
        icon,
        position: nextPosition,
        is_default: isDefault ?? false,
      },
    });
    
    return this.mapToFieldOption(option);
  }

  /**
   * Update a field option
   */
  static async updateFieldOption(
    optionId: string,
    input: Partial<CreateFieldOptionInput>
  ): Promise<FieldOption> {
    const option = await prisma.fieldOption.update({
      where: { id: optionId },
      data: {
        label: input.label,
        color: input.color,
        icon: input.icon,
        position: input.position,
        is_default: input.isDefault,
      },
    });
    
    return this.mapToFieldOption(option);
  }

  /**
   * Delete a field option
   */
  static async deleteFieldOption(optionId: string): Promise<void> {
    await prisma.fieldOption.delete({
      where: { id: optionId },
    });
  }

  /**
   * Reorder field options
   */
  static async reorderFieldOptions(fieldDefinitionId: string, optionIds: string[]): Promise<void> {
    const updates = optionIds.map((id, index) =>
      prisma.fieldOption.update({
        where: { id },
        data: { position: index },
      })
    );
    
    await prisma.$transaction(updates);
  }

  // =============================================================================
  // Field Values
  // =============================================================================

  /**
   * Set a field value for a task
   */
  static async setFieldValue(input: SetFieldValueInput): Promise<FieldValue> {
    const { taskId, fieldDefinitionId, value } = input;
    
    // Get field definition to determine storage column
    const field = await prisma.fieldDefinition.findUnique({
      where: { id: fieldDefinitionId },
    });
    
    if (!field) {
      throw new Error('Field definition not found');
    }
    
    const valueData = this.prepareValueData(field.type as FieldType, value);
    
    const fieldValue = await prisma.fieldValue.upsert({
      where: {
        task_id_field_definition_id: {
          task_id: taskId,
          field_definition_id: fieldDefinitionId,
        },
      },
      create: {
        id: cuid(),
        task_id: taskId,
        field_definition_id: fieldDefinitionId,
        ...valueData,
      },
      update: valueData,
    });
    
    return this.mapToFieldValue(fieldValue);
  }

  /**
   * Get all field values for a task
   */
  static async getTaskFieldValues(taskId: string): Promise<FieldValue[]> {
    const values = await prisma.fieldValue.findMany({
      where: { task_id: taskId },
      include: {
        field_definition: true,
      },
    });
    
    return values.map(this.mapToFieldValue);
  }

  /**
   * Delete a field value
   */
  static async deleteFieldValue(taskId: string, fieldDefinitionId: string): Promise<void> {
    await prisma.fieldValue.delete({
      where: {
        task_id_field_definition_id: {
          task_id: taskId,
          field_definition_id: fieldDefinitionId,
        },
      },
    });
  }

  /**
   * Bulk set field values for a task
   */
  static async bulkSetFieldValues(
    taskId: string,
    values: Array<{ fieldDefinitionId: string; value: unknown }>
  ): Promise<FieldValue[]> {
    const results = await Promise.all(
      values.map((v) =>
        this.setFieldValue({
          taskId,
          fieldDefinitionId: v.fieldDefinitionId,
          value: v.value,
        })
      )
    );
    
    return results;
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  private static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  }

  private static async getNextPosition(projectId: string): Promise<number> {
    const lastField = await prisma.fieldDefinition.findFirst({
      where: { project_id: projectId },
      orderBy: { position: 'desc' },
    });
    
    return (lastField?.position ?? -1) + 1;
  }

  private static async getNextOptionPosition(fieldDefinitionId: string): Promise<number> {
    const lastOption = await prisma.fieldOption.findFirst({
      where: { field_definition_id: fieldDefinitionId },
      orderBy: { position: 'desc' },
    });
    
    return (lastOption?.position ?? -1) + 1;
  }

  private static async getDefaultTemplates() {
    const templates = await prisma.fieldTemplate.findMany({
      where: { is_default: true },
      orderBy: { position: 'asc' },
    });
    
    if (templates.length === 0) {
      // Return built-in defaults if no templates in database
      const { DEFAULT_FIELD_TEMPLATES } = await import('./types');
      return DEFAULT_FIELD_TEMPLATES;
    }
    
    return templates;
  }

  private static prepareValueData(
    type: FieldType,
    value: unknown
  ): {
    text_value?: string | null;
    number_value?: number | null;
    date_value?: Date | null;
    json_value?: unknown | null;
  } {
    // Reset all value columns
    const data: {
      text_value: string | null;
      number_value: number | null;
      date_value: Date | null;
      json_value: unknown | null;
    } = {
      text_value: null,
      number_value: null,
      date_value: null,
      json_value: null,
    };
    
    if (value === null || value === undefined) {
      return data;
    }
    
    switch (type) {
      case 'text':
      case 'textarea':
      case 'url':
      case 'email':
      case 'phone':
      case 'select':
      case 'status':
      case 'priority':
      case 'user':
        data.text_value = String(value);
        break;
        
      case 'number':
      case 'currency':
      case 'percent':
      case 'progress':
      case 'rating':
      case 'duration':
        data.number_value = Number(value);
        break;
        
      case 'date':
      case 'datetime':
        data.date_value = new Date(value as string | number | Date);
        break;
        
      case 'checkbox':
        data.number_value = value ? 1 : 0;
        break;
        
      case 'multiselect':
      case 'users':
      case 'relation':
      case 'attachment':
      case 'formula':
      case 'rollup':
      case 'lookup':
        data.json_value = value;
        break;
        
      default:
        data.json_value = value;
    }
    
    return data;
  }

  private static mapToFieldDefinition(field: any): FieldDefinition {
    return {
      id: field.id,
      projectId: field.project_id,
      name: field.name,
      slug: field.slug,
      type: field.type as FieldType,
      config: field.config as FieldConfig | undefined,
      position: field.position,
      isRequired: field.is_required,
      isSystem: field.is_system,
      description: field.description || undefined,
      createdAt: field.created_at,
      updatedAt: field.updated_at,
    };
  }

  private static mapToFieldOption(option: any): FieldOption {
    return {
      id: option.id,
      fieldDefinitionId: option.field_definition_id,
      label: option.label,
      value: option.value,
      color: option.color || undefined,
      icon: option.icon || undefined,
      position: option.position,
      isDefault: option.is_default,
    };
  }

  private static mapToFieldValue(value: any): FieldValue {
    return {
      id: value.id,
      taskId: value.task_id,
      fieldDefinitionId: value.field_definition_id,
      textValue: value.text_value || undefined,
      numberValue: value.number_value || undefined,
      dateValue: value.date_value || undefined,
      jsonValue: value.json_value || undefined,
      createdAt: value.created_at,
      updatedAt: value.updated_at,
    };
  }
}

export default FieldService;
