import express from 'express';
import crypto from 'crypto';
import { getOne, execute, query } from '../db.js';

const router = express.Router();

// Simple hash function (for development - in production use bcrypt)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

// ============================================================================
// LOGIN ENDPOINT
// ============================================================================

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Login attempt:', email);
    console.log('📧 Email type:', typeof email);
    console.log('📧 Email value:', JSON.stringify(email));

    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find user by email in profiles
    const emailLower = email.toLowerCase();
    console.log('📧 Looking up profile for:', emailLower);
    console.log('📧 Looking up with exact string:', JSON.stringify(emailLower));
    
    const profile = await getOne(
      'SELECT id, full_name, email FROM profiles WHERE LOWER(email) = LOWER(?)',
      [emailLower]
    );

    if (!profile) {
      console.log('❌ Profile not found for email:', emailLower);
      console.log('📧 Checking what emails exist in DB...');
      const allProfiles = await query('SELECT email FROM profiles LIMIT 5');
      console.log('Sample emails in DB:', allProfiles.map(p => p.email));
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    console.log('✅ Profile found:', profile.id, '| Email in DB:', profile.email);

    // Check password in credentials table
    console.log('🔑 Checking credentials for:', profile.id);
    const credentials = await getOne(
      'SELECT password_hash FROM user_credentials WHERE user_id = ?',
      [profile.id]
    );

    console.log('📝 Credentials found:', credentials ? 'yes' : 'no');
    if (!credentials) {
      console.log('❌ No credentials found for user');
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    const passwordMatch = verifyPassword(password, credentials.password_hash);
    console.log('🔓 Password match:', passwordMatch ? '✅ yes' : '❌ no');
    console.log('   Input password hash:', hashPassword(password).substring(0, 30) + '...');
    console.log('   Stored hash:        ', credentials.password_hash.substring(0, 30) + '...');

    if (!passwordMatch) {
      console.log('❌ Password verification failed');
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Get user role
    const role = await getOne(
      'SELECT role FROM user_roles WHERE user_id = ?',
      [profile.id]
    );

    // Get vendor info if vendor
    let vendor = null;
    if (role?.role === 'master_vendor' || role?.role === 'vendor_staff') {
      vendor = await getOne(
        'SELECT id, business_name FROM vendors WHERE user_id = ?',
        [profile.id]
      );
    }

    // Create session token (simple JWT-like token)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Save token
    await execute(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE token = ?, expires_at = ?',
      [profile.id, token, expiresAt, token, expiresAt]
    );

    res.json({
      success: true,
      data: {
        user: {
          id: profile.id,
          email: profile.email,
          fullName: profile.full_name,
          role: role?.role || 'client',
          vendor: vendor
        },
        token,
        expiresAt
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// SIGNUP ENDPOINT
// ============================================================================

router.post('/signup', async (req, res) => {
  try {
    const { email, password, fullName, isVendor, businessName } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and full name are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters'
      });
    }

    // Check if user exists
    const existing = await getOne(
      'SELECT id FROM profiles WHERE email = ?',
      [email.toLowerCase()]
    );

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered'
      });
    }

    // Create profile
    const userId = crypto.randomUUID();
    const passwordHash = hashPassword(password);

    await execute(
      'INSERT INTO profiles (id, full_name, email) VALUES (?, ?, ?)',
      [userId, fullName, email.toLowerCase()]
    );

    // Save credentials
    await execute(
      'INSERT INTO user_credentials (user_id, password_hash) VALUES (?, ?)',
      [userId, passwordHash]
    );

    // Set role (vendor or client)
    const userRole = isVendor ? 'master_vendor' : 'client';
    const roleId = crypto.randomUUID();
    await execute(
      'INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)',
      [roleId, userId, userRole]
    );

    // If vendor, create vendor record
    let vendor = null;
    if (isVendor) {
      const vendorId = crypto.randomUUID();
      await execute(
        'INSERT INTO vendors (id, user_id, business_name) VALUES (?, ?, ?)',
        [vendorId, userId, businessName || fullName]
      );
      vendor = {
        id: vendorId,
        business_name: businessName || fullName
      };
    }

    // Create session
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await execute(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)',
      [userId, token, expiresAt]
    );

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: userId,
          email: email.toLowerCase(),
          fullName,
          role: userRole,
          vendor: vendor
        },
        token,
        expiresAt
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// VERIFY TOKEN ENDPOINT
// ============================================================================

router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }

    const session = await getOne(
      'SELECT user_id, expires_at FROM sessions WHERE token = ? AND expires_at > NOW()',
      [token]
    );

    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Get user info
    const profile = await getOne(
      'SELECT id, full_name, email FROM profiles WHERE id = ?',
      [session.user_id]
    );

    const role = await getOne(
      'SELECT role FROM user_roles WHERE user_id = ?',
      [session.user_id]
    );

    res.json({
      success: true,
      data: {
        user: {
          id: profile.id,
          email: profile.email,
          fullName: profile.full_name,
          role: role?.role || 'client'
        }
      }
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// LOGOUT ENDPOINT
// ============================================================================

router.post('/logout', async (req, res) => {
  try {
    const { token } = req.body;

    if (token) {
      await execute('DELETE FROM sessions WHERE token = ?', [token]);
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
