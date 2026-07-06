import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Role from '../models/Role.js';
import generateOTP from '../utils/generateOTP.js';
import { logAuditEvent } from '../utils/auditLogger.js';
import { triggerNotification } from '../utils/triggerNotification.js';
import { JWT_ACCESS_EXPIRY, JWT_REFRESH_EXPIRY } from '../constants/authConfig.js';

// Helper to generate access and refresh tokens
const generateAccessToken = (userId, email, roleName) => {
  return jwt.sign(
    { id: userId, email, role: roleName },
    process.env.JWT_ACCESS_SECRET || 'your_jwt_access_secret_key_change_me_in_production',
    { expiresIn: JWT_ACCESS_EXPIRY }
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET || 'your_jwt_refresh_secret_key_change_me_in_production',
    { expiresIn: JWT_REFRESH_EXPIRY }
  );
};

// 1. POST /api/v1/auth/register
export const register = async (req, res, next) => {
  try {
    const { name, email, mobile, password, roleName, roleId } = req.body;

    if (!name || !email || !mobile || !password) {
      return res.status(400).json({ success: false, message: 'All fields (name, email, mobile, password) are required.' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'A user with this email address already exists.' });
    }

    // Resolve Role ID
    let resolvedRoleId = roleId;
    if (!resolvedRoleId && roleName) {
      const dbRole = await Role.findOne({ name: roleName });
      if (!dbRole) {
        return res.status(400).json({ success: false, message: `Specified role name '${roleName}' is invalid.` });
      }
      resolvedRoleId = dbRole._id;
    }

    if (!resolvedRoleId) {
      // Default to Retailer if no role is supplied
      const defaultRole = await Role.findOne({ name: 'Retailer' });
      resolvedRoleId = defaultRole ? defaultRole._id : null;
    }

    if (!resolvedRoleId) {
      return res.status(500).json({ success: false, message: 'Failed to assign role. Roles must be seeded first.' });
    }

    // Generate Verification OTP (valid for 10 minutes)
    const otp = generateOTP();
    const otp_expiry = new Date(Date.now() + 10 * 60 * 1000);

    const newUser = new User({
      name,
      email,
      mobile,
      password, // Will be hashed via User pre-save middleware
      role: resolvedRoleId,
      otp,
      otp_expiry,
      is_verified: false,
      is_active: true
    });

    await newUser.save();

    // Send OTP notifications via templates
    triggerNotification('otp_email', { otp, user_name: name, company_name: 'Huddo Shoes', recipient_email: email });
    triggerNotification('otp_sms', { otp, user_name: name, company_name: 'Huddo Shoes', recipient_mobile: mobile });
    triggerNotification('otp_whatsapp', { otp, user_name: name, company_name: 'Huddo Shoes', recipient_mobile: mobile });

    // Return created user (excluding password/otp fields)
    const userResponse = await User.findById(newUser._id).select('-password -otp -otp_expiry').populate('role');

    res.status(201).json({
      success: true,
      message: 'Registration successful! Verification OTP sent to email and mobile.',
      data: userResponse
    });
  } catch (error) {
    next(error);
  }
};

// 2. POST /api/v1/auth/verify-otp
export const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
    }

    const user = await User.findOne({ email }).populate('role');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.is_verified) {
      return res.status(400).json({ success: false, message: 'Account is already verified.' });
    }

    // Validate OTP and expiration
    if (user.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Incorrect OTP. Verification failed.' });
    }

    if (new Date() > user.otp_expiry) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    // Mark as verified
    user.is_verified = true;
    user.otp = undefined;
    user.otp_expiry = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Account successfully verified! You can now log in.',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

