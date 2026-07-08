const session = require('express-session');
const MongoStore = require('connect-mongo').default || require('connect-mongo');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('../models/User');

module.exports = function configureSession(app) {
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
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: sessionStore,
        cookie: {
            maxAge: 24 * 60 * 60 * 1000,
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
};
