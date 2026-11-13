
import { Router } from 'express';

import authRoutes from './authRoutes.js';
import companyRequestRoutes from './companyRequestRoutes.js';
import companyInvitationRoutes from './companyInvitationRoutes.js';
import departmentRoutes from './departmentRoutes.js';
import teamRoutes from './teamRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import slaPolicyRoutes from './slaPolicyRoutes.js';
import demandRoutes from './demandRoutes.js';
import approvalRoutes from './approvalRoutes.js';

const routes = Router();

// Autenticação
routes.use('/auth', authRoutes);
routes.use('/company-requests', companyRequestRoutes);
routes.use('/invitations', companyInvitationRoutes);
routes.use('/departments', departmentRoutes);
routes.use('/teams', teamRoutes);
routes.use('/categories', categoryRoutes);
routes.use('/sla-policies', slaPolicyRoutes);
routes.use('/demands', demandRoutes);
routes.use('/approvals', approvalRoutes);

export default routes;
