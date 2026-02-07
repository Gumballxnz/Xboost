
const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const supabase = require('../../config/supabase');

const opts = {};
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = process.env.JWT_SECRET || 'dev_secret_key_change_in_prod';

passport.use(new JwtStrategy(opts, async function (jwt_payload, done) {
    try {
        // Buscar usuário real no Supabase para garantir que existe e pegar status atual
        // Otimização: Poderíamos confiar no JWT, mas buscar no DB é mais seguro (revogação, bans)
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', jwt_payload.sub)
            .single();

        if (error || !user) {
            return done(null, false);
        }

        return done(null, user);
    } catch (err) {
        return done(err, false);
    }
}));

module.exports = passport;