// 3. POST /api/v1/auth/send-otp
export const sendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otp_expiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    // Send OTP notifications via templates
    triggerNotification('otp_email', { otp, user_name: user.name, company_name: 'Huddo Shoes', recipient_email: user.email });
    triggerNotification('otp_sms', { otp, user_name: user.name, company_name: 'Huddo Shoes', recipient_mobile: user.mobile });
    triggerNotification('otp_whatsapp', { otp, user_name: user.name, company_name: 'Huddo Shoes', recipient_mobile: user.mobile });

    res.status(200).json({
      success: true,
      message: 'Verification OTP sent successfully.',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

// 4. POST /api/v1/auth/login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email/Employee ID and password are required.' });
    }

    // Fetch user by email, employee_id, user_code, or mobile number
    const user = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { employee_id: email },
        { user_code: email },
        { mobile: email }
      ]
    }).populate('role');
    
    if (!user) {
      await logAuditEvent(null, 'login-failed', 'auth', null, null, { email }, req);
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (user.status === 'Inactive' || !user.is_active) {
      await logAuditEvent(user._id, 'login-failed-inactive', 'auth', null, null, { email }, req);
      return res.status(403).json({ success: false, message: 'Access denied: User account is inactive.' });
    }

    if (user.status === 'Suspended') {
      await logAuditEvent(user._id, 'login-failed-suspended', 'auth', null, null, { email }, req);
      return res.status(403).json({ success: false, message: 'Access denied: User account is suspended.' });
    }

    if (user.approval_status && user.approval_status !== 'Approved') {
      return res.status(403).json({
        success: false,
        message: user.approval_status === 'Pending'
          ? 'Access denied: Your account is pending admin approval.'
          : 'Access denied: Your account registration was rejected.'
      });
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await logAuditEvent(user._id, 'login-failed-password', 'auth', null, null, { email }, req);
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Generate tokens
    const roleName = user.role.name;
    const accessToken = generateAccessToken(user._id, user.email, roleName);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token & last login details
    user.refresh_token = refreshToken;
    user.last_login = new Date();
    await user.save();

    // Log successful login
    await logAuditEvent(user._id, 'login', 'auth', null, null, null, req);

    // Remove password and tokens from response payload
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.refresh_token;
    delete userResponse.otp;
    delete userResponse.otp_expiry;

    res.status(200).json({
      success: true,
      message: 'Login successful!',
      data: {
        user: userResponse,
        access_token: accessToken,
        refresh_token: refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

// 5. POST /api/v1/auth/logout
export const logout = async (req, res, next) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ success: false, message: 'Refresh token is required.' });
    }

    const user = await User.findOne({ refresh_token });
    if (user) {
      user.refresh_token = undefined;
      await user.save();
      await logAuditEvent(user._id, 'logout', 'auth', null, null, null, req);
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

// 6. POST /api/v1/auth/refresh-token
export const refreshToken = async (req, res, next) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ success: false, message: 'Refresh token is required.' });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET || 'your_jwt_refresh_secret_key_change_me_in_production');
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
    }

    // Find user with matching refresh token
    const user = await User.findOne({ _id: decoded.id, refresh_token }).populate('role');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }

    // Issue new access token
    const accessToken = generateAccessToken(user._id, user.email, user.role.name);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully.',
      data: {
        access_token: accessToken
      }
    });
  } catch (error) {
    next(error);
  }
};

// 7. POST /api/v1/auth/forgot-password
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No user registered with this email.' });
    }

    // Generate reset OTP
    const otp = generateOTP();
    user.otp = otp;
    user.otp_expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins for password reset
    await user.save();

    // Send password reset OTP via templates
    triggerNotification('password_reset', { otp, user_name: user.name, company_name: 'Huddo Shoes', recipient_email: user.email });
    triggerNotification('otp_sms', { otp, user_name: user.name, company_name: 'Huddo Shoes', recipient_mobile: user.mobile });
    triggerNotification('otp_whatsapp', { otp, user_name: user.name, company_name: 'Huddo Shoes', recipient_mobile: user.mobile });

    res.status(200).json({
      success: true,
      message: 'Password reset OTP has been sent to your email and mobile.',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

// 8. POST /api/v1/auth/reset-password
export const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, OTP, and newPassword are required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Verify OTP
    if (user.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Incorrect OTP.' });
    }

    if (new Date() > user.otp_expiry) {
      return res.status(400).json({ success: false, message: 'OTP has expired.' });
    }

    // Save new password (pre-save hook hashes it)
    user.password = newPassword;
    user.otp = undefined;
    user.otp_expiry = undefined;
    user.refresh_token = undefined; // Force re-login on all devices
    await user.save();

    await logAuditEvent(user._id, 'reset-password', 'auth', null, null, null, req);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

// 9. POST /api/v1/auth/change-password (Authenticated)
export const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Old password and new password are required.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect old password.' });
    }

    user.password = newPassword;
    user.refresh_token = undefined; // Invalidate sessions
    await user.save();

    await logAuditEvent(user._id, 'change-password', 'auth', null, null, null, req);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please log in again.'
    });
  } catch (error) {
    next(error);
  }
};
