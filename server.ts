import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import sharp from 'sharp';
import { Pool, Client } from 'pg';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createOfflineAuthStore } from './lib/offline-auth';

dotenv.config();

const app = express();
const PORT = 3000;

// Ensure local uploads/media directory exists
const mediaDir = path.join(process.cwd(), 'uploads', 'media');
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}

// Serve media files statically
app.use('/media', express.static(mediaDir));

app.get('/api/image-proxy', async (req, res) => {
  const targetUrl = req.query.url;

  if (typeof targetUrl !== 'string' || !targetUrl) {
    return res.status(400).send('Missing image URL');
  }

  try {
    const response = await fetch(targetUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    if (!response.ok) {
      return res.status(response.status).send('Unable to load image');
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=3600');
    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(502).send('Unable to proxy image');
  }
});

// Setup JSON body parser with a generous limit for base64 media uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Setup PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Neon PostgreSQL requires SSL
});

// Server-Sent Events client registry (campaignId -> Express Response objects)
const sseClients = new Map<string, any[]>();

const JWT_SECRET = process.env.JWT_SECRET || 'festiv_secret_key_123_456';
let databaseReady = false;
const offlineAuth = createOfflineAuthStore();
const offlineCampaigns = new Map<string, any>();
const offlineWorkspaceTokens = new Map<string, string>();
const offlineMedia = new Map<string, any[]>();
let offlineMediaAutoId = 1;

// Helper to extract a cookie value from headers
const getCookie = (req: any, name: string) => {
  const cookies = req.headers.cookie;
  if (!cookies) return null;
  const match = cookies.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
};

// Middleware for token authentication
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    token = getCookie(req, 'festiv_token');
  }

  if (!token) {
    return res.status(401).json({ error: 'Token de session manquant ou invalide. Veuillez vous connecter.' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: 'Votre session a expiré ou est invalide. Veuillez vous reconnecter.' });
    }
    req.user = decoded;
    next();
  });
};

