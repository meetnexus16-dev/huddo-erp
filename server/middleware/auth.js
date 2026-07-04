import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const verifyJWT = async (req, res, next) => {
  try {
    let token;

    // Check authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed: Token is missing.',
        data: null
      });
    }

    // Verify the JWT Access Token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'your_jwt_access_secret_key_change_me_in_production');
    
    // Fetch the user, populate role permissions
    const user = await User.findById(decoded.id).populate('role');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed: User no longer exists.',
        data: null
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: User account is inactive.',
        data: null
      });
    }

    if (!user.is_verified) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: User account is not verified. Please verify your OTP.',
        data: null
      });
    }

    if (user.approval_status && user.approval_status !== 'Approved') {
      return res.status(403).json({
        success: false,
        message: user.approval_status === 'Pending'
          ? 'Access denied: Your account is pending admin approval.'
          : 'Access denied: Your account registration was rejected.',
        data: null
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    // Forward token validation issues to the global error handler
    next(error);
  }
};
