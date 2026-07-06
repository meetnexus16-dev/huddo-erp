export async function fetchGeoCreationPreview(roleName, geo) {
  const res = await fetch('/api/geo/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roleName,
      country_name: geo.country_name,
      state_name: geo.state_name,
      city_name: geo.city_name
    })
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Could not preview territory.');
  return json.data;
}

export function formatGeoPreviewMessage(preview) {
  if (!preview?.requires_confirmation) return null;
  const lines = preview.will_create.map((item) => {
    const parent = item.parent ? ` (${item.parent})` : '';
    return `• ${item.type}: ${item.name}${parent}`;
  });
  return `The following location(s) will be added to the system:\n\n${lines.join('\n')}\n\nTerritory: ${preview.territory_label}`;
}

export async function confirmGeoCreation(preview, confirmFn) {
  if (!preview?.requires_confirmation) return true;
  if (!confirmFn) return false;
  return confirmFn({
    title: 'Create new territory?',
    message: formatGeoPreviewMessage(preview),
    confirmText: 'Continue'
  });
}
