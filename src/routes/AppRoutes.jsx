import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Toast } from '../components/Common';
import Login from '../components/Login';
import OnboardingForm from '../modules/OnboardingForm';
import { useAuth } from '../context/AuthContext';
import AdminApp from './AdminApp';
import { ROUTES } from './routePaths';
import { GuestOnly, RequireAdminWorkspace, RequireAuth, RequireWorkspace, RoleHomeRedirect } from './RouteGuards';
import {
  isCityManager,
  isCountryManager,
  isEmployeeRole,
  isPromoter,
  isRetailerOrDistributor,
  isStateManager
} from '../utils/roleRouting';

import RetailerModule from '../modules/retailer/RetailerModule';
import CountryManagerModule from '../modules/country-manager/CountryManagerModule';
import StateManagerModule from '../state-manager/StateManagerModule';
import CityManagerModule from '../city-manager/CityManagerModule';
import PromoterModule from '../modules/promoter/PromoterModule';
import EmployeeModule from '../modules/employee/EmployeeModule';

function LoginPage() {
  const { loginSuccess, toast, setToast } = useAuth();
  return (
    <>
      <Login onLoginSuccess={loginSuccess} />
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}

function AuthenticatedModule({ children }) {
  const { showToast, handleRoleChange, currentRole, toast, setToast } = useAuth();
  return (
    <>
      {React.cloneElement(children, {
        userRole: currentRole,
        showToast,
        onSwitchRole: handleRoleChange
      })}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path={`${ROUTES.ONBOARD}/*`} element={<OnboardingForm />} />
      <Route
        path={ROUTES.LOGIN}
        element={(
          <GuestOnly>
            <LoginPage />
          </GuestOnly>
        )}
      />
      <Route
        path={ROUTES.HOME}
        element={(
          <RequireAuth>
            <RoleHomeRedirect />
          </RequireAuth>
        )}
      />
      <Route
        path={`${ROUTES.ADMIN}/*`}
        element={(
          <RequireAuth>
            <RequireAdminWorkspace>
              <AdminApp />
            </RequireAdminWorkspace>
          </RequireAuth>
        )}
      />
      <Route
        path={`${ROUTES.COUNTRY_MANAGER}/*`}
        element={(
          <RequireAuth>
            <RequireWorkspace matchRole={isCountryManager}>
              <AuthenticatedModule>
                <CountryManagerModule />
              </AuthenticatedModule>
            </RequireWorkspace>
          </RequireAuth>
        )}
      />
      <Route
        path={`${ROUTES.STATE_MANAGER}/*`}
        element={(
          <RequireAuth>
            <RequireWorkspace matchRole={isStateManager}>
              <AuthenticatedModule>
                <StateManagerModule />
              </AuthenticatedModule>
            </RequireWorkspace>
          </RequireAuth>
        )}
      />
      <Route
        path={`${ROUTES.CITY_MANAGER}/*`}
        element={(
          <RequireAuth>
            <RequireWorkspace matchRole={isCityManager}>
              <AuthenticatedModule>
                <CityManagerModule />
              </AuthenticatedModule>
            </RequireWorkspace>
          </RequireAuth>
        )}
      />
      <Route
        path={`${ROUTES.PROMOTER}/*`}
        element={(
          <RequireAuth>
            <RequireWorkspace matchRole={isPromoter}>
              <AuthenticatedModule>
                <PromoterModule />
              </AuthenticatedModule>
            </RequireWorkspace>
          </RequireAuth>
        )}
      />
      <Route
        path={`${ROUTES.RETAILER}/*`}
        element={(
          <RequireAuth>
            <RequireWorkspace matchRole={isRetailerOrDistributor}>
              <AuthenticatedModule>
                <RetailerModule />
              </AuthenticatedModule>
            </RequireWorkspace>
          </RequireAuth>
        )}
      />
      <Route
        path={`${ROUTES.EMPLOYEE}/*`}
        element={(
          <RequireAuth>
            <RequireWorkspace matchRole={isEmployeeRole}>
              <AuthenticatedModule>
                <EmployeeModule />
              </AuthenticatedModule>
            </RequireWorkspace>
          </RequireAuth>
        )}
      />
      <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
    </Routes>
  );
}
