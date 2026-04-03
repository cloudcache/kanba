/**
 * Webhook Service
 * Phase 5: Manage and deliver webhooks
 */

import { createHmac, randomBytes } from 'crypto';
import { prisma } from '@/lib/database';

// =============================================================================
// Types
// =============================================================================

export interface Webhook {
  id: string;
  organizationId?: string;
  projectId?: string;
  name: string;
  url: string;
  secret?: string;
  events: string[];
  isActive: boolean;
  retryCount: number;
  timeoutSeconds: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventType: string;
  payload: unknown;
  responseCode?: number;
  responseBody?: string;
  errorMessage?: string;
  attempts: number;
  deliveredAt?: Date;
  createdAt: Date;
}

export interface CreateWebhookInput {
  organizationId?: string;
  projectId?: string;
  name: string;
  url: string;
  events: string[];
  createdBy: string;
  retryCount?: number;
  timeoutSeconds?: number;
}

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: unknown;
}

// Available webhook events
export const WEBHOOK_EVENTS = {
  // Task events
  'task.created': 'When a task is created',
  'task.updated': 'When a task is updated',
  'task.deleted': 'When a task is deleted',
  'task.completed': 'When a task is marked complete',
  'task.moved': 'When a task is moved to a different column',
  
  // Project events
  'project.created': 'When a project is created',
  'project.updated': 'When a project is updated',
  'project.deleted': 'When a project is deleted',
  
  // Member events
  'member.added': 'When a member is added to a project',
  'member.removed': 'When a member is removed from a project',
  'member.role_changed': 'When a member role changes',
  
  // Comment events
  'comment.created': 'When a comment is created',
  'comment.updated': 'When a comment is updated',
  'comment.deleted': 'When a comment is deleted',
  
  // Attachment events
  'attachment.added': 'When an attachment is added',
  'attachment.removed': 'When an attachment is removed',
} as const;

export type WebhookEvent = keyof typeof WEBHOOK_EVENTS;

// =============================================================================
// Service Implementation
// =============================================================================

export class WebhookService {
  /**
   * Create a new webhook
   */
  async create(input: CreateWebhookInput): Promise<Webhook> {
    // Generate webhook secret
    const secret = randomBytes(32).toString('hex');

    const webhook = await prisma.webhook.create({
      data: {
        organization_id: input.organizationId,
        project_id: input.projectId,
        name: input.name,
        url: input.url,
        secret,
        events: input.events,
        is_active: true,
        retry_count: input.retryCount || 3,
        timeout_seconds: input.timeoutSeconds || 30,
        created_by: input.createdBy,
      },
    });

    return this.toWebhook(webhook);
  }

  /**
   * Update a webhook
   */
  async update(
    id: string,
    updates: Partial<Pick<Webhook, 'name' | 'url' | 'events' | 'isActive' | 'retryCount' | 'timeoutSeconds'>>
  ): Promise<Webhook> {
    const webhook = await prisma.webhook.update({
      where: { id },
      data: {
        name: updates.name,
        url: updates.url,
        events: updates.events,
        is_active: updates.isActive,
        retry_count: updates.retryCount,
        timeout_seconds: updates.timeoutSeconds,
      },
    });

    return this.toWebhook(webhook);
  }

  /**
   * Delete a webhook
   */
  async delete(id: string): Promise<void> {
    await prisma.webhook.delete({ where: { id } });
  }

  /**
   * List webhooks for a project or organization
   */
  async list(projectId?: string, organizationId?: string): Promise<Webhook[]> {
    const webhooks = await prisma.webhook.findMany({
      where: {
        ...(projectId && { project_id: projectId }),
        ...(organizationId && { organization_id: organizationId }),
      },
      orderBy: { created_at: 'desc' },
    });

    return webhooks.map(this.toWebhook);
  }

