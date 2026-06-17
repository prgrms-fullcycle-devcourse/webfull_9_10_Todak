import { Router } from 'express';

import { requireAuth } from '../../../middleware/auth.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';

import {
  addCollaboratorHandler,
  listCollaboratorsHandler,
  removeCollaboratorHandler,
  listInvitationsHandler,
  deleteInvitationHandler,
} from './collaborators.controller.js';
import {
  AddCollaboratorSchema,
  CollaboratorUsernameParamsSchema,
  InvitationIdParamsSchema,
} from './collaborators.schema.js';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.post('/', validate(AddCollaboratorSchema), addCollaboratorHandler);
router.get('/', listCollaboratorsHandler);

// /invitations 라우트를 /:username 보다 먼저 등록해야 DELETE /invitations/:id 가 /:username 에 가려지지 않는다
router.get('/invitations', listInvitationsHandler);
router.delete(
  '/invitations/:invitationId',
  validate(InvitationIdParamsSchema, 'params'),
  deleteInvitationHandler,
);

router.delete(
  '/:username',
  validate(CollaboratorUsernameParamsSchema, 'params'),
  removeCollaboratorHandler,
);

export default router;
