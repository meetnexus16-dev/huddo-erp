import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Search } from 'lucide-react';

const DROPDOWN_MAX_HEIGHT = 192;
const DROPDOWN_GAP = 4;

const MANAGER_SLOT_ROLES = new Set([
  'CountryManager',
  'StateManager',
  'CityManager',
  'HierarchyState',
  'HierarchyCity',
  'HierarchyCountry'
]);

function SearchableWorldSelect({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  hint,
  warning,
  loadOptions
}) {
  const anchorRef = useRef(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);

  const updateMenuPosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - DROPDOWN_GAP;
    const spaceAbove = rect.top - DROPDOWN_GAP;
    const openUp = spaceBelow < 120 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(DROPDOWN_MAX_HEIGHT, Math.max(openUp ? spaceAbove : spaceBelow, 96));

    setMenuStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + DROPDOWN_GAP }
        : { top: rect.bottom + DROPDOWN_GAP }),
      maxHeight,
      zIndex: 9999
    });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const rows = await loadOptions(query);
        if (!cancelled) setOptions(rows);
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, query ? 200 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, query, loadOptions]);

  useEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return undefined;
    }
    updateMenuPosition();
    const handleReposition = () => updateMenuPosition();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [open, updateMenuPosition]);

  const displayValue = useMemo(() => value || '', [value]);

  return (
    <div className="relative">
      <label className="block text-sm font-semibold text-slate-700 mb-1">{label}</label>
      <div className="relative" ref={anchorRef}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          disabled={disabled}
          value={open ? query : displayValue}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setQuery(''); setOpen(true); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm disabled:bg-slate-100 disabled:text-slate-400"
        />
      </div>
      {hint && <p className="text-xs text-indigo-600 mt-1">{hint}</p>}
      {warning && <p className="text-xs text-amber-700 mt-1">{warning}</p>}
      {open && !disabled && menuStyle && createPortal(
        <div
          style={menuStyle}
          className="overflow-auto bg-white border border-slate-200 rounded-lg shadow-lg"
        >
          {loading && (
            <div className="px-3 py-2 text-sm text-slate-400 flex items-center gap-2">
              <Loader2 className="animate-spin" size={14} /> Searching...
            </div>
          )}
          {!loading && options.map((option) => (
            <button
              key={option.key}
              type="button"
              disabled={option.disabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (option.disabled) return;
                onChange(option);
                setQuery('');
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm border-b border-slate-50 last:border-0 ${
                option.disabled ? 'text-slate-400 bg-slate-50 cursor-not-allowed' : 'hover:bg-orange-50 text-slate-700'
              }`}
            >
              {option.label}
              {option.sublabel ? ` — ${option.sublabel}` : ''}
            </button>
          ))}
          {!loading && options.length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-400">No matches found</div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

function managerHint(level, name) {
  return name ? `${level} Manager: ${name}` : '';
}

async function fetchTerritoryManager(slotRole, params) {
  const query = new URLSearchParams({ role: slotRole, ...params });
  try {
    const res = await fetch(`/api/geo/manager-slot?${query.toString()}`);
    const json = await res.json();
    if (json.success && json.data?.manager_name) {
      return json.data.manager_name;
    }
  } catch {
    // ignore lookup errors
  }
  return '';
}

const EMPTY_VALUE = {
  country_name: '',
  state_name: '',
  city_name: '',
  country_iso: ''
};

async function fetchWorld(path) {
  const res = await fetch(path);
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Failed to load locations');
  return json.data || [];
}

function mapWorldRow(row) {
  return {
    key: row.name,
    label: row.name,
    name: row.name,
    iso2: row.iso2,
    disabled: !!row.disabled,
    sublabel: row.sublabel || null,
    manager_name: row.manager_name || null
  };
}

export default function GeoCascadeSelect({
  role = 'Retailer',
  value = EMPTY_VALUE,
  onChange,
  className = '',
  checkManagerSlots = true
}) {
  const [slotWarning, setSlotWarning] = useState({ country: '', state: '', city: '' });
  const [countryManagerName, setCountryManagerName] = useState('');
  const [stateManagerName, setStateManagerName] = useState('');
  const [cityManagerName, setCityManagerName] = useState('');

  const showCountry = ['StateManager', 'CityManager', 'Retailer', 'HierarchyState', 'HierarchyCity'].includes(role)
    || role === 'CountryManager'
    || role === 'HierarchyCountry';
  const showState = ['StateManager', 'CityManager', 'Retailer', 'HierarchyState', 'HierarchyCity'].includes(role);
  const showCity = ['CityManager', 'Retailer', 'HierarchyCity'].includes(role);

  const patch = (updates) => onChange({ ...value, ...updates });

  const checkSlot = async (level, params) => {
    if (!checkManagerSlots || !MANAGER_SLOT_ROLES.has(role)) return;
    const query = new URLSearchParams({ role, ...params });
    try {
      const res = await fetch(`/api/geo/manager-slot?${query.toString()}`);
      const json = await res.json();
      if (json.success && json.data.message) {
        setSlotWarning((prev) => ({ ...prev, [level]: json.data.message }));
      } else {
        setSlotWarning((prev) => ({ ...prev, [level]: '' }));
      }
    } catch {
      setSlotWarning((prev) => ({ ...prev, [level]: '' }));
    }
  };

  const loadCountries = React.useCallback(async (q) => {
    const rows = await fetchWorld(
      `/api/geo/world/countries?q=${encodeURIComponent(q)}&role=${encodeURIComponent(role)}`
    );
    return rows.map(mapWorldRow);
  }, [role]);

  const loadStates = React.useCallback(async (q) => {
    if (!value.country_name) return [];
    const rows = await fetchWorld(
      `/api/geo/world/states?country=${encodeURIComponent(value.country_name)}&q=${encodeURIComponent(q)}&role=${encodeURIComponent(role)}`
    );
    return rows.map(mapWorldRow);
  }, [value.country_name, role]);

  const loadCities = React.useCallback(async (q) => {
    if (!value.country_name || !value.state_name) return [];
    const rows = await fetchWorld(
      `/api/geo/world/cities?country=${encodeURIComponent(value.country_name)}&state=${encodeURIComponent(value.state_name)}&q=${encodeURIComponent(q)}&role=${encodeURIComponent(role)}`
    );
    return rows.map(mapWorldRow);
  }, [value.country_name, value.state_name, role]);

  useEffect(() => {
    if (!value.country_name) {
      setCountryManagerName('');
      return undefined;
    }
    let cancelled = false;
    fetchTerritoryManager('CountryManager', { country_name: value.country_name })
      .then((name) => { if (!cancelled) setCountryManagerName(name); })
      .catch(() => { if (!cancelled) setCountryManagerName(''); });
    return () => { cancelled = true; };
  }, [value.country_name]);

  useEffect(() => {
    if (!value.country_name || !value.state_name) {
      setStateManagerName('');
      return undefined;
    }
    let cancelled = false;
    fetchTerritoryManager('StateManager', {
      country_name: value.country_name,
      state_name: value.state_name
    })
      .then((name) => { if (!cancelled) setStateManagerName(name); })
      .catch(() => { if (!cancelled) setStateManagerName(''); });
    return () => { cancelled = true; };
  }, [value.country_name, value.state_name]);

  useEffect(() => {
    if (!value.country_name || !value.state_name || !value.city_name) {
      setCityManagerName('');
      return undefined;
    }
    let cancelled = false;
    fetchTerritoryManager('CityManager', {
      country_name: value.country_name,
      state_name: value.state_name,
      city_name: value.city_name
    })
      .then((name) => { if (!cancelled) setCityManagerName(name); })
      .catch(() => { if (!cancelled) setCityManagerName(''); });
    return () => { cancelled = true; };
  }, [value.country_name, value.state_name, value.city_name]);

  useEffect(() => {
    if (role === 'CountryManager' && value.country_name) {
      checkSlot('country', { country_name: value.country_name });
    }
    if (role === 'HierarchyCountry' && value.country_name) {
      checkSlot('country', { country_name: value.country_name });
    }
  }, [role, value.country_name]);

  useEffect(() => {
    if ((role === 'StateManager' || role === 'HierarchyState') && value.country_name && value.state_name) {
      checkSlot('state', { country_name: value.country_name, state_name: value.state_name });
    }
  }, [role, value.country_name, value.state_name]);

  useEffect(() => {
    if ((role === 'CityManager' || role === 'HierarchyCity') && value.country_name && value.state_name && value.city_name) {
      checkSlot('city', {
        country_name: value.country_name,
        state_name: value.state_name,
        city_name: value.city_name
      });
    }
  }, [role, value.country_name, value.state_name, value.city_name]);

  const countryHint = managerHint('Country', countryManagerName);
  const stateHint = managerHint('State', stateManagerName);
  const cityHint = managerHint('City', cityManagerName);

  const countryFieldHint = countryHint;
  const stateFieldHint = stateHint;
  const cityFieldHint = cityHint;

  return (
    <div className={`space-y-4 ${className}`}>
      {showCountry && (
        <SearchableWorldSelect
          label={`Country${showState || showCity || role === 'CountryManager' || role === 'HierarchyCountry' ? ' *' : ''}`}
          value={value.country_name}
          onChange={(option) => patch({
            country_name: option.name,
            country_iso: option.iso2 || '',
            state_name: '',
            city_name: ''
          })}
          placeholder="Search country worldwide..."
          warning={slotWarning.country}
          hint={countryFieldHint}
          loadOptions={loadCountries}
        />
      )}

      {showState && value.country_name && (
        <SearchableWorldSelect
          label="State / Province *"
          value={value.state_name}
          onChange={(option) => patch({ state_name: option.name, city_name: '' })}
          placeholder="Search state..."
          warning={slotWarning.state}
          hint={stateFieldHint}
          loadOptions={loadStates}
        />
      )}

      {showCity && value.state_name && (
        <SearchableWorldSelect
          label="City *"
          value={value.city_name}
          onChange={(option) => patch({ city_name: option.name })}
          placeholder="Search city..."
          warning={slotWarning.city}
          hint={cityFieldHint}
          loadOptions={loadCities}
        />
      )}
    </div>
  );
}
