
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const authController = require('../controllers/authController'); // Importar a lógica real

// Serialização
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// OAuth Configs
const authConfig = require('../auth_config');

// GitHub Strategy
passport.use(new GitHubStrategy({
    clientID: authConfig.github.clientID,
    clientSecret: authConfig.github.clientSecret,
    callbackURL: `${process.env.API_URL}/api/auth/github/callback`
},
    async function (accessToken, refreshToken, profile, done) {
        try {
            const user = await authController.findOrCreateUser({ ...profile, provider: 'github' });
            return done(null, user);
        } catch (err) {
            return done(err, null);
        }
    }
));

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: authConfig.google.clientID,
    clientSecret: authConfig.google.clientSecret,
    callbackURL: `${process.env.API_URL}/api/auth/google/callback`
},
    async function (accessToken, refreshToken, profile, done) {
        try {
            const user = await authController.findOrCreateUser({ ...profile, provider: 'google' });
            return done(null, user);
        } catch (err) {
            return done(err, null);
        }
    }
));

module.exports = passport;
