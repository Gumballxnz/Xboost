
const express = require('express');
const router = express.Router();
const passport = require('passport');
const authController = require('../controllers/authController');

// GitHub
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

router.get('/github/callback',
    passport.authenticate('github', { failureRedirect: '/api/auth/failure' }),
    authController.loginSuccess
);

// Google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/api/auth/failure' }),
    authController.loginSuccess
);

router.get('/failure', authController.loginFailure);
router.get('/logout', authController.logout);

module.exports = router;
