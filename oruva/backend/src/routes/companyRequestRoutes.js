
import { Router } from 'express';

import companyRequestController from '../controllers/companyRequestController.js';

import authMiddleware from '../middlewares/authMiddleware.js';
import superAdminMiddleware from '../middlewares/superAdminMiddleware.js';
import companyInvitationController from '../controllers/companyInvitationController.js';

const router = Router();

// Solicitação pública de acesso
router.post('/', companyRequestController.criar);

// A partir daqui, exige autenticação
router.use(authMiddleware);

// A partir daqui, exige SuperAdmin
router.use(superAdminMiddleware);

// Listagem
router.get('/', companyRequestController.listar);


// Aprovação
router.patch('/:id/approve', companyRequestController.aprovar);

// Recusa
router.patch('/:id/reject', companyRequestController.recusar);

// Envio de convite ao primeiro administrador
router.post('/:id/invite', companyInvitationController.enviarConvite);

export default router;
