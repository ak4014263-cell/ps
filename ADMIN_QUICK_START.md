# 🎯 Admin Login Quick Start

## Login Credentials
```
Email:    admin@example.com
Password: admin@123
```

## What Happens When You Login

```
1. Open http://localhost:8080/auth
   ↓
2. Click "Login" tab
   ↓
3. Enter:
   - Email: admin@example.com
   - Password: admin@123
   ↓
4. Click "Login" button
   ↓
5. See success toast: "Logged in successfully!"
   ↓
6. Automatically redirected to http://localhost:8080/dashboard
   ↓
7. See "Super Admin Panel" heading
   ↓
8. Access all admin features:
   - Vendor Management
   - Client Management
   - Global Projects View
   - Template Management
   - Admin Reports
   - Staff Management
   - And more...
```

## Status Checks

✅ **Backend Running?**
```bash
curl http://localhost:5000/api/health
```

✅ **Frontend Running?**
```bash
Open http://localhost:8080 in browser
```

✅ **Admin Account Exists?**
```bash
node find-admin-password.js
```

✅ **Password Correct?**
```bash
node debug-login.js
```

## Common Issues

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Password mismatch - verify credentials |
| Connection refused | Backend not running - `npm start` in backend folder |
| Page blank | Clear browser cache and refresh |
| Admin panel not showing | Check browser console for errors |
| Can't reach localhost | Check firewall settings |

## Reset Password (If Needed)

```bash
node reset-admin-password.js
```

Then login with: `admin@123`

## Restart Everything

```bash
# Kill all node processes
Stop-Process -Name node -Force

# Start backend
cd backend && npm start

# Start frontend (new terminal)
npm run dev
```
