import { Router } from 'express';
import {
  getFacilities,
  getFacilityById,
  createFacility,
  updateFacility,
  deleteFacility,
  getFacilityAvailability,
} from '../controllers/facilityController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', getFacilities);
router.get('/:id', getFacilityById);
router.get('/:id/availability', getFacilityAvailability);
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), createFacility);
router.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), updateFacility);
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), deleteFacility);

export default router;
