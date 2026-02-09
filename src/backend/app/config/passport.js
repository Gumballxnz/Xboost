import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { createClient } from '@supabase/supabase-js';
import config from './index.js';

const supabase = createClient(config.supabase.url, config.supabase.key);

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

// GitHub Strategy
if (config.oauth.github.clientId && config.oauth.github.clientSecret) {
    passport.use(new GitHubStrategy({
        clientID: config.oauth.github.clientId,
        clientSecret: config.oauth.github.clientSecret,
        callbackURL: `${config.env === 'production' ? 'https://xboost-zeta.vercel.app' : 'http://localhost:3000'}/api/auth/github/callback`
    },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails?.[0]?.value;
                if (!email) return done(new Error('No email from GitHub'));

                let { data: user, error } = await supabase.from('users').select('*').eq('email', email).single();

                if (!user) {
                    // Create user
                    const { data: newUser, error: createError } = await supabase.from('users').insert({
                        email,
                        name: profile.displayName || profile.username,
                        provider: 'github',
                        provider_id: profile.id,
                        avatar_url: profile.photos?.[0]?.value,
                        credits: 5,
                        plan: 'free',
                        created_at: new Date().toISOString()
                    }).select().single();

                    if (createError) return done(createError);
                    user = newUser;
                }

                return done(null, user);
            } catch (err) {
                return done(err);
            }
        }));
}

// Google Strategy - Similar pattern
if (config.oauth.google.clientId) {
    // ... Implement Google 
}

export default passport;
