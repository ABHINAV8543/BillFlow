require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/User');
const { connectDB } = require('./db/connection');
const { requireAuth, requireAdmin } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session with MongoDB store
const sessionStore = process.env.MONGODB_URI 
    ? MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        collectionName: 'sessions'
    }) 
    : undefined;

if (sessionStore) {
    sessionStore.on('error', function(error) {
        console.error('MongoStore Session Error:', error);
    });
}

if (!process.env.MONGODB_URI) {
    console.error('CRITICAL: MONGODB_URI environment variable is not set. Falling back to MemoryStore.');
}

app.use(session({
    secret: process.env.SESSION_SECRET || 'billflow-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        sameSite: 'lax'
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Public routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
        return res.redirect('/dashboard');
    }
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.render('login', { title: 'Login', user: null, message: null });
});

// Auth routes (no auth required)
app.use('/auth', require('./routes/auth'));

// Protected page & API routes
app.use('/dashboard', requireAuth, require('./routes/dashboard'));
app.use('/bills', requireAuth, require('./routes/bills'));
app.use('/profile', requireAuth, require('./routes/profile'));
app.use('/users', requireAuth, requireAdmin, require('./routes/users'));

// API routes (JSON) — for AJAX calls from forms
app.use('/api/clients', requireAuth, require('./routes/clients'));
app.use('/api/bills', requireAuth, require('./routes/bills'));
app.use('/api/profile', requireAuth, require('./routes/profile'));
app.use('/api/users', requireAuth, requireAdmin, require('./routes/users'));

const AppError = require('./utils/AppError');
const globalErrorHandler = require('./middleware/errorHandler');

// 404 fallback
app.all('*', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handler
app.use(globalErrorHandler);

// Start server
if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    // Vercel serverless execution
    connectDB().catch(console.error);
} else {
    // Local development execution
    async function start() {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`E-Billing Dashboard server running at http://localhost:${PORT}`);
        });
    }

    start().catch(err => {
        console.error('Failed to start server:', err);
        process.exit(1);
    });
}

module.exports = app;
