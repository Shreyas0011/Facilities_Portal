import { Router } from 'express';
import {
  createBooking,
  getMyBookings,
  getAllBookings,
  updateBookingStatus,
  deleteBooking,
} from '../controllers/bookingController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', createBooking);
router.get('/my-bookings', getMyBookings);
router.get('/', authorize('admin', 'superadmin'), getAllBookings);
router.patch('/:id/status', updateBookingStatus);
router.delete('/:id', deleteBooking);

export default router;
