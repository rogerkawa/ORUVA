
import { Router } from 'express';

import authRoutes from './authRoutes.js';
import companyRequestRoutes from './companyRequestRoutes.js';
import companyInvitationRoutes from './companyInvitationRoutes.js';

const routes = Router();

// Autenticação
routes.use('/auth', authRoutes);
routes.use('/company-requests', companyRequestRoutes);
routes.use('/invitations', companyInvitationRoutes);

export default routes;
