import { useEffect, useState } from 'react';
import Retailers from '../../state-manager/pages/Retailers';
import { fetchTerritoryRetailers } from './territoryTeamApi';

export default function ManagerRetailersView({ showToast, cityManagers = [] }) {
  const [retailers, setRetailers] = useState([]);
  const [territoryLabel, setTerritoryLabel] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchTerritoryRetailers()
      .then((data) => {
        setRetailers(data.retailers || []);
        setTerritoryLabel(data.territoryLabel || '');
      })
      .catch((err) => showToast?.(err.message || 'Failed to load retailers.', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Retailers
      retailers={retailers}
      cityManagers={cityManagers}
      orders={[]}
      onApproveRetailer={() => {}}
      onRejectRetailer={() => {}}
      showToast={showToast}
      territoryLabel={territoryLabel}
      loading={loading}
    />
  );
}
