import mongoose from 'mongoose';
import { DEFAULT_USER_PASSWORD } from '../constants/defaultCredentials.js';
import { isAdminUser } from '../utils/adminRole.js';

export const genericController = (Model, populateOptions = []) => {
  return {
    // 1. GET /api/v1/{module} - List (paginated, sorted, searched, filtered)
    getAll: async (req, res, next) => {
      try {
        const {
          page = 1,
          limit = 10,
          sort = 'createdAt',
          order = 'desc',
          search = '',
          ...filters
        } = req.query;

        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;

        // Build query criteria
        const criteria = { is_deleted: { $ne: true } };

        if (Model.modelName === 'User' && filters.include_pending !== 'true' && !filters.approval_status) {
          criteria.approval_status = 'Approved';
        }
        if (filters.include_pending === 'true') {
          delete filters.include_pending;
        }

        if (Model.modelName === 'Retailer' && filters.include_unverified !== 'true' && filters.is_verified === undefined) {
          criteria.is_verified = true;
        }
        if (filters.include_unverified === 'true') {
          delete filters.include_unverified;
        }

        // Handle multi-tenancy if company_id is provided
        if (req.user && req.user.company_id) {
          criteria.company_id = req.user.company_id;
        }

        // Apply filters (e.g., status=Active)
        Object.keys(filters).forEach((key) => {
          if (filters[key] !== undefined && filters[key] !== '') {
            // Check if it's a valid object ID string, if so, cast it
            if (mongoose.isValidObjectId(filters[key])) {
              criteria[key] = new mongoose.Types.ObjectId(filters[key]);
            } else if (filters[key] === 'true' || filters[key] === 'false') {
              criteria[key] = filters[key] === 'true';
            } else {
              criteria[key] = filters[key];
            }
          }
        });

        // Apply search criteria using regex across typical text fields
        if (search) {
          const searchableFields = [];
          const schemaPaths = Model.schema.paths;
          
          const typicalFields = [
            'name', 'title', 'email', 'mobile', 'sku', 'sku_variant', 
            'business_name', 'owner_name', 'order_number', 'invoice_number',
            'employee_code', 'promoter_code', 'po_number'
          ];

          typicalFields.forEach((field) => {
            if (schemaPaths[field]) {
              searchableFields.push({ [field]: { $regex: search, $options: 'i' } });
            }
          });

          if (searchableFields.length > 0) {
            criteria.$or = searchableFields;
          }
        }

        // Sort configuration
        const sortOrder = order === 'asc' ? 1 : -1;
        const sortCriteria = { [sort]: sortOrder };

        // Fetch documents
        let query = Model.find(criteria)
          .sort(sortCriteria)
          .skip(skip)
          .limit(limitNum);

        // Dynamic populate
        if (populateOptions.length > 0) {
          populateOptions.forEach((option) => {
            query = query.populate(option);
          });
        }

        const data = await query;
        const total = await Model.countDocuments(criteria);

        res.status(200).json({
          success: true,
          message: `${Model.modelName}s retrieved successfully.`,
          data,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum)
          }
        });
      } catch (error) {
        next(error);
      }
    },

    // 2. GET /api/v1/{module}/:id - Single record
    getById: async (req, res, next) => {
      try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid record ID.',
            data: null
          });
        }

        let query = Model.findById(id);

        if (populateOptions.length > 0) {
          populateOptions.forEach((option) => {
            query = query.populate(option);
          });
        }

        const data = await query;

        if (!data) {
          return res.status(404).json({
            success: false,
            message: `${Model.modelName} not found.`,
            data: null
          });
        }

        res.status(200).json({
          success: true,
          message: `${Model.modelName} retrieved successfully.`,
          data
        });
      } catch (error) {
        next(error);
      }
    },

    // 3. POST /api/v1/{module} - Create
    create: async (req, res, next) => {
      try {
        // Enforce company tenancy on creations
        if (req.user && req.user.company_id) {
          req.body.company_id = req.user.company_id;
        }

        if (['Country', 'State', 'City'].includes(Model.modelName)) {
          const { prepareHierarchyGeoCreate } = await import('../utils/geoResolve.js');
          try {
            await prepareHierarchyGeoCreate(Model.modelName, req.body);
          } catch (geoError) {
            return res.status(400).json({ success: false, message: geoError.message, data: null });
          }
          delete req.body.country_name;
          delete req.body.state_name;
          delete req.body.city_name;
          delete req.body.country_iso;
        }

        if (req.body.manager && ['Country', 'State', 'City'].includes(Model.modelName)) {
          const {
            assignCountryManager,
            assignStateManager,
            assignCityManager
          } = await import('../utils/managerAssignment.js');

          const managerId = req.body.manager;
          const payload = { ...req.body };
          delete payload.manager;

          const doc = new Model(payload);
          await doc.save();

          try {
            let assignedData = null;
            if (Model.modelName === 'Country') {
              assignedData = await assignCountryManager(doc._id, managerId);
            } else if (Model.modelName === 'State') {
              assignedData = await assignStateManager(doc._id, managerId);
            } else if (Model.modelName === 'City') {
              assignedData = await assignCityManager(doc._id, managerId);
            }

            let responseData = assignedData || doc;
            if (populateOptions.length > 0) {
              responseData = await Model.findById((assignedData || doc)._id);
              for (const option of populateOptions) {
                responseData = await responseData.populate(option);
              }
            }

            return res.status(201).json({
              success: true,
              message: `${Model.modelName} created successfully.`,
              data: responseData
            });
          } catch (assignmentError) {
            await Model.findByIdAndDelete(doc._id);
            return res.status(400).json({
              success: false,
              message: assignmentError.message,
              data: null
            });
          }
        }

        if (Model.modelName === 'Retailer') {
          req.body.is_verified = false;
          req.body.is_active = false;
          delete req.body.country_id;
          delete req.body.state_id;
          delete req.body.city_id;
        }

        let skipManagerAssignmentOnCreate = false;
        let pendingApprovalMessage = null;

        if (Model.modelName === 'User') {
          const { normalizeRoleName } = await import('../utils/roleUtils.js');
          const Role = mongoose.model('Role');
          const { resolveOnboardingTerritory } = await import('../utils/geoResolve.js');
          const {
            buildPendingUserPayload,
            PENDING_APPROVAL_MESSAGE
          } = await import('../utils/pendingUserApplication.js');

          const assignedCountryId = req.body.assigned_country_id || req.body.country_id || req.body.country || null;
          const assignedStateId = req.body.assigned_state_id || req.body.state_id || req.body.state || null;
          const assignedCityId = req.body.assigned_city_id || req.body.city_id || req.body.city || null;
          delete req.body.assigned_country_id;
          delete req.body.assigned_state_id;
          delete req.body.assigned_city_id;

          if (req.body.roleName) {
            req.body.roleName = normalizeRoleName(req.body.roleName);
            if (!req.body.role) {
              const dbRole = await Role.findOne({ name: req.body.roleName });
              if (!dbRole) {
                return res.status(400).json({
                  success: false,
                  message: `Role "${req.body.roleName}" not found.`,
                  data: null
                });
              }
              req.body.role = dbRole._id;
            }
          } else if (!req.body.role) {
            return res.status(400).json({
              success: false,
              message: 'Role is required.',
              data: null
            });
          }

          if (req.body.roleName === 'CountryManager') {
            req.body.designationName = 'Country Manager';
          } else if (req.body.roleName === 'StateManager') {
            req.body.designationName = 'State Manager';
          } else if (req.body.roleName === 'CityManager') {
            req.body.designationName = 'City Manager';
          }

          if (!req.body.password) {
            req.body.password = DEFAULT_USER_PASSWORD;
          }

          const adminDirectCreate = isAdminUser(req.user);

          if (adminDirectCreate) {
            req.body.approval_status = 'Approved';
            req.body.is_verified = true;
            req.body.is_active = true;
            req.body.status = 'Active';
            req.body.onboarding_source = 'admin';

            const roleNameForGeo = req.body.roleName;
            if (['CountryManager', 'StateManager', 'CityManager'].includes(roleNameForGeo)) {
              try {
                const territory = await resolveOnboardingTerritory(roleNameForGeo, {
                  requested_country: assignedCountryId,
                  requested_state: assignedStateId,
                  requested_city: assignedCityId,
                  requested_country_name: req.body.country_name,
                  requested_state_name: req.body.state_name,
                  requested_city_name: req.body.city_name,
                  requested_country_iso: req.body.country_iso
                });
                if (territory.countryId) req.body.country = territory.countryId;
                if (territory.stateId) req.body.state = territory.stateId;
                if (territory.cityId) req.body.city = territory.cityId;
              } catch (geoError) {
                return res.status(400).json({ success: false, message: geoError.message, data: null });
              }
            }

            skipManagerAssignmentOnCreate = false;
          } else {
            const pendingPayload = await buildPendingUserPayload(req.body, {
              onboardingSource: 'admin',
              roleName: req.body.roleName
            });
            Object.assign(req.body, pendingPayload);
            skipManagerAssignmentOnCreate = true;
            pendingApprovalMessage = PENDING_APPROVAL_MESSAGE;
          }

          delete req.body.country_name;
          delete req.body.state_name;
          delete req.body.city_name;
          delete req.body.country_iso;
        }

        // If creating a User or Employee, check if we need to auto-link
        const doc = new Model(req.body);
        await doc.save();

        if (Model.modelName === 'User' && isAdminUser(req.user) && !doc.user_code) {
          const { generateUniqueUserCode } = await import('../utils/userCode.js');
          doc.user_code = await generateUniqueUserCode('USR');
          doc.employee_id = doc.user_code;
          await doc.save();
        }

        // Create a pending user application when a retailer is registered
        if (Model.modelName === 'Retailer') {
          try {
            const { buildPendingUserPayload, PENDING_APPROVAL_MESSAGE } = await import('../utils/pendingUserApplication.js');
            const RetailerRole = mongoose.model('Role');
            const UserModel = mongoose.model('User');
            const retailerRole = await RetailerRole.findOne({ name: 'Retailer' });

            const existingUser = await UserModel.findOne({
              $or: [
                { email: req.body.email },
                { mobile: req.body.mobile }
              ],
              is_deleted: { $ne: true }
            });

            if (existingUser) {
              return res.status(400).json({
                success: false,
                message: 'A user with this email or mobile already exists.',
                data: null
              });
            }

            if (retailerRole && req.body.email && req.body.mobile) {
              const pendingPayload = await buildPendingUserPayload(req.body, {
                onboardingSource: 'admin',
                roleName: 'Retailer'
              });

              const newUser = new UserModel({
                name: req.body.owner_name || req.body.business_name,
                email: req.body.email,
                mobile: req.body.mobile,
                password: DEFAULT_USER_PASSWORD,
                role: retailerRole._id,
                roleName: 'Retailer',
                designationName: 'Retailer',
                ...pendingPayload
              });
              await newUser.save();

              await mongoose.model('Retailer').findByIdAndUpdate(doc._id, { user: newUser._id });
              doc.user = newUser._id;
              pendingApprovalMessage = PENDING_APPROVAL_MESSAGE;
            }
          } catch (userCreateErr) {
            await Model.findByIdAndDelete(doc._id);
            return res.status(400).json({
              success: false,
              message: userCreateErr.message || 'Could not submit retailer application.',
              data: null
            });
          }
        }

        if (!skipManagerAssignmentOnCreate && Model.modelName === 'User' && req.body.roleName === 'CountryManager' && req.body.country) {
          const {
            assignCountryManager,
            validateCountryAvailable
          } = await import('../utils/managerAssignment.js');

          try {
            await validateCountryAvailable(req.body.country);
            await assignCountryManager(req.body.country, doc._id);
          } catch (assignmentError) {
            await Model.findByIdAndDelete(doc._id);
            return res.status(400).json({
              success: false,
              message: assignmentError.message,
              data: null,
              existing_manager_id: assignmentError.existingManagerId || null
            });
          }
        }

        if (!skipManagerAssignmentOnCreate && Model.modelName === 'User' && req.body.roleName === 'StateManager' && req.body.state) {
          const { assignStateManager } = await import('../utils/managerAssignment.js');
          try {
            await assignStateManager(req.body.state, doc._id);
          } catch (assignmentError) {
            await Model.findByIdAndDelete(doc._id);
            return res.status(400).json({ success: false, message: assignmentError.message, data: null });
          }
        }

        if (!skipManagerAssignmentOnCreate && Model.modelName === 'User' && req.body.roleName === 'CityManager' && req.body.city) {
          const { assignCityManager } = await import('../utils/managerAssignment.js');
          try {
            await assignCityManager(req.body.city, doc._id);
          } catch (assignmentError) {
            await Model.findByIdAndDelete(doc._id);
            return res.status(400).json({ success: false, message: assignmentError.message, data: null });
          }
        }

        // Populate created doc if populating was requested
        let responseData = doc;
        if (populateOptions.length > 0) {
          responseData = await Model.findById(doc._id);
          for (const option of populateOptions) {
            responseData = await responseData.populate(option);
          }
        }

        const createPayload = {
          success: true,
          message: `${Model.modelName} created successfully.`,
          data: responseData
        };
        if (Model.modelName === 'User') {
          createPayload.message = pendingApprovalMessage || `User created successfully. Default login password: ${DEFAULT_USER_PASSWORD}.`;
          if (!pendingApprovalMessage) {
            createPayload.default_password = DEFAULT_USER_PASSWORD;
          }
        }
        if (Model.modelName === 'Retailer' && pendingApprovalMessage) {
          createPayload.message = pendingApprovalMessage;
        }
        res.status(201).json(createPayload);
      } catch (error) {
        next(error);
      }
    },

    update: async (req, res, next) => {
      try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid record ID.',
            data: null
          });
        }

        const touchesManagerAssignment =
          req.body.manager !== undefined ||
          req.body.assigned_city_manager !== undefined;

        if (touchesManagerAssignment && !isAdminUser(req.user)) {
          return res.status(403).json({
            success: false,
            message: 'Only administrators can reassign managers or retailers.',
            data: null
          });
        }

        if (req.body.manager !== undefined) {
          const {
            assignCountryManager,
            assignStateManager,
            assignCityManager,
            unassignCountryManager,
            unassignStateManager,
            unassignCityManager
          } = await import('../utils/managerAssignment.js');

          try {
            let assignedData = null;
            const managerId = req.body.manager;

            if (Model.modelName === 'Country') {
              assignedData = managerId
                ? await assignCountryManager(id, managerId)
                : await unassignCountryManager(id);
            } else if (Model.modelName === 'State') {
              assignedData = managerId
                ? await assignStateManager(id, managerId)
                : await unassignStateManager(id);
            } else if (Model.modelName === 'City') {
              assignedData = managerId
                ? await assignCityManager(id, managerId)
                : await unassignCityManager(id);
            }

            if (assignedData) {
              let responseData = assignedData;
              if (populateOptions.length > 0) {
                for (const option of populateOptions) {
                  responseData = await responseData.populate(option);
                }
              }

              return res.status(200).json({
                success: true,
                message: `${Model.modelName} updated successfully.`,
                data: responseData
              });
            }
          } catch (assignmentError) {
            return res.status(400).json({
              success: false,
              message: assignmentError.message,
              data: null
            });
          }
        }

        let oldDoc = null;
        if (Model.modelName === 'User' || Model.modelName === 'Role') {
          oldDoc = await Model.findById(id);
        }

        if (Model.modelName === 'User' && req.body.roleName) {
          const { normalizeRoleName } = await import('../utils/roleUtils.js');
          req.body.roleName = normalizeRoleName(req.body.roleName);
        }

        const assignedCountryId = req.body.assigned_country_id || req.body.country_id || req.body.country || null;
        const assignedStateId = req.body.assigned_state_id || req.body.state_id || req.body.state || null;
        const assignedCityId = req.body.assigned_city_id || req.body.city_id || req.body.city || null;

        if (
          Model.modelName === 'User' &&
          (assignedCountryId || assignedStateId || assignedCityId) &&
          !isAdminUser(req.user)
        ) {
          const nextRoleName = req.body.roleName;
          if (nextRoleName && ['CountryManager', 'StateManager', 'CityManager'].includes(nextRoleName)) {
            return res.status(403).json({
              success: false,
              message: 'Only administrators can reassign manager territories.',
              data: null
            });
          }
          if (!nextRoleName && oldDoc && ['CountryManager', 'StateManager', 'CityManager'].includes(oldDoc.roleName)) {
            return res.status(403).json({
              success: false,
              message: 'Only administrators can reassign manager territories.',
              data: null
            });
          }
        }

        if (Model.modelName === 'User') {
          delete req.body.assigned_country_id;
          delete req.body.assigned_state_id;
          delete req.body.assigned_city_id;

          const nextRoleName = req.body.roleName || oldDoc?.roleName;
          if (nextRoleName === 'CountryManager') {
            req.body.designationName = 'Country Manager';
          } else if (nextRoleName === 'StateManager') {
            req.body.designationName = 'State Manager';
          } else if (nextRoleName === 'CityManager') {
            req.body.designationName = 'City Manager';
          }

          if (['CountryManager', 'StateManager', 'CityManager'].includes(nextRoleName)) {
            const { resolveOnboardingTerritory, hasTerritoryIntent } = await import('../utils/geoResolve.js');
            const territoryMeta = {
              requested_country: assignedCountryId,
              requested_state: assignedStateId,
              requested_city: assignedCityId,
              requested_country_name: req.body.country_name,
              requested_state_name: req.body.state_name,
              requested_city_name: req.body.city_name,
              requested_country_iso: req.body.country_iso
            };

            if (hasTerritoryIntent(nextRoleName, territoryMeta)) {
              try {
                const territory = await resolveOnboardingTerritory(nextRoleName, territoryMeta);
                if (territory.countryId) req.body.country = territory.countryId;
                if (territory.stateId) req.body.state = territory.stateId;
                if (territory.cityId) req.body.city = territory.cityId;
              } catch (geoError) {
                return res.status(400).json({ success: false, message: geoError.message, data: null });
              }
            }
          }

          delete req.body.country_name;
          delete req.body.state_name;
          delete req.body.city_name;
          delete req.body.country_iso;
        }

        const data = await Model.findByIdAndUpdate(
          id,
          { $set: req.body },
          { new: true, runValidators: true }
        );

        if (!data) {
          return res.status(404).json({
            success: false,
            message: `${Model.modelName} not found.`,
            data: null
          });
        }

        if (Model.modelName === 'User') {
          const effectiveRole = data.roleName || req.body.roleName || oldDoc?.roleName;
          const {
            assignCountryManager,
            assignStateManager,
            assignCityManager,
            validateCountryAvailable
          } = await import('../utils/managerAssignment.js');

          try {
            if (effectiveRole === 'CountryManager' && data.country) {
              await validateCountryAvailable(data.country, id);
              await assignCountryManager(data.country, id);
            } else if (effectiveRole === 'StateManager' && data.state) {
              await assignStateManager(data.state, id);
            } else if (effectiveRole === 'CityManager' && data.city) {
              await assignCityManager(data.city, id);
            }
          } catch (assignmentError) {
            return res.status(400).json({
              success: false,
              message: assignmentError.message,
              data: null,
              existing_manager_id: assignmentError.existingManagerId || null
            });
          }
        }

        // Audit logging for User/Role updates
        if (Model.modelName === 'User' && oldDoc) {
          // Check if role, status or is_active changed
          const roleChanged = String(oldDoc.role) !== String(data.role) || oldDoc.roleName !== data.roleName;
          const statusChanged = oldDoc.status !== data.status || oldDoc.is_active !== data.is_active;

          if (roleChanged || statusChanged) {
            const { logAuditEvent } = await import('../utils/auditLogger.js');
            if (roleChanged) {
              await logAuditEvent(
                req.user?._id,
                'role-update',
                'users',
                data._id,
                { role: oldDoc.role, roleName: oldDoc.roleName },
                { role: data.role, roleName: data.roleName },
                req
              );
            }
            if (statusChanged) {
              await logAuditEvent(
                req.user?._id,
                'status-update',
                'users',
                data._id,
                { status: oldDoc.status, is_active: oldDoc.is_active },
                { status: data.status, is_active: data.is_active },
                req
              );
            }
          }
        } else if (Model.modelName === 'Role' && oldDoc) {
          const { logAuditEvent } = await import('../utils/auditLogger.js');
          await logAuditEvent(
            req.user?._id,
            'role-definition-update',
            'roles',
            data._id,
            oldDoc.permissions,
            data.permissions,
            req
          );
        }

        // Populate updated doc
        let responseData = data;
        if (populateOptions.length > 0) {
          for (const option of populateOptions) {
            responseData = await responseData.populate(option);
          }
        }

        res.status(200).json({
          success: true,
          message: `${Model.modelName} updated successfully.`,
          data: responseData
        });
      } catch (error) {
        next(error);
      }
    },

    // 5. DELETE /api/v1/{module}/:id - Soft Delete
    delete: async (req, res, next) => {
      try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid record ID.',
            data: null
          });
        }

        // We perform a soft delete by marking is_deleted = true
        const data = await Model.findByIdAndUpdate(
          id,
          { $set: { is_deleted: true } },
          { new: true }
        );

        if (!data) {
          return res.status(404).json({
            success: false,
            message: `${Model.modelName} not found.`,
            data: null
          });
        }

        res.status(200).json({
          success: true,
          message: `${Model.modelName} soft-deleted successfully.`,
          data: null
        });
      } catch (error) {
        next(error);
      }
    }
  };
};
