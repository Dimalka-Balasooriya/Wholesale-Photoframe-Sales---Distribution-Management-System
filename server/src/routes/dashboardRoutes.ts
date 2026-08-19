import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

export const dashboardRoutes = Router();

dashboardRoutes.get('/admin', authenticate, authorize('ADMIN'), (_req, res) => {
  res.json({ message: 'Admin dashboard access granted' });
});

dashboardRoutes.get('/sales', authenticate, authorize('SALES_REP'), (_req, res) => {
  res.json({ message: 'Sales representative dashboard access granted' });
});

dashboardRoutes.get('/driver', authenticate, authorize('DRIVER'), (_req, res) => {
  res.json({ message: 'Driver dashboard access granted' });
});

dashboardRoutes.get('/customer', authenticate, authorize('CUSTOMER'), (_req, res) => {
  res.json({ message: 'Customer dashboard access granted' });
});
