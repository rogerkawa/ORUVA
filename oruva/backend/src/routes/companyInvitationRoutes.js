
import { Router } from 'express';

import companyInvitationController from '../controllers/companyInvitationController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();

// Consulta pública do convite
router.get('/:token', companyInvitationController.consultarConvite);

// Aceitação por um novo usuário
router.post('/accept', companyInvitationController.aceitarConvite);

// Aceitação por um usuário já autenticado
router.post(
    '/accept-existing',
    authMiddleware,
    companyInvitationController.aceitarConviteExistente
);

export default router;