// Middleware to verify campaign ownership
const checkCampaignOwnership = async (req: any, res: any, next: any) => {
  if (!databaseReady) {
    return next();
  }

  const campaignId = req.params.id || req.body.id;
  const user = req.user;

  if (!user) {
    return res.status(401).json({ error: 'Non authentifié.' });
  }

  // Admin role overrides ownership verification
  if (user.role === 'admin') {
    return next();
  }

  if (!campaignId) {
    return next(); // Let POST validator handle campaign creations
  }

  try {
    const { rows } = await pool.query('SELECT owner_uid FROM campaigns WHERE id = $1', [campaignId]);
    if (rows.length === 0) {
      // If campaign does not exist yet (creation via PUT/POST), let it pass
      return next();
    }

    if (rows[0].owner_uid !== user.uid) {
      return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à modifier cette exposition.' });
    }

    next();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Start listening for Postgres NOTIFY events
async function startPgListener() {
  if (!databaseReady || !process.env.DATABASE_URL) {
    console.warn('Database unavailable; skipping PostgreSQL LISTEN listener and running in offline mode.');
    return;
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    keepAlive: true
  });

  let heartbeatInterval: NodeJS.Timeout | null = null;
  let isCleanedUp = false;

  const cleanup = () => {
    if (isCleanedUp) return;
    isCleanedUp = true;
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    client.end().catch(() => {});
  };

  try {
    await client.connect();
    await client.query('LISTEN campaign_updates');
    
    client.on('notification', async (msg) => {
      if (msg.payload) {
        const campaignId = msg.payload;
        const clients = sseClients.get(campaignId) || [];
        if (clients.length > 0) {
          try {
            const { rows } = await pool.query('SELECT * FROM campaigns WHERE id = $1', [campaignId]);
            if (rows.length > 0) {
              const row = rows[0];
              const campaignData = {
                id: row.id,
                name: row.name,
                brandName: row.brand_name,
                whatsapp: row.whatsapp,
                themeColor: row.theme_color,
                ownerUid: row.owner_uid,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                ...row.config
              };
              const payload = JSON.stringify(campaignData);
              clients.forEach(res => {
                res.write(`data: ${payload}\n\n`);
              });
            }
          } catch (err) {
            console.error('Error broadcasting campaign update:', err);
          }
        }
      }
    });

    // Run active application-level heartbeats every 25 seconds to keep the listener connection alive.
    // This bypasses serverless / proxy database routers (like Neon) idle connection termination.
    heartbeatInterval = setInterval(async () => {
      try {
        await client.query('SELECT 1');
      } catch (err) {
        console.error('PG Listener Heartbeat error, closing connection:', err);
        const wasAlreadyCleaned = isCleanedUp;
        cleanup();
        if (!wasAlreadyCleaned) {
          setTimeout(startPgListener, 5000);
        }
      }
    }, 25000);

    client.on('end', () => {
      console.log('PG Listener Client connection ended.');
      cleanup();
    });

    client.on('error', (err) => {
      console.error('PG Listener Client Error, reconnecting...', err);
      const wasAlreadyCleaned = isCleanedUp;
      cleanup();
      if (!wasAlreadyCleaned) {
        setTimeout(startPgListener, 5000);
      }
    });

    console.log('PostgreSQL LISTEN initialized successfully with application-level heartbeat keep-alive.');
  } catch (err) {
    console.error('Failed to initialize PG LISTEN, retrying...', err);
    const wasAlreadyCleaned = isCleanedUp;
    cleanup();
    if (!wasAlreadyCleaned) {
      setTimeout(startPgListener, 5000);
    }
  }
}

// Database schema initialization
async function initDb() {
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL is not configured; skipping database initialization and running in offline mode.');
    return;
  }

  let client;
  try {
    client = await pool.connect();
    databaseReady = true;
  } catch (err) {
    databaseReady = false;
    console.warn('Database connection unavailable; continuing in offline mode.', err);
    return;
  }

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id VARCHAR(255) PRIMARY KEY,
        name TEXT NOT NULL,
        brand_name TEXT NOT NULL,
        whatsapp TEXT,
        theme_color TEXT,
        owner_uid TEXT,
        config JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS workspace_token TEXT;
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        campaign_id VARCHAR(255) NOT NULL,
        campaign_name TEXT NOT NULL,
        provider VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        uid VARCHAR(255) PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        display_name TEXT,
        photo_url TEXT,
        password_hash TEXT,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_campaign_id ON leads(campaign_id);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS graffiti (
        id SERIAL PRIMARY KEY,
        campaign_id VARCHAR(255) NOT NULL,
        wall_id VARCHAR(255) NOT NULL,
        image_data TEXT NOT NULL,
        approved BOOLEAN DEFAULT FALSE,
        author TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      ALTER TABLE graffiti ADD COLUMN IF NOT EXISTS author TEXT;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_graffiti_campaign_id ON graffiti(campaign_id);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS media (
        id SERIAL PRIMARY KEY,
        campaign_id VARCHAR(255) NOT NULL,
        hash TEXT NOT NULL,
        original_name TEXT,
        mime_type TEXT,
        size_bytes BIGINT,
        url TEXT NOT NULL,
        thumbnail_url TEXT,
        drive_file_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_media_campaign_id ON media(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_media_hash ON media(hash);
    `);

    await client.query(`
      CREATE OR REPLACE FUNCTION notify_campaign_update()
      RETURNS trigger AS $$
      BEGIN
        PERFORM pg_notify('campaign_updates', NEW.id);
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS trigger_campaign_update ON campaigns;
      CREATE TRIGGER trigger_campaign_update
      AFTER INSERT OR UPDATE
      ON campaigns
      FOR EACH ROW
      EXECUTE FUNCTION notify_campaign_update();
    `);

    console.log('PostgreSQL database tables and notification triggers verified/initialized successfully.');
  } catch (err) {
    console.error('Error verifying/initializing PostgreSQL tables:', err);
  } finally {
    client.release();
  }
}

// ============================================================================
// API ENDPOINTS (PostgreSQL integration)
// ============================================================================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'connected' });
});

// ============================================================================
// AUTHENTICATION ENDPOINTS
// ============================================================================

// POST /api/auth/check-email - Verifies if an email exists
app.post('/api/auth/check-email', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email requis' });
  }

  if (!databaseReady) {
    res.json({ exists: offlineAuth.hasEmail(email) });
    return;
  }

  try {
    const { rows } = await pool.query('SELECT 1 FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    res.json({ exists: rows.length > 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/register - Register a new user with password
app.post('/api/auth/register', async (req, res) => {
  const { email, password, displayName, photoURL } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caractères' });
  }

  if (!databaseReady) {
    const user = offlineAuth.register(email, password, displayName, photoURL, email === 'crealab.imed@gmail.com' ? 'admin' : 'user');
    if (!user) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    const token = jwt.sign({ uid: user.uid, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      role: user.role,
      token
    });
  }

  try {
    const emailNormalized = email.toLowerCase().trim();
    const { rows: existing } = await pool.query('SELECT * FROM users WHERE email = $1', [emailNormalized]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    const uid = 'u_' + Math.random().toString(36).substring(2, 15);
    const passwordHash = bcrypt.hashSync(password, 10);
    
    // Automatically assign admin if it's the requested email or the first user
    let role = 'user';
    if (emailNormalized === 'crealab.imed@gmail.com') {
      role = 'admin';
    } else {
      const countRes = await pool.query('SELECT COUNT(*) FROM users');
      if (parseInt(countRes.rows[0].count, 10) === 0) {
        role = 'admin';
      }
    }

    const name = displayName || emailNormalized.split('@')[0];
    const photo = photoURL || '';

    const { rows } = await pool.query(
      `INSERT INTO users (uid, email, display_name, photo_url, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [uid, emailNormalized, name, photo, passwordHash, role]
    );

    const user = rows[0];
    const token = jwt.sign({ uid: user.uid, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      uid: user.uid,
      email: user.email,
      displayName: user.display_name,
      photoURL: user.photo_url,
      role: user.role,
      token
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login - Secure email/password login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  if (!databaseReady) {
    const user = offlineAuth.authenticate(email, password);
    if (!user) {
      return res.status(401).json({ error: 'Identifiants de connexion incorrects.' });
    }

    const token = jwt.sign({ uid: user.uid, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      role: user.role,
      token
    });
  }

  try {
    const emailNormalized = email.toLowerCase().trim();
    let { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [emailNormalized]);
    
    if (rows.length === 0) {
      // Auto-register if this is the first user or the crealab admin!
      const countRes = await pool.query('SELECT COUNT(*) FROM users');
      const isFirst = parseInt(countRes.rows[0].count, 10) === 0;
      const isAdmin = emailNormalized === 'crealab.imed@gmail.com';
      
      if (isFirst || isAdmin) {
        console.log(`Auto-registering admin/first user ${emailNormalized}`);
        const uid = 'u_' + Math.random().toString(36).substring(2, 15);
        const passwordHash = bcrypt.hashSync(password, 10);
        const name = emailNormalized.split('@')[0];
        const role = 'admin';
        
        const insertRes = await pool.query(
          `INSERT INTO users (uid, email, display_name, photo_url, password_hash, role)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [uid, emailNormalized, name, '', passwordHash, role]
        );
        rows = insertRes.rows;
      } else {
        return res.status(401).json({ error: 'Identifiants de connexion incorrects.' });
      }
    }

    const user = rows[0];

    // Handle legacy users migrating to password database or first logins
    if (!user.password_hash) {
      console.log(`Migrating legacy user ${emailNormalized} - setting password_hash`);
      const passwordHash = bcrypt.hashSync(password, 10);
      await pool.query('UPDATE users SET password_hash = $1 WHERE uid = $2', [passwordHash, user.uid]);
      user.password_hash = passwordHash;
    } else {
      const match = bcrypt.compareSync(password, user.password_hash);
      if (!match) {
        return res.status(401).json({ error: 'Identifiants de connexion incorrects.' });
      }
    }

    const token = jwt.sign({ uid: user.uid, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      uid: user.uid,
      email: user.email,
      displayName: user.display_name,
      photoURL: user.photo_url,
      role: user.role,
      token
    });
  } catch (err: any) {
    console.error('Auth login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/user/:uid - Retrieve user role/info
app.get('/api/auth/user/:uid', async (req, res) => {
  const { uid } = req.params;
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE uid = $1', [uid]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = rows[0];
    res.json({
      uid: user.uid,
      email: user.email,
      displayName: user.display_name,
      photoURL: user.photo_url,
      role: user.role
    });
  } catch (err: any) {
    console.error('Fetch user error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/campaigns - List campaigns (restricted to owner unless admin)
app.get('/api/campaigns', authenticateToken, async (req: any, res: any) => {
  const user = req.user;
  const fallbackCampaigns = [
    {
      id: 'demo-campaign',
      name: 'Exposition Démo',
      brandName: 'Créalab',
      whatsapp: '+33100000000',
      themeColor: '#4f46e5',
      ownerUid: user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sections: [],
      walls: [],
      stats: {},
    }
  ];

  if (!databaseReady || !process.env.DATABASE_URL) {
    return res.json(fallbackCampaigns);
  }

  try {
    let queryStr = 'SELECT * FROM campaigns ORDER BY created_at DESC';
    let params: any[] = [];
    
    // Non-admins can only list their own campaigns
    if (user.role !== 'admin') {
      queryStr = 'SELECT * FROM campaigns WHERE owner_uid = $1 ORDER BY created_at DESC';
      params = [user.uid];
    } else {
      const ownerUid = req.query.ownerUid as string | undefined;
      if (ownerUid) {
        queryStr = 'SELECT * FROM campaigns WHERE owner_uid = $1 ORDER BY created_at DESC';
        params = [ownerUid];
      }
    }
    const { rows } = await pool.query(queryStr, params);
    
    // Map database fields to the CamelCase CampaignConfig structure expected by front-end
    const campaigns = rows.map(row => ({
      id: row.id,
      name: row.name,
      brandName: row.brand_name,
      whatsapp: row.whatsapp,
      themeColor: row.theme_color,
      ownerUid: row.owner_uid,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      ...row.config
    }));
    
    res.json(campaigns);
  } catch (err: any) {
    const message = err?.message || String(err);
    if (message.includes('ECONNREFUSED') || message.includes('connect')) {
      console.warn('Database unavailable while fetching campaigns; serving offline fallback.');
      return res.json(fallbackCampaigns);
    }
    console.error('Error fetching campaigns:', err);
    res.status(500).json({ error: message });
  }
});

// GET /api/campaigns/:id - Retrieve a single campaign (Visitor-facing, public)
app.get('/api/campaigns/:id', async (req, res) => {
  const { id } = req.params;

  if (!databaseReady) {
    const offlineCampaign = offlineCampaigns.get(id);
    if (offlineCampaign) {
      return res.json(offlineCampaign);
    }

    if (id === 'demo-campaign') {
      return res.json({
        id,
        name: 'Exposition Démo',
        brandName: 'Créalab',
        whatsapp: '+33100000000',
        themeColor: '#4f46e5',
        ownerUid: 'demo-admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sections: [],
        walls: [],
        stats: {},
      });
    }

    return res.status(404).json({ error: 'Campaign not found' });
  }

  try {
    const { rows } = await pool.query('SELECT * FROM campaigns WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    const row = rows[0];
    res.json({
      id: row.id,
      name: row.name,
      brandName: row.brand_name,
      whatsapp: row.whatsapp,
      themeColor: row.theme_color,
      ownerUid: row.owner_uid,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      ...row.config
    });
  } catch (err: any) {
    console.error('Error fetching campaign:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/campaigns/:id/events - Server-Sent Events stream for real-time campaign updates (Visitor-facing, public)
app.get('/api/campaigns/:id/events', (req, res) => {
  const { id } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  if (!sseClients.has(id)) {
    sseClients.set(id, []);
  }
  sseClients.get(id)!.push(res);

  // Keep connection alive with simple pings
  res.write(': ping\n\n');

  req.on('close', () => {
    const clients = sseClients.get(id) || [];
    const idx = clients.indexOf(res);
    if (idx !== -1) {
      clients.splice(idx, 1);
    }
    if (clients.length === 0) {
      sseClients.delete(id);
    }
  });
});

// POST /api/campaigns - Create or Upsert a campaign
app.post('/api/campaigns', authenticateToken, async (req: any, res: any) => {
  const { id, name, brandName, whatsapp, themeColor, ownerUid, workspaceToken, ...config } = req.body;
  const campaignId = id || Math.random().toString(36).substring(2, 15);
  
  // Non-admins can only save under their own uid
  const finalOwnerUid = req.user.role === 'admin' ? (ownerUid || req.user.uid) : req.user.uid;

  if (!databaseReady) {
    const savedCampaign = {
      id: campaignId,
      name,
      brandName,
      whatsapp,
      themeColor,
      ownerUid: finalOwnerUid,
      createdAt: offlineCampaigns.get(campaignId)?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...config
    };

    offlineCampaigns.set(campaignId, savedCampaign);
    if (workspaceToken) {
      offlineWorkspaceTokens.set(campaignId, workspaceToken);
    }

    return res.json(savedCampaign);
  }

  try {
    // If updating, check ownership
    const checkRes = await pool.query('SELECT owner_uid FROM campaigns WHERE id = $1', [campaignId]);
    if (checkRes.rows.length > 0 && req.user.role !== 'admin' && checkRes.rows[0].owner_uid !== req.user.uid) {
      return res.status(403).json({ error: 'Vous n\'êtes pas le propriétaire de cette exposition.' });
    }

    await pool.query(
      `INSERT INTO campaigns (id, name, brand_name, whatsapp, theme_color, owner_uid, config, workspace_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         brand_name = EXCLUDED.brand_name,
         whatsapp = EXCLUDED.whatsapp,
         theme_color = EXCLUDED.theme_color,
         owner_uid = EXCLUDED.owner_uid,
         config = (EXCLUDED.config - 'stats') || jsonb_build_object('stats', COALESCE(campaigns.config->'stats', EXCLUDED.config->'stats', '{}'::jsonb)),
         workspace_token = COALESCE(EXCLUDED.workspace_token, campaigns.workspace_token),
         updated_at = CURRENT_TIMESTAMP`,
      [campaignId, name, brandName, whatsapp, themeColor, finalOwnerUid, config, workspaceToken || null]
    );
    res.json({ id: campaignId, name, brandName, whatsapp, themeColor, ownerUid: finalOwnerUid, ...config });
  } catch (err: any) {
    console.error('Error saving campaign:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/campaigns/:id - Update an existing campaign
app.put('/api/campaigns/:id', authenticateToken, checkCampaignOwnership, async (req: any, res: any) => {
  const { id } = req.params;
  const { name, brandName, whatsapp, themeColor, ownerUid, workspaceToken, ...config } = req.body;
  
  const finalOwnerUid = req.user.role === 'admin' ? (ownerUid || req.user.uid) : req.user.uid;

  if (!databaseReady) {
    const existing = offlineCampaigns.get(id) || { id, createdAt: new Date().toISOString() };
    const updatedCampaign = {
      ...existing,
      id,
      name,
      brandName,
      whatsapp,
      themeColor,
      ownerUid: finalOwnerUid,
      updatedAt: new Date().toISOString(),
      ...config
    };

    offlineCampaigns.set(id, updatedCampaign);
    if (workspaceToken) {
      offlineWorkspaceTokens.set(id, workspaceToken);
    }

    return res.json(updatedCampaign);
  }

  try {
    const { rowCount } = await pool.query(
      `UPDATE campaigns SET
         name = $1,
         brand_name = $2,
         whatsapp = $3,
         theme_color = $4,
         owner_uid = $5,
         config = ($6::jsonb - 'stats') || jsonb_build_object('stats', COALESCE(campaigns.config->'stats', $6::jsonb->'stats', '{}'::jsonb)),
         workspace_token = COALESCE($7, workspace_token),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $8`,
      [name, brandName, whatsapp, themeColor, finalOwnerUid, config, workspaceToken || null, id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    res.json({ id, name, brandName, whatsapp, themeColor, ownerUid: finalOwnerUid, ...config });
  } catch (err: any) {
    console.error('Error updating campaign:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/campaigns/:id - Delete a campaign
app.delete('/api/campaigns/:id', authenticateToken, checkCampaignOwnership, async (req: any, res: any) => {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query('DELETE FROM campaigns WHERE id = $1', [id]);
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting campaign:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// GRAFFITI ENDPOINTS
// ============================================================================

// GET /api/campaigns/:id/graffiti - Get graffiti for a campaign (Public or moderated)
app.get('/api/campaigns/:id/graffiti', async (req: any, res: any) => {
  const { id } = req.params;
  const { status, wallId } = req.query;

  if (status === 'pending') {
    return authenticateToken(req, res, () => {
      return checkCampaignOwnership(req, res, async () => {
        try {
          let queryStr = 'SELECT * FROM graffiti WHERE campaign_id = $1 AND approved = FALSE';
          let params: any[] = [id];
          if (wallId) {
            queryStr += ' AND wall_id = $2';
            params.push(wallId);
          }
          queryStr += ' ORDER BY created_at DESC';
          const { rows } = await pool.query(queryStr, params);
          return res.json(rows);
        } catch (err: any) {
          console.error('Error fetching pending graffiti:', err);
          return res.status(500).json({ error: err.message });
        }
      });
    });
  }

  // Public fetch for approved graffiti
  try {
    let queryStr = 'SELECT * FROM graffiti WHERE campaign_id = $1 AND approved = TRUE';
    let params: any[] = [id];
    if (wallId) {
      queryStr += ' AND wall_id = $2';
      params.push(wallId);
    }
    queryStr += ' ORDER BY created_at DESC';
    const { rows } = await pool.query(queryStr, params);
    return res.json(rows);
  } catch (err: any) {
    console.error('Error fetching approved graffiti:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/campaigns/:id/graffiti - Submit a graffiti (Public)
app.post('/api/campaigns/:id/graffiti', async (req: any, res: any) => {
  const { id } = req.params;
  const { wallId, imageData, author } = req.body;

  if (!wallId || !imageData) {
    return res.status(400).json({ error: 'wallId and imageData are required' });
  }

  try {
    const { rows: campRows } = await pool.query('SELECT config FROM campaigns WHERE id = $1', [id]);
    if (campRows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    // Server alone decides approved state based on campaign config
    const config = campRows[0].config || {};
    const autoApprove = !!(config.graffitiAutoApprove || (config.graffiti && config.graffiti.autoApprove));

    const { rows } = await pool.query(
      `INSERT INTO graffiti (campaign_id, wall_id, image_data, approved, author)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, wallId, imageData, autoApprove, author || null]
    );
    return res.json(rows[0]);
  } catch (err: any) {
    console.error('Error submitting graffiti:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/campaigns/:id/graffiti/:graffitiId/approve - Approve a graffiti (Moderator)
app.post('/api/campaigns/:id/graffiti/:graffitiId/approve', authenticateToken, checkCampaignOwnership, async (req: any, res: any) => {
  const { id, graffitiId } = req.params;
  try {
    const { rowCount } = await pool.query(
      'UPDATE graffiti SET approved = TRUE WHERE id = $1 AND campaign_id = $2',
      [graffitiId, id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Graffiti not found' });
    }
    return res.json({ success: true });
  } catch (err: any) {
    console.error('Error approving graffiti:', err);
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/campaigns/:id/graffiti/:graffitiId - Delete a graffiti (Moderator)
app.delete('/api/campaigns/:id/graffiti/:graffitiId', authenticateToken, checkCampaignOwnership, async (req: any, res: any) => {
  const { id, graffitiId } = req.params;
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM graffiti WHERE id = $1 AND campaign_id = $2',
      [graffitiId, id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Graffiti not found' });
    }
    return res.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting graffiti:', err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/callback - Serves OAuth Callback page to extract implicit grant hash token
app.get('/api/auth/callback', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Authentification Google Workspace</title>
              const getQueryValue = function(key) {
                const fromSearch = new URLSearchParams(window.location.search).get(key);
                if (fromSearch) return fromSearch;
                const questionIdx = window.location.hash.indexOf('?');
                if (questionIdx !== -1) {
                  const nestedQuery = window.location.hash.substring(questionIdx + 1);
                  return new URLSearchParams(nestedQuery).get(key);
                }
                return null;
              };

              const hash = window.location.hash;
              const hashContent = hash.startsWith('#') ? hash.substring(1) : hash;
              const hashMain = hashContent.split('?')[0];
              const params = new URLSearchParams(hashMain);
              const oauthError = params.get('error');
              const oauthErrorDescription = params.get('error_description');

              if (oauthError) {
                document.getElementById('loader').style.display = 'none';
                document.getElementById('title').textContent = 'Erreur Google OAuth';
                document.getElementById('desc').textContent = oauthErrorDescription || oauthError;
                return;
              }

              const token = params.get('access_token');
              // In implicit flow, Google returns state in the hash fragment.
              const campaignIdFromHash = params.get('state');
              // Keep query-string fallback for compatibility with older flows.
              const campaignIdFromQuery = getQueryValue('state');
              const campaignIdFromStorage = window.localStorage.getItem('workspace_oauth_pending_campaign_id');
              const campaignIdFromWindowName = (function() {
                if (!window.name || !window.name.startsWith('GoogleWorkspaceAuth_')) return null;
                return decodeURIComponent(window.name.substring('GoogleWorkspaceAuth_'.length));
              })();
              const campaignId = campaignIdFromHash || campaignIdFromQuery || campaignIdFromStorage || campaignIdFromWindowName;
                return;
              }

            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                const details = [
                  token ? 'token=ok' : 'token=absent',
                  campaignId ? 'state=ok' : 'state=absent'
                ].join(' | ');
                document.getElementById('desc').textContent = 'Impossible de récupérer le jeton d\'accès Google ou l\'identifiant de la campagne. (' + details + ')';
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
              const campaignIdFromStorage = window.localStorage.getItem('workspace_oauth_pending_campaign_id');
              const campaignId = campaignIdFromHash || campaignIdFromQuery || campaignIdFromStorage;
            color: #1f2937;
          }
          .card {
            background: white;
            padding: 2.5rem;
            border-radius: 1.5rem;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
            text-align: center;
            max-width: 400px;
            width: 100%;
          }
          .spinner {
            border: 4px solid #f3f4f6;
            border-top: 4px solid #4f46e5;
            border-radius: 50%;
            width: 44px;
            height: 44px;
            animation: spin 1s linear infinite;
            margin: 0 auto 1.5rem auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          h2 {
            margin: 0 0 0.5rem 0;
            font-size: 1.5rem;
            font-weight: 800;
            letter-spacing: -0.025em;
          }
          p {
            margin: 0;
            color: #4b5563;
            font-size: 0.95rem;
            line-height: 1.5;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div id="loader" class="spinner"></div>
          <h2 id="title">Connexion sécurisée...</h2>
          <p id="desc">Nous finalisons la configuration de votre espace Google Workspace.</p>
        </div>
        <script>
          (async function() {
            try {
              const hash = window.location.hash;
              const params = new URLSearchParams(hash.substring(1));
              const token = params.get('access_token');
              // In implicit flow, Google returns state in the hash fragment.
              const campaignIdFromHash = params.get('state');
              // Keep query-string fallback for compatibility with older flows.
              const searchParams = new URLSearchParams(window.location.search);
              const campaignIdFromQuery = searchParams.get('state');
              const campaignId = campaignIdFromHash || campaignIdFromQuery;

              if (!token || !campaignId) {
                document.getElementById('loader').style.display = 'none';
                document.getElementById('title').textContent = 'Erreur d\\'authentification';
                document.getElementById('desc').textContent = 'Impossible de récupérer le jeton d\\'accès Google ou l\\'identifiant de la campagne.';
                return;
              }

              // Save token securely on the server-side
              const response = await fetch('/api/campaigns/' + encodeURIComponent(campaignId) + '/workspace/save-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
              });

              if (!response.ok) {
                throw new Error(await response.text());
              }

              window.localStorage.removeItem('workspace_oauth_pending_campaign_id');

              // Notify the parent builder window
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', token, campaignId }, '*');
                document.getElementById('loader').style.display = 'none';
                document.getElementById('title').textContent = 'Connexion réussie !';
                document.getElementById('desc').textContent = 'Votre espace est connecté. Cette fenêtre va se fermer automatiquement.';
                setTimeout(() => window.close(), 1500);
              } else {
                document.getElementById('loader').style.display = 'none';
                document.getElementById('title').textContent = 'Connexion validée !';
                document.getElementById('desc').textContent = 'Vous pouvez fermer cet onglet et retourner sur l\\'application.';
              }
            } catch (err) {
              console.error(err);
              document.getElementById('loader').style.display = 'none';
              document.getElementById('title').textContent = 'Échec de la connexion';
              document.getElementById('desc').textContent = 'Erreur lors de la sauvegarde du jeton : ' + err.message;
            }
          })();
        </script>
      </body>
    </html>
  `);
});

// POST /api/campaigns/:id/workspace/save-token - Secure server-side saving of campaign workspace token
app.post('/api/campaigns/:id/workspace/save-token', authenticateToken, checkCampaignOwnership, async (req, res) => {
  const { id } = req.params;
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Missing token' });
  }

  if (!databaseReady) {
    if (!offlineCampaigns.has(id)) {
      offlineCampaigns.set(id, {
        id,
        name: 'Exposition',
        brandName: 'expoAPP',
        whatsapp: '',
        themeColor: '#4f46e5',
        ownerUid: req.user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    offlineWorkspaceTokens.set(id, token);
    return res.json({ success: true });
  }

  try {
    const { rowCount } = await pool.query(
      `UPDATE campaigns SET workspace_token = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [token, id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/campaigns/:id/workspace/disconnect - Disconnect Google Workspace for this campaign
app.post('/api/campaigns/:id/workspace/disconnect', authenticateToken, checkCampaignOwnership, async (req, res) => {
  const { id } = req.params;

  if (!databaseReady) {
    offlineWorkspaceTokens.delete(id);
    return res.json({ success: true });
  }

  try {
    const { rowCount } = await pool.query(
      `UPDATE campaigns SET workspace_token = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Campaign not found' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/campaigns/:id/workspace/token-status - Check if workspace token is configured
app.get('/api/campaigns/:id/workspace/token-status', authenticateToken, checkCampaignOwnership, async (req, res) => {
  const { id } = req.params;

  if (!databaseReady) {
    return res.json({ hasToken: offlineWorkspaceTokens.has(id) });
  }

  try {
    const { rows } = await pool.query('SELECT workspace_token FROM campaigns WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    const hasToken = !!rows[0].workspace_token;
    res.json({ hasToken });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/campaigns/:id/workspace/drive-images - Secure proxy to list image files from Google Drive
app.get('/api/campaigns/:id/workspace/drive-images', authenticateToken, checkCampaignOwnership, async (req, res) => {
  const { id } = req.params;
  const folderId = req.query.folderId as string;
  try {
    const token = databaseReady
      ? (await pool.query('SELECT workspace_token FROM campaigns WHERE id = $1', [id])).rows[0]?.workspace_token
      : offlineWorkspaceTokens.get(id);

    if (!token) return res.status(401).json({ error: 'Google Workspace non connecté.' });

    let queryStr = "mimeType contains 'image/' and trashed=false";
    if (folderId && folderId !== 'all') {
      queryStr = `mimeType contains 'image/' and '${folderId}' in parents and trashed=false`;
    }

    const q = encodeURIComponent(queryStr);
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,size,thumbnailLink,webContentLink,webViewLink)&pageSize=100`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) return res.status(response.status).json({ error: await response.text() });
    const data = await response.json();
    res.json(data.files || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/campaigns/:id/workspace/import-drive-media - Download images from Drive, validate, hash, WebP thumb, store in /media
app.post('/api/campaigns/:id/workspace/import-drive-media', authenticateToken, checkCampaignOwnership, async (req, res) => {
  const { id } = req.params;
  const { fileIds } = req.body;

  if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
    return res.status(400).json({ error: 'Aucun fichier Drive spécifié.' });
  }

  const selectedIds = fileIds.slice(0, 20);

  try {
    const token = databaseReady
      ? (await pool.query('SELECT workspace_token FROM campaigns WHERE id = $1', [id])).rows[0]?.workspace_token
      : offlineWorkspaceTokens.get(id);

    if (!token) return res.status(401).json({ error: 'Google Workspace non connecté pour cette exposition.' });

    const importedFiles: any[] = [];
    const failureReasons: string[] = [];

    const pushFailure = (reason: string) => {
      if (failureReasons.length < 3) {
        failureReasons.push(reason);
      }
    };

    for (const fileId of selectedIds) {
      const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size&supportsAllDrives=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!metaRes.ok) {
        const metaErr = await metaRes.text();
        pushFailure(`Métadonnées Drive inaccessibles (${metaRes.status}).`);
        console.warn('Drive metadata fetch failed:', metaRes.status, metaErr);
        continue;
      }
      const meta = await metaRes.json();

      if (!meta.mimeType || !meta.mimeType.startsWith('image/')) {
        pushFailure(`Le fichier ${meta.name || fileId} n'est pas une image.`);
        continue;
      }
      if (meta.size && parseInt(meta.size, 10) > 50 * 1024 * 1024) {
        pushFailure(`Le fichier ${meta.name || fileId} dépasse 50MB.`);
        continue;
      }

      const mediaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!mediaRes.ok) {
        const mediaErr = await mediaRes.text();
        if (mediaRes.status === 401 || mediaRes.status === 403) {
          pushFailure('Permission insuffisante pour télécharger ce fichier Drive. Reconnectez Google Workspace pour accorder les nouveaux droits Drive.');
        } else {
          pushFailure(`Téléchargement Drive impossible (${mediaRes.status}) pour ${meta.name || fileId}.`);
        }
        console.warn('Drive media fetch failed:', mediaRes.status, mediaErr);
        continue;
      }

      const arrayBuffer = await mediaRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const hash = crypto.createHash('sha256').update(buffer).digest('hex');
      let ext = 'jpg';
      if (meta.mimeType === 'image/png') ext = 'png';
      else if (meta.mimeType === 'image/webp') ext = 'webp';
      else if (meta.mimeType === 'image/gif') ext = 'gif';
      else if (meta.mimeType === 'image/svg+xml') ext = 'svg';

      const fileName = `${hash}.${ext}`;
      const thumbFileName = `${hash}_thumb.webp`;
      const filePath = path.join(mediaDir, fileName);
      const thumbPath = path.join(mediaDir, thumbFileName);

      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, buffer);
      }

      let thumbnailUrl = `/media/${fileName}`;
      try {
        if (!fs.existsSync(thumbPath) && meta.mimeType !== 'image/svg+xml') {
          await sharp(buffer)
            .resize(400, 400, { fit: 'cover', position: 'center' })
            .webp({ quality: 80 })
            .toFile(thumbPath);
        }
        if (fs.existsSync(thumbPath)) {
          thumbnailUrl = `/media/${thumbFileName}`;
        }
      } catch (sharpErr) {
        console.warn('Sharp thumbnail failed:', sharpErr);
      }

      const publicUrl = `/media/${fileName}`;

      if (databaseReady) {
        const dbRes = await pool.query(
          `INSERT INTO media (campaign_id, hash, original_name, mime_type, size_bytes, url, thumbnail_url, drive_file_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id, url, thumbnail_url, original_name, mime_type, size_bytes, drive_file_id`,
          [id, hash, meta.name, meta.mimeType, buffer.length, publicUrl, thumbnailUrl, meta.id]
        );

        const saved = dbRes.rows[0];
        importedFiles.push({
          id: saved.id,
          url: saved.url,
          thumbnailUrl: saved.thumbnail_url,
          originalName: saved.original_name,
          mimeType: saved.mime_type,
          sizeBytes: parseInt(saved.size_bytes, 10),
          driveFileId: saved.drive_file_id
        });
      } else {
        const saved = {
          id: offlineMediaAutoId++,
          campaign_id: id,
          hash,
          original_name: meta.name,
          mime_type: meta.mimeType,
          size_bytes: buffer.length,
          url: publicUrl,
          thumbnail_url: thumbnailUrl,
          drive_file_id: meta.id,
          created_at: new Date().toISOString()
        };

        const current = offlineMedia.get(id) || [];
        current.push(saved);
        offlineMedia.set(id, current);

        importedFiles.push({
          id: saved.id,
          url: saved.url,
          thumbnailUrl: saved.thumbnail_url,
          originalName: saved.original_name,
          mimeType: saved.mime_type,
          sizeBytes: saved.size_bytes,
          driveFileId: saved.drive_file_id
        });
      }
    }

    if (importedFiles.length === 0) {
      const details = failureReasons.length > 0
        ? ` Détails: ${failureReasons.join(' ')}`
        : '';
      return res.status(400).json({
        error: `Aucun fichier n'a pu être importé.${details}`
      });
    }

    res.json({
      success: true,
      importedCount: importedFiles.length,
      files: importedFiles
    });
  } catch (err: any) {
    console.error('Drive import server error:', err);
    const message =
      (typeof err?.message === 'string' && err.message.trim())
        ? err.message.trim()
        : (typeof err === 'string' && err.trim())
          ? err.trim()
          : 'Erreur interne lors de l\'importation serveur.';
    res.status(500).json({ error: message });
  }
});

// POST /api/campaigns/:id/upload-media - Direct device upload pipeline (base64) storing in /media
app.post('/api/campaigns/:id/upload-media', authenticateToken, checkCampaignOwnership, async (req, res) => {
  const { id } = req.params;
  const { files } = req.body;

  if (!files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'Aucun fichier fourni.' });
  }

  try {
    const importedFiles: any[] = [];
    for (const f of files.slice(0, 20)) {
      const base64Clean = f.base64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Clean, 'base64');
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');

      let ext = 'jpg';
      if (f.mimeType === 'image/png') ext = 'png';
      else if (f.mimeType === 'image/webp') ext = 'webp';
      else if (f.mimeType === 'image/gif') ext = 'gif';
      else if (f.mimeType === 'image/svg+xml') ext = 'svg';

      const fileName = `${hash}.${ext}`;
      const thumbFileName = `${hash}_thumb.webp`;
      const filePath = path.join(mediaDir, fileName);
      const thumbPath = path.join(mediaDir, thumbFileName);

      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, buffer);
      }

      let thumbnailUrl = `/media/${fileName}`;
      try {
        if (!fs.existsSync(thumbPath) && f.mimeType !== 'image/svg+xml') {
          await sharp(buffer)
            .resize(400, 400, { fit: 'cover', position: 'center' })
            .webp({ quality: 80 })
            .toFile(thumbPath);
        }
        if (fs.existsSync(thumbPath)) {
          thumbnailUrl = `/media/${thumbFileName}`;
        }
      } catch (sharpErr) {
        console.warn('Sharp error:', sharpErr);
      }

      const publicUrl = `/media/${fileName}`;

      const dbRes = await pool.query(
        `INSERT INTO media (campaign_id, hash, original_name, mime_type, size_bytes, url, thumbnail_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, url, thumbnail_url, original_name, mime_type, size_bytes`,
        [id, hash, f.name || 'image', f.mimeType || 'image/jpeg', buffer.length, publicUrl, thumbnailUrl]
      );

      const saved = dbRes.rows[0];
      importedFiles.push({
        id: saved.id,
        url: saved.url,
        thumbnailUrl: saved.thumbnail_url,
        originalName: saved.original_name,
        mimeType: saved.mime_type,
        sizeBytes: parseInt(saved.size_bytes, 10)
      });
    }

    res.json({ success: true, files: importedFiles });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/campaigns/:id/workspace/folders - Secure proxy to list Google Drive folders
app.get('/api/campaigns/:id/workspace/folders', authenticateToken, checkCampaignOwnership, async (req, res) => {
  const { id } = req.params;
  try {
    const token = databaseReady
      ? (await pool.query('SELECT workspace_token FROM campaigns WHERE id = $1', [id])).rows[0]?.workspace_token
      : offlineWorkspaceTokens.get(id);

    if (!token) return res.status(401).json({ error: 'Google Workspace is not connected.' });

    const q = encodeURIComponent("mimeType='application/vnd.google-apps.folder' and trashed=false");
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&pageSize=100&supportsAllDrives=true&includeItemsFromAllDrives=true&corpora=allDrives`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) return res.status(response.status).json({ error: await response.text() });
    const data = await response.json();
    res.json(data.files || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/campaigns/:id/workspace/folders - Secure proxy to create Google Drive folder
app.post('/api/campaigns/:id/workspace/folders', authenticateToken, checkCampaignOwnership, async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const token = databaseReady
      ? (await pool.query('SELECT workspace_token FROM campaigns WHERE id = $1', [id])).rows[0]?.workspace_token
      : offlineWorkspaceTokens.get(id);

    if (!token) return res.status(401).json({ error: 'Google Workspace is not connected.' });

    const response = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        mimeType: 'application/vnd.google-apps.folder'
      })
    });
    if (!response.ok) return res.status(response.status).json({ error: await response.text() });
    res.json(await response.json());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/campaigns/:id/workspace/spreadsheets - Secure proxy to list Google Sheets
app.get('/api/campaigns/:id/workspace/spreadsheets', authenticateToken, checkCampaignOwnership, async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query('SELECT workspace_token FROM campaigns WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Campaign not found' });
    const token = rows[0].workspace_token;
    if (!token) return res.status(401).json({ error: 'Google Workspace is not connected.' });

    const q = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&pageSize=50`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) return res.status(response.status).json({ error: await response.text() });
    const data = await response.json();
    res.json(data.files || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/campaigns/:id/workspace/spreadsheets - Secure proxy to create Google Sheets
app.post('/api/campaigns/:id/workspace/spreadsheets', authenticateToken, checkCampaignOwnership, async (req, res) => {
  const { id } = req.params;
  const { title } = req.body;
  try {
    const { rows } = await pool.query('SELECT workspace_token FROM campaigns WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Campaign not found' });
    const token = rows[0].workspace_token;
    if (!token) return res.status(401).json({ error: 'Google Workspace is not connected.' });

    const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: { title }
      })
    });
    if (!response.ok) return res.status(response.status).json({ error: await response.text() });
    const data = await response.json();
    res.json({
      id: data.spreadsheetId,
      name: data.properties.title
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/campaigns/:id/workspace/spaces - Secure proxy to list Google Chat spaces
app.get('/api/campaigns/:id/workspace/spaces', authenticateToken, checkCampaignOwnership, async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query('SELECT workspace_token FROM campaigns WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Campaign not found' });
    const token = rows[0].workspace_token;
    if (!token) return res.status(401).json({ error: 'Google Workspace is not connected.' });

    const response = await fetch('https://chat.googleapis.com/v1/spaces', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) return res.status(response.status).json({ error: await response.text() });
    const data = await response.json();
    res.json(data.spaces || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/campaigns/:id/workspace/drive-upload - Secure server-side file upload to Google Drive using raw binary stream
app.post('/api/campaigns/:id/workspace/drive-upload', express.raw({ type: '*/*', limit: '50mb' }), async (req, res) => {
  const { id } = req.params;
  const fileName = req.query.fileName as string;
  const mimeType = req.query.mimeType as string;
  const folderId = req.query.folderId as string;

  if (!fileName || !mimeType || !folderId) {
    return res.status(400).json({ error: 'Missing required query parameters: fileName, mimeType, folderId' });
  }

  const buffer = req.body;
  if (!buffer || buffer.length === 0) {
    return res.status(400).json({ error: 'No file data received' });
  }

  // Check file size (max 30MB)
  if (buffer.length > 30 * 1024 * 1024) {
    return res.status(413).json({ error: 'File size exceeds maximum limit of 30MB' });
  }

  try {
    const { rows } = await pool.query('SELECT workspace_token FROM campaigns WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const token = rows[0].workspace_token;
    if (!token) {
      return res.status(401).json({ error: 'Google Workspace is not connected or authorized for this Campaign.' });
    }

    const base64Data = buffer.toString('base64');

    const metadata = {
      name: fileName,
      mimeType: mimeType,
      parents: [folderId]
    };

    const boundary = 'foo_bar_baz_boundary_server';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
    const mediaPartHeader = `\r\nContent-Type: ${mimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n`;
    const body = `${metadataPart}${mediaPartHeader}${base64Data}${closeDelimiter}`;

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Google Drive API Error:', errText);
      return res.status(response.status).json({ error: `Google Drive upload failed: ${errText}` });
    }

    const result = await response.json();
    res.json(result);
  } catch (err: any) {
    console.error('Server-side Drive upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/campaigns/:id/workspace/sheets-append - Secure server-side append to Google Sheets
app.post('/api/campaigns/:id/workspace/sheets-append', async (req, res) => {
  const { id } = req.params;
  const { spreadsheetId, range, row } = req.body;

  if (!spreadsheetId || !range || !row) {
    return res.status(400).json({ error: 'Missing required fields: spreadsheetId, range, row' });
  }

  try {
    const { rows } = await pool.query('SELECT workspace_token FROM campaigns WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const token = rows[0].workspace_token;
    if (!token) {
      return res.status(401).json({ error: 'Google Workspace is not connected or authorized for this Campaign.' });
    }

    const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [row]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Google Sheets API Error:', errText);
      return res.status(response.status).json({ error: `Google Sheets update failed: ${errText}` });
    }

    const result = await response.json();
    res.json(result);
  } catch (err: any) {
    console.error('Server-side Sheets append error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/campaigns/:id/workspace/chat-send - Secure server-side Google Chat notification
app.post('/api/campaigns/:id/workspace/chat-send', async (req, res) => {
  const { id } = req.params;
  const { spaceId, text } = req.body;

  if (!spaceId || !text) {
    return res.status(400).json({ error: 'Missing required fields: spaceId, text' });
  }

  try {
    const { rows } = await pool.query('SELECT workspace_token FROM campaigns WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const token = rows[0].workspace_token;
    if (!token) {
      return res.status(401).json({ error: 'Google Workspace is not connected or authorized for this Campaign.' });
    }

    const endpoint = `https://chat.googleapis.com/v1/${spaceId}/messages`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Google Chat API Error:', errText);
      return res.status(response.status).json({ error: `Google Chat message send failed: ${errText}` });
    }

    const result = await response.json();
    res.json(result);
  } catch (err: any) {
    console.error('Server-side Chat message send error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/campaigns/:id/increment - Increment specific Nested JSONB field
app.post('/api/campaigns/:id/increment', async (req, res) => {
  const { id } = req.params;
  const { field } = req.body; // e.g. "scans", "gamesCompleted", "couponViews", "leads", "shares.whatsapp"
  try {
    const parts = field.split('.');
    let path: string[];
    if (parts[0] === 'stats') {
      path = parts;
    } else {
      path = ['stats', ...parts];
    }
    
    // We construct the query. If the path does not exist, jsonb_set with true parameter will create it.
    // However, to make sure COALESCE gets a default value if missing or null, we use a simple CASE or query.
    await pool.query(
      `UPDATE campaigns
       SET config = jsonb_set(
         config,
         $1::text[],
         to_jsonb(COALESCE((config#>$1)::numeric, 0) + 1),
         true
       )
       WHERE id = $2`,
      [path, id]
    );
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error incrementing stat:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leads - Create a lead
app.post('/api/leads', async (req, res) => {
  const { campaignId, campaignName, provider } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO leads (campaign_id, campaign_name, provider)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [campaignId, campaignName, provider]
    );
    res.json(rows[0]);
  } catch (err: any) {
    console.error('Error saving lead:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads - Fetch all leads (restricted to owned campaigns unless admin)
app.get('/api/leads', authenticateToken, async (req: any, res: any) => {
  const user = req.user;
  try {
    let queryStr = `
      SELECT l.* FROM leads l
      ORDER BY l.created_at DESC
    `;
    let params: any[] = [];

    if (user.role !== 'admin') {
      queryStr = `
        SELECT l.* FROM leads l
        INNER JOIN campaigns c ON l.campaign_id = c.id
        WHERE c.owner_uid = $1
        ORDER BY l.created_at DESC
      `;
      params = [user.uid];
    }

    const { rows } = await pool.query(queryStr, params);
    res.json(rows);
  } catch (err: any) {
    console.error('Error fetching leads:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// FRONTEND SERVING (Vite Integration)
// ============================================================================

async function mountFrontend() {
  if (process.env.NODE_ENV !== 'production') {
    // Dev Mode: Integrate Vite Server as middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite development middleware mounted.');
  } else {
    // Production Mode: Serve static dist files
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Production static asset serving mounted.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Full-stack server running on http://localhost:${PORT}`);
  });
}

async function startServer() {
  await initDb();
  await startPgListener();
  await mountFrontend();
}

startServer();
