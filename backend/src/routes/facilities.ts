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
router.post('/', authenticate, authorize('superadmin'), createFacility);
router.put('/:id', authenticate, authorize('superadmin'), updateFacility);
router.delete('/:id', authenticate, authorize('superadmin'), deleteFacility);

export default router;
