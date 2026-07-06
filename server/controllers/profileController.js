import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import { saveFileToDisk, deleteFileFromDisk } from '../utils/fileUpload.js';

// Resolve directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. GET /api/v1/profile (Authenticated)
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('role')
      .populate('department')
      .populate('designation')
      .populate('reporting_manager')
      .populate('country')
      .populate('state')
      .populate('city');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Attempt to locate associated Employee profile
    const employee = await Employee.findOne({ user: user._id })
      .populate('department')
      .populate('designation')
      .populate('reporting_manager');

    // Combine database models into unified response
    const profile = {
      // Personal
      _id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      alternate_mobile: user.alternate_mobile || '',
      gender: user.gender || '',
      date_of_birth: user.date_of_birth ? user.date_of_birth.toISOString().split('T')[0] : '',
      blood_group: user.blood_group || '',
      marital_status: user.marital_status || '',
      profile_photo: user.profile_photo || '',

      // Professional
      role: (typeof user.role === 'object' && user.role !== null ? user.role.name : user.role) || user.roleName || 'None',
      department: user.department?.name || user.departmentName || '',
      designation: user.designation?.title || user.designationName || '',
      branch: user.branch || '',
      reporting_manager: user.reporting_manager?.name || employee?.reporting_manager?.full_name || '',
      joining_date: employee?.joining_date ? employee.joining_date.toISOString().split('T')[0] : (user.createdAt ? user.createdAt.toISOString().split('T')[0] : ''),
      employment_status: user.is_active ? 'Active' : 'Inactive',
      shift_timing: user.shift_timing || '09:00 AM - 06:00 PM',

      // Address
      address: employee?.residential_address || '',
      city: user.city?.name || user.city || '',
      state: user.state?.name || user.state || '',
      country: user.country?.name || user.country || '',
      pincode: user.pincode || '',

      // Emergency Contact
      emergency_contact: user.emergency_contact || {
        contact_person: '',
        relationship: '',
        mobile: ''
      },

      // Metadata
      employee_id: user.employee_id || employee?.employee_code || '',
      user_code: user.user_code || '',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      last_login: user.last_login || null
    };

    return res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully.',
      data: profile
    });
  } catch (error) {
    next(error);
  }
};

// 2. PUT /api/v1/profile (Authenticated)
export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const {
      mobile,
      alternate_mobile,
      gender,
      blood_group,
      marital_status,
      address,
      city,
      state,
      country,
      pincode,
      emergency_contact,
      date_of_birth
    } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Update permissible User fields
    if (mobile) user.mobile = mobile;
    if (alternate_mobile !== undefined) user.alternate_mobile = alternate_mobile;
    if (gender !== undefined) user.gender = gender;
    if (blood_group !== undefined) user.blood_group = blood_group;
    if (marital_status !== undefined) user.marital_status = marital_status;
    if (pincode !== undefined) user.pincode = pincode;
    if (emergency_contact !== undefined) user.emergency_contact = emergency_contact;
    if (date_of_birth !== undefined) {
      user.date_of_birth = date_of_birth ? new Date(date_of_birth) : null;
    }

    // Resolve geographic fields if strings are supplied
    if (city !== undefined) {
      if (mongoose.isValidObjectId(city)) {
        user.city = city;
      } else {
        const CityModel = mongoose.model('City');
        const dbCity = await CityModel.findOne({ name: new RegExp('^' + String(city).trim() + '$', 'i') });
        if (dbCity) user.city = dbCity._id;
      }
    }

    if (state !== undefined) {
      if (mongoose.isValidObjectId(state)) {
        user.state = state;
      } else {
        const StateModel = mongoose.model('State');
        const dbState = await StateModel.findOne({ name: new RegExp('^' + String(state).trim() + '$', 'i') });
        if (dbState) user.state = dbState._id;
      }
    }

    if (country !== undefined) {
      if (mongoose.isValidObjectId(country)) {
        user.country = country;
      } else {
        const CountryModel = mongoose.model('Country');
        const dbCountry = await CountryModel.findOne({ name: new RegExp('^' + String(country).trim() + '$', 'i') });
        if (dbCountry) user.country = dbCountry._id;
      }
    }

    await user.save();

    // Sync with Employee record if exists
    const employee = await Employee.findOne({ user: userId });
    if (employee) {
      if (mobile) employee.mobile = mobile;
      if (address !== undefined) employee.residential_address = address;
      await employee.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// 3. POST /api/v1/profile/upload-photo (Authenticated)
export const uploadPhoto = async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    // Validate size (5 MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'File size exceeds 5 MB limit.' });
    }

    // Validate format
    const allowedFormats = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedFormats.includes(ext)) {
      return res.status(400).json({ success: false, message: 'Invalid file format. Allowed: JPG, JPEG, PNG, WEBP.' });
    }

    // Find and delete old photo from disk first
    const user = await User.findById(req.user._id);
    if (user && user.profile_photo) {
      deleteFileFromDisk(user.profile_photo);
    }

    const relativePath = await saveFileToDisk(file, 'profile');

    // Update User model
    if (user) {
      user.profile_photo = relativePath;
      await user.save();
    }

    // Update Employee model
    const employee = await Employee.findOne({ user: req.user._id });
    if (employee) {
      employee.profile_photo = relativePath;
      await employee.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Profile photo uploaded successfully.',
      data: { profile_photo: relativePath }
    });
  } catch (error) {
    next(error);
  }
};

// 4. POST /api/v1/profile/remove-photo (Authenticated)
export const removePhoto = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Delete photo file from disk
    if (user.profile_photo) {
      deleteFileFromDisk(user.profile_photo);
    }

    user.profile_photo = undefined;
    await user.save();

    const employee = await Employee.findOne({ user: req.user._id });
    if (employee) {
      employee.profile_photo = undefined;
      await employee.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Profile photo removed successfully.',
      data: { profile_photo: '' }
    });
  } catch (error) {
    next(error);
  }
};
