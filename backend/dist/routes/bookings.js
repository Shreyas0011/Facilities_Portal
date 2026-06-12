"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bookingController_1 = require("../controllers/bookingController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// ── Public route (no auth required) ─────────────────────────────────────────
router.get('/public', bookingController_1.getPublicBookings);
// ── All routes below require authentication ──────────────────────────────────
router.use(auth_1.authenticate);
router.post('/', bookingController_1.createBooking);
router.get('/my-bookings', bookingController_1.getMyBookings);
router.get('/', (0, auth_1.authorize)('admin', 'superadmin'), bookingController_1.getAllBookings);
router.patch('/:id/status', bookingController_1.updateBookingStatus);
router.delete('/:id', bookingController_1.deleteBooking);
exports.default = router;
