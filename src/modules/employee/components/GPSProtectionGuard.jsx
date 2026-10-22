import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapPin, MapPinOff, AlertTriangle, RefreshCw, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function GPSProtectionGuard({ children, isClockedIn = false, onLocationUpdate }) {
  const [gpsStatus, setGpsStatus] = useState('checking'); // 'checking' | 'active' | 'denied' | 'unavailable'
  const [coords, setCoords] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [retryLoading, setRetryLoading] = useState(false);
  const pingTimerRef = useRef(null);

  // Check and request GPS coordinates
  const verifyGPS = useCallback(async (isManualRetry = false) => {
    if (isManualRetry) setRetryLoading(true);

    if (!('geolocation' in navigator)) {
      setGpsStatus('unavailable');
      setErrorMessage('Geolocation is not supported by your browser or device.');
      setRetryLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        setGpsStatus('active');
        setErrorMessage('');
        setRetryLoading(false);
        onLocationUpdate?.({ lat: latitude, lng: longitude });

        // Ping backend if clocked in
        if (isClockedIn) {
          try {
            await fetch('/api/employee-self/gps-ping', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                lat: latitude,
                lng: longitude,
                battery_level: navigator.getBattery ? (await navigator.getBattery().catch(() => null))?.level : undefined
              })
            });
          } catch (err) {
            console.warn('GPS ping failed:', err);
          }
        }
      },
      (err) => {
        setRetryLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsStatus('denied');
          setErrorMessage('Location permission was denied. Please allow location access in your browser or device settings.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGpsStatus('unavailable');
          setErrorMessage('GPS position is currently unavailable. Please turn on your device GPS / Location services.');
        } else {
          setGpsStatus('unavailable');
          setErrorMessage(err.message || 'Unable to retrieve your current location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, [isClockedIn, onLocationUpdate]);

  // Initial verification on mount
  useEffect(() => {
    verifyGPS();

    // Listen to permission changes if supported
    if ('permissions' in navigator && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((permissionStatus) => {
        permissionStatus.onchange = () => {
          if (permissionStatus.state === 'granted') {
            verifyGPS();
          } else if (permissionStatus.state === 'denied') {
            setGpsStatus('denied');
          }
        };
      }).catch(() => {});
    }
  }, [verifyGPS]);

  // Setup periodic dynamic ping when clocked in
  useEffect(() => {
    if (!isClockedIn) {
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
      return;
    }

    let intervalMs = 5 * 60 * 1000; // default 5 minutes

    fetch('/api/employee-self/tracking-interval')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.intervalMinutes) {
          intervalMs = data.intervalMinutes * 60 * 1000;
        }
      })
      .catch(() => {})
      .finally(() => {
        if (pingTimerRef.current) clearInterval(pingTimerRef.current);
        pingTimerRef.current = setInterval(() => {
          verifyGPS();
        }, intervalMs);
      });

    return () => {
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
    };
  }, [isClockedIn, verifyGPS]);

  // If GPS is not active, render blocking barrier screen
  if (gpsStatus === 'denied' || gpsStatus === 'unavailable') {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center shadow-2xl border border-rose-100 animate-in fade-in zoom-in duration-200">
          <div className="w-16 h-16 rounded-full bg-rose-50 border-4 border-rose-100 flex items-center justify-center mx-auto mb-4 text-rose-600">
            <MapPinOff className="w-8 h-8" />
          </div>

          <h2 className="text-lg font-bold text-slate-900 font-display">
            Active GPS Location Required
          </h2>
          <p className="text-xs text-slate-600 font-medium mt-2 leading-relaxed">
            HUDDO ERP company policy requires continuous GPS location verification for Team Members on duty. 
            The portal is paused until location access is active.
          </p>

          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-left flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-rose-800 leading-snug">
              <span className="font-bold block mb-0.5">Device GPS Status:</span>
              {errorMessage || 'Location services are disabled or access was denied.'}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2.5">
            <button
              onClick={() => verifyGPS(true)}
              disabled={retryLoading}
              className="w-full py-2.5 px-4 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${retryLoading ? 'animate-spin' : ''}`} />
              <span>{retryLoading ? 'Verifying Location...' : 'Enable Location / Retry Now'}</span>
            </button>
            <p className="text-[10px] text-slate-400">
              Please ensure your device Location/GPS is turned ON and allow browser permission.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Active GPS status pill */}
      <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-1.5 flex items-center justify-between text-[11px] text-emerald-800">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-bold">GPS Location Active</span>
          {coords && (
            <span className="text-emerald-600 text-[10px] hidden sm:inline">
              ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)})
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Security Verified</span>
        </div>
      </div>

      {children}
    </>
  );
}
