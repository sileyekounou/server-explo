// import 'module-alias/register';
import express from 'express';
import cors from 'cors'
import errorHandler from '#middlewares/errorHandler';
import morgan from 'morgan';
import dotenv from 'dotenv';
import helmet from 'helmet'
import cookieParser from 'cookie-parser';
import cron from "node-cron";
import { cleanupExpiredSessions } from "#jobs/cleanup-sessions";


// Import des routes principales

import { authRoutes, userRoutes } from '#routes';

dotenv.config();

const app = express();

// ================================
// MIDDLEWARES GLOBAUX
// ================================

// CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(cookieParser())

// Parsing du body
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middlewares
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Headers de sécurité
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

cron.schedule("0 * * * *", async () => {
  console.log("🕐 Lancement du nettoyage des sessions...");
  await cleanupExpiredSessions();
});

// ================================
// ROUTES PRINCIPALES
// ================================

// Route de base
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Server Explorer API',
    version: process.env.npm_package_version || '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      api: '/api',
      health: '/api/health',
      info: '/api/info'
    }
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

if (process.env.NODE_ENV === "development") {
  app.post("/api/admin/cleanup-sessions", async (req, res) => {
    const count = await cleanupExpiredSessions();
    res.json({
      success: true,
      message: `${count} session(s) supprimée(s)`,
    });
  });
}

// Routes API
// app.use('/api/auth', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);

// ================================
// GESTION ERREURS
// ================================

// Middleware de gestion d'erreurs (doit être en dernier)
app.use(errorHandler);

// Gestion des routes non trouvées
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} non trouvée`,
    suggestion: 'Vérifiez la documentation à /api/info'
  });
});

// ================================
// DÉMARRAGE DU SERVEUR
// ================================

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`
🚀 Serveur démarré avec succès !
📍 Port: ${PORT}
🌍 Environnement: ${process.env.NODE_ENV || 'development'}
📖 API Info: http://localhost:${PORT}/api/info
🏥 Health Check: http://localhost:${PORT}/api/health
  `);
});

// Gestion gracieuse de l'arrêt
process.on('SIGTERM', () => {
  console.log('SIGTERM reçu, arrêt gracieux du serveur...');
  server.close(() => {
    console.log('Serveur fermé');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT reçu, arrêt gracieux du serveur...');
  server.close(() => {
    console.log('Serveur fermé');
    process.exit(0);
  });
});

export default app;