  /**
   * Get webhook deliveries
   */
  async getDeliveries(webhookId: string, limit: number = 50): Promise<WebhookDelivery[]> {
    const deliveries = await prisma.webhookDelivery.findMany({
      where: { webhook_id: webhookId },
      orderBy: { created_at: 'desc' },
      take: limit,
    });

    return deliveries.map(this.toWebhookDelivery);
  }

  /**
   * Trigger webhooks for an event
   */
  async trigger(event: WebhookEvent, data: unknown, projectId?: string, organizationId?: string): Promise<void> {
    // Find matching webhooks
    const webhooks = await prisma.webhook.findMany({
      where: {
        is_active: true,
        events: { has: event },
        OR: [
          ...(projectId ? [{ project_id: projectId }] : []),
          ...(organizationId ? [{ organization_id: organizationId }] : []),
        ],
      },
    });

    // Deliver to each webhook
    const deliveryPromises = webhooks.map((webhook) =>
      this.deliver(webhook.id, event, data)
    );

    // Execute in parallel (don't await to prevent blocking)
    Promise.allSettled(deliveryPromises).catch(console.error);
  }

  /**
   * Deliver a webhook payload
   */
  async deliver(webhookId: string, event: WebhookEvent, data: unknown): Promise<WebhookDelivery> {
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    const payloadString = JSON.stringify(payload);

    // Create signature
    const signature = this.createSignature(payloadString, webhook.secret || '');

    // Attempt delivery with retries
    let lastError: string | undefined;
    let responseCode: number | undefined;
    let responseBody: string | undefined;
    let deliveredAt: Date | undefined;

    for (let attempt = 1; attempt <= webhook.retry_count; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), webhook.timeout_seconds * 1000);

        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': event,
            'X-Webhook-Delivery': `delivery-${Date.now()}`,
          },
          body: payloadString,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        responseCode = response.status;
        responseBody = await response.text().catch(() => undefined);

        if (response.ok) {
          deliveredAt = new Date();
          break;
        }

        lastError = `HTTP ${response.status}: ${responseBody?.slice(0, 500)}`;
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
      }

      // Wait before retry (exponential backoff)
      if (attempt < webhook.retry_count) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    // Record delivery
    const delivery = await prisma.webhookDelivery.create({
      data: {
        webhook_id: webhookId,
        event_type: event,
        payload: payload as any,
        response_code: responseCode,
        response_body: responseBody?.slice(0, 10000),
        error_message: lastError,
        attempts: webhook.retry_count,
        delivered_at: deliveredAt,
      },
    });

    return this.toWebhookDelivery(delivery);
  }

  /**
   * Regenerate webhook secret
   */
  async regenerateSecret(id: string): Promise<string> {
    const secret = randomBytes(32).toString('hex');

    await prisma.webhook.update({
      where: { id },
      data: { secret },
    });

    return secret;
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expected = this.createSignature(payload, secret);
    return signature === expected;
  }

  /**
   * Create HMAC signature for payload
   */
  private createSignature(payload: string, secret: string): string {
    return `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;
  }

  /**
   * Convert database model to API type
   */
  private toWebhook(model: any): Webhook {
    return {
      id: model.id,
      organizationId: model.organization_id,
      projectId: model.project_id,
      name: model.name,
      url: model.url,
      secret: model.secret,
      events: model.events,
      isActive: model.is_active,
      retryCount: model.retry_count,
      timeoutSeconds: model.timeout_seconds,
      createdBy: model.created_by,
      createdAt: model.created_at,
      updatedAt: model.updated_at,
    };
  }

  private toWebhookDelivery(model: any): WebhookDelivery {
    return {
      id: model.id,
      webhookId: model.webhook_id,
      eventType: model.event_type,
      payload: model.payload,
      responseCode: model.response_code,
      responseBody: model.response_body,
      errorMessage: model.error_message,
      attempts: model.attempts,
      deliveredAt: model.delivered_at,
      createdAt: model.created_at,
    };
  }
}

export const webhookService = new WebhookService();
