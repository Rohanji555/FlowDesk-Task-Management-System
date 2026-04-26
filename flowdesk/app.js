// Concepts: Express.js, Middleware stack, Static files, Template engine
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const flash = require('connect-flash');
const passport = require('./config/passport');
const path = require('path');
const fs = require('fs');
const fileHelper = require('./utils/fileHelper');
const { notFound, globalErrorHandler } = require('./middleware/errorMiddleware');

const app = express();

fileHelper.ensureLogDir();

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms ${req.ip}\n`;
    fs.appendFile(path.join(__dirname, 'logs', 'access.log'), logLine, (err) => {
      if (err) console.error('Failed to write access log', err);
    });
  });
  next();
});

// Middleware stack
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  name: 'flowdesk.sid',
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI
  }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

// res.locals middleware
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.currentPath = req.path;
  res.locals.appName = 'FlowDesk';
  res.locals.theme = req.cookies.theme || 'light';
  next();
});

// Set EJS as view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// GET /settings/theme route
app.get('/settings/theme', (req, res) => {
  const mode = req.query.mode;
  if (mode === 'dark' || mode === 'light') {
    res.cookie('theme', mode, { maxAge: 30 * 24 * 60 * 60 * 1000 }); // 30 days
  }
  res.redirect(req.get('Referrer') || '/');
});

const methodOverride = require('method-override');
app.use(methodOverride('_method'));

// Mount routes
app.use('/auth', require('./routes/authRoutes'));
app.use('/api/v1', require('./routes/apiRoutes'));
app.use('/dashboard', require('./routes/dashboardRoutes'));
app.use('/tasks', require('./routes/taskRoutes'));
app.use('/projects', require('./routes/projectRoutes'));
app.use('/team', require('./routes/teamRoutes'));
app.use('/', require('./routes/userRoutes'));

app.get('/', (req, res) => res.redirect('/dashboard'));

// Error handling
app.use(notFound);
app.use(globalErrorHandler);

module.exports = app;
