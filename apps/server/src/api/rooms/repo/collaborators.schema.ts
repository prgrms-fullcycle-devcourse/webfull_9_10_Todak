import { z } from 'zod';

export const AddCollaboratorSchema = z.object({
  username: z.string().min(1),
  permission: z
    .enum(['pull', 'triage', 'push', 'maintain', 'admin'])
    .default('push'),
});

export const CollaboratorUsernameParamsSchema = z.object({
  roomId: z.string().uuid(),
  username: z.string().min(1),
});

export const InvitationIdParamsSchema = z.object({
  roomId: z.string().uuid(),
  invitationId: z.coerce.number().int().positive(),
});

export type AddCollaboratorInput = z.infer<typeof AddCollaboratorSchema>;
