"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const db_1 = require("./lib/db");
const auth_1 = __importDefault(require("./routes/auth"));
const facilities_1 = __importDefault(require("./routes/facilities"));
const bookings_1 = __importDefault(require("./routes/bookings"));
const admin_1 = __importDefault(require("./routes/admin"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const errorHandler_1 = require("./middleware/errorHandler");
const app = (0, express_1.default)();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;
// ─── Security middleware ───────────────────────────────────────────────────────
// Allowed origins: localhost dev + Vercel production + any env-configured domain
const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://facilities-portal-mu.vercel.app',
    // Pull any extra origin set in Render environment variables
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL.trim()] : []),
];
const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (curl, Postman, server-to-server)
        if (!origin)
            return callback(null, true);
        if (ALLOWED_ORIGINS.includes(origin)) {
            return callback(null, true);
        }
        console.warn(`[CORS] Blocked request from origin: ${origin}`);
        return callback(new Error(`CORS policy: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200, // Some browsers (IE11) choke on 204
};
app.use((0, cors_1.default)(corsOptions));
// Helmet after CORS so it doesn't strip Access-Control-* headers
app.use((0, helmet_1.default)({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
// ─── Rate limiting ─────────────────────────────────────────────────────────────
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);
// ─── Body parsing ──────────────────────────────────────────────────────────────
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// ─── Logging ──────────────────────────────────────────────────────────────────
// Use 'combined' (Apache format) in production for Render log visibility
app.use((0, morgan_1.default)(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', auth_1.default);
app.use('/api/facilities', facilities_1.default);
app.use('/api/bookings', bookings_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/notifications', notifications_1.default);
// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
// ─── Global error handler ─────────────────────────────────────────────────────
app.use(errorHandler_1.errorHandler);
// ─── Start server after DB connects ───────────────────────────────────────────
const start = async () => {
    await (0, db_1.connectDB)();
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    });
};
start();
exports.default = app;
