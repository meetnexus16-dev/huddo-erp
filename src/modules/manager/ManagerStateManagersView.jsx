import { useEffect, useState } from 'react';
import { DataTable } from '../../components/Common';
import { RefreshCw } from 'lucide-react';
import { fetchTerritoryStateManagers } from './territoryTeamApi';

export default function ManagerStateManagersView({ showToast }) {
  const [stateManagers, setStateManagers] = useState([]);
  const [territoryLabel, setTerritoryLabel] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchTerritoryStateManagers()
      .then((data) => {
        setStateManagers(data.stateManagers || []);
        setTerritoryLabel(data.territoryLabel || '');
      })
      .catch((err) => showToast?.(err.message || 'Failed to load state managers.', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const columns = [
    { header: 'Name', accessor: 'name', render: (v) => <span className="font-bold text-slate-800">{v}</span> },
    { header: 'State', accessor: 'assigned_state' },
    { header: 'Mobile', accessor: 'mobile' },
    { header: 'Email', accessor: 'email' },
    { header: 'Retailers', accessor: 'performance', render: (v) => v?.retailers ?? 0 },
    { header: 'Orders (Month)', accessor: 'performance', render: (v) => v?.orders ?? 0 },
    {
      header: 'Revenue (Month)',
      accessor: 'performance',
      render: (v) => `₹${Number(v?.revenue || 0).toLocaleString('en-IN')}`
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (v) => (
        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700">{v}</span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-800 uppercase tracking-wider">
            State Managers{territoryLabel ? ` — ${territoryLabel}` : ''}
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">State managers assigned under your country territory.</p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <DataTable
        columns={columns}
        data={stateManagers}
        searchKeys={['name', 'assigned_state', 'email', 'mobile']}
        emptyStateText={loading ? 'Loading...' : 'No state managers assigned in your territory yet.'}
      />
    </div>
  );
}
