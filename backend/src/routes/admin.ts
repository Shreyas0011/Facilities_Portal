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

router.use(authenticate, authorize('admin', 'superadmin'));

router.get('/analytics', getAnalytics);
router.get('/pending-approvals', getPendingApprovals);
router.get('/users', authorize('superadmin'), getUsers);
router.patch('/users/:id', authorize('superadmin'), updateUser);
router.post('/maintenance', createMaintenanceBlock);
router.get('/maintenance', getMaintenanceBlocks);
router.delete('/maintenance/:id', deleteMaintenanceBlock);

export default router;
