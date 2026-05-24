const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const { prisma, mapIdToUnderscoreId } = require('./prisma');
const bcrypt = require('bcryptjs');

passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  try {
    const rawUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    if (!rawUser) return done(null, false, { message: 'Incorrect email.' });
    
    const isMatch = await bcrypt.compare(password, rawUser.password);
    if (!isMatch) return done(null, false, { message: 'Incorrect password.' });
    
    const user = mapIdToUnderscoreId(rawUser);
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const rawUser = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });
    const user = mapIdToUnderscoreId(rawUser);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
