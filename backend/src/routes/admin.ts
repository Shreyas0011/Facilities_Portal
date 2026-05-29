import { Router } from 'express';
import {
  getAnalytics,
  getPendingApprovals,
  getUsers,
  updateUser,
  createMaintenanceBlock,
  getMaintenanceBlocks,
  deleteMaintenanceBlock,
} from '../controllers/adminController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate, authorize('ADMIN', 'SUPER_ADMIN'));

router.get('/analytics', getAnalytics);
router.get('/pending-approvals', getPendingApprovals);
router.get('/users', getUsers);
router.patch('/users/:id', updateUser);
router.post('/maintenance', createMaintenanceBlock);
router.get('/maintenance', getMaintenanceBlocks);
router.delete('/maintenance/:id', deleteMaintenanceBlock);

export default router;
