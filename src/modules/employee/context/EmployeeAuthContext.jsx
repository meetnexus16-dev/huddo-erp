import React, { createContext, useState, useContext, useEffect } from 'react';
import { mockEmployees } from '../mockData/mockEmployee';

export const EmployeeAuthContext = createContext();

export function EmployeeAuthProvider({ children, initialRole = 'sales_executive', onRoleChange }) {
  // Try to load cached role, or default to initialRole
  const [activeRole, setActiveRoleState] = useState(() => {
    // Map human readable role names from App.jsx to match mock keys if necessary
    const cleaned = (initialRole || '').toLowerCase().replace(' ', '_');
    return mockEmployees[cleaned] ? cleaned : 'sales_executive';
  });

  const getDynamicUser = (roleKey) => {
    try {
      const raw = localStorage.getItem('huddo_user');
      if (raw) {
        const u = JSON.parse(raw);
        if (u && (u.name || u.email)) {
          return {
            id: u._id || u.id,
            name: u.name || 'Team Member',
            email: u.email || '',
            mobile: u.mobile || '',
            department: u.departmentName || u.department?.name || 'Sales',
            designation: u.designationName || u.designation?.title || 'Team Member',
            role: u.roleName || u.role?.name || 'Team Member',
            city: u.city?.name || u.city || 'Surat',
            state: u.state?.name || u.state || 'Gujarat',
            country: u.country?.name || u.country || 'India',
            avatar: u.profile_photo || null
          };
        }
      }
    } catch {}
    return mockEmployees[roleKey] || mockEmployees.team_member || mockEmployees.sales_executive;
  };

  const [currentEmployee, setCurrentEmployee] = useState(() => {
    return getDynamicUser(activeRole);
  });

  // Sync state if initialRole or localStorage user changes
  useEffect(() => {
    if (initialRole) {
      const cleaned = initialRole.toLowerCase().replace(' ', '_');
      if (cleaned !== activeRole) {
        setActiveRoleState(cleaned);
      }
      setCurrentEmployee(getDynamicUser(cleaned));
    }
  }, [initialRole]);

  const switchRole = (roleKey) => {
    if (mockEmployees[roleKey]) {
      setActiveRoleState(roleKey);
      setCurrentEmployee(mockEmployees[roleKey]);
      
      // Notify parent App.jsx if callback is provided
      if (onRoleChange) {
        // Map back to human readable role for App.jsx
        const labelMap = {
          sales_executive: "Sales Executive",
          sales_manager: "Sales Manager",
          hr_manager: "HR Manager",
          finance_manager: "Finance Manager",
          inventory_manager: "Inventory Manager",
          purchase_manager: "Purchase Manager",
          team_member: "Team Member"
        };
        onRoleChange(labelMap[roleKey] || roleKey);
      }
    }
  };

  return (
    <EmployeeAuthContext.Provider value={{ currentEmployee, activeRole, switchRole, setCurrentEmployee }}>
      {children}
    </EmployeeAuthContext.Provider>
  );
}

export function useEmployeeAuth() {
  const context = useContext(EmployeeAuthContext);
  return context || {};
}
