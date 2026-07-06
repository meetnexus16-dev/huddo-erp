import { useEffect, useState } from 'react';
import CityManagers from '../../state-manager/pages/CityManagers';
import { fetchTerritoryCityManagers } from './territoryTeamApi';

export default function ManagerCityManagersView({ onNavigate, showToast, title = 'City Managers' }) {
  const [cityManagers, setCityManagers] = useState([]);
  const [territoryLabel, setTerritoryLabel] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchTerritoryCityManagers()
      .then((data) => {
        setCityManagers(data.cityManagers || []);
        setTerritoryLabel(data.territoryLabel || '');
      })
      .catch((err) => showToast?.(err.message || 'Failed to load city managers.', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <CityManagers
      cityManagers={cityManagers}
      retailers={[]}
      territoryLabel={territoryLabel}
      loading={loading}
      onRefresh={load}
      onNavigate={onNavigate}
      showToast={showToast}
      pageTitle={title}
    />
  );
}
