import { Router } from 'express';
import { authRoutes } from './authRoutes.js';
import { customerRoutes } from './customerRoutes.js';
import { dashboardRoutes } from './dashboardRoutes.js';
import { deliveryRoutes } from './deliveryRoutes.js';
import { financeRoutes } from './financeRoutes.js';
import { orderRoutes } from './orderRoutes.js';
import { phase6Routes } from './phase6Routes.js';
import { phase7Routes } from './phase7Routes.js';
import { productRoutes } from './productRoutes.js';

export const apiRoutes = Router();

apiRoutes.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/dashboards', dashboardRoutes);
apiRoutes.use('/products', productRoutes);
apiRoutes.use('/customers', customerRoutes);
apiRoutes.use('/orders', orderRoutes);
apiRoutes.use('/finance', financeRoutes);
apiRoutes.use('/deliveries', deliveryRoutes);
apiRoutes.use('/performance', phase6Routes);
apiRoutes.use('/insights', phase7Routes);
