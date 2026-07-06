// PROMO-MODULE: Mock API simulation for all Promoter routes (/api/promoters/*)
// Persists mock data in localStorage to enable a 100% working, stateful frontend demonstration.

// Helper to interact with Local Storage
const getOrSetLocal = (key, defaultVal) => {
  const existing = localStorage.getItem(key);
  if (existing) {
    try {
      return JSON.parse(existing);
    } catch (e) {
      console.error("Error parsing local storage key", key, e);
    }
  }
  localStorage.setItem(key, JSON.stringify(defaultVal));
  return defaultVal;
};

// Seed initial promoters
const defaultPromoters = [
  {
    id: 1,
    user_id: 201,
    promoter_code: "PRO-2026-001",
    full_name: "Suresh Raina",
    mobile_number: "9876543210",
    email: "suresh@raina.com",
    address: "Bandra West, Mumbai",
    profile_photo_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    aadhaar_number: "1111-2222-3333",
    pan_number: "ABCDE1234E",
    gst_number: "27AAAAA1111A1Z1",
    bank_account_number: "1234567890",
    bank_ifsc: "HDFC0000001",
    bank_name: "HDFC Bank",
    bank_account_holder: "Suresh Raina",
    allocated_country_id: 1,
    allocated_state_id: 1,
    allocated_city_id: 1,
    allocated_country_name: "India",
    allocated_state_name: "Maharashtra",
    allocated_city_name: "Mumbai",
    royalty_percentage: 5.00,
    payment_status: "Unpaid",
    status: "Active",
    verification_status: "Verified",
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    user_id: 202,
    promoter_code: "PRO-2026-002",
    full_name: "Harbhajan Singh",
    mobile_number: "8765432109",
    email: "harbhajan@singh.com",
    address: "Jalandhar, Punjab",
    profile_photo_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
    aadhaar_number: "4444-5555-6666",
    pan_number: "FGHIJ5678K",
    gst_number: "07BBBBB2222B2Z2",
    bank_account_number: "9876543210",
    bank_ifsc: "ICIC0000002",
    bank_name: "ICICI Bank",
    bank_account_holder: "Harbhajan Singh",
    allocated_country_id: 1,
    allocated_state_id: 2,
    allocated_city_id: 2,
    allocated_country_name: "India",
    allocated_state_name: "Delhi",
    allocated_city_name: "New Delhi",
    royalty_percentage: 5.00,
    payment_status: "Paid",
    status: "Active",
    verification_status: "Verified",
    created_at: new Date().toISOString()
  }
];

const defaultMappings = [
  { id: 1, promoter_id: 1, retailer_id: "RET001", retailer_name: "Walk Easy Footwear", retailer_city: "Mumbai", retailer_state: "Maharashtra", mapped_at: new Date().toISOString(), is_active: 1 },
  { id: 2, promoter_id: 2, retailer_id: "RET002", retailer_name: "Lakhani Shoe Emporium", retailer_city: "New Delhi", retailer_state: "Delhi", mapped_at: new Date().toISOString(), is_active: 1 },
  { id: 3, promoter_id: 1, retailer_id: "RET005", retailer_name: "Apex Sole Distributors", retailer_city: "Pune", retailer_state: "Maharashtra", mapped_at: new Date().toISOString(), is_active: 1 }
];

const defaultRoyaltyConfigs = [
  { id: 1, promoter_id: 1, config_type: "Global", product_id: null, product_name: null, retailer_id: null, retailer_name: null, royalty_percentage: 5.00, is_active: 1 },
  { id: 2, promoter_id: 2, config_type: "Global", product_id: null, product_name: null, retailer_id: null, retailer_name: null, royalty_percentage: 5.00, is_active: 1 }
];

const defaultRoyaltyEarnings = [
  { id: 1, promoter_id: 1, retailer_id: "RET001", order_id: "ORD-9281", invoice_id: 1, product_id: null, product_name: "All products", billing_amount: 85000, royalty_percentage: 5.00, royalty_amount: 4250, period_month: 6, period_year: 2026, status: "Pending", created_at: new Date().toISOString() },
  { id: 2, promoter_id: 2, retailer_id: "RET002", order_id: "ORD-8712", invoice_id: 2, product_id: null, product_name: "All products", billing_amount: 124000, royalty_percentage: 5.00, royalty_amount: 6200, period_month: 6, period_year: 2026, status: "Paid", paid_at: new Date().toISOString(), payment_reference: "TXN-ROY-1002", created_at: new Date().toISOString() }
];

const defaultRoyaltySettlements = [
  { id: 1, promoter_id: 1, settlement_period: "2026-06", period_month: 6, period_year: 2026, total_billings: 85000, total_royalty_earned: 4250, total_royalty_paid: 0, outstanding_royalty: 4250, settlement_status: "Pending", generated_at: new Date().toISOString() },
  { id: 2, promoter_id: 2, settlement_period: "2026-06", period_month: 6, period_year: 2026, total_billings: 124000, total_royalty_earned: 6200, total_royalty_paid: 6200, outstanding_royalty: 0, settlement_status: "Settled", settled_at: new Date().toISOString(), payment_reference: "TXN-ROY-1002", payment_mode: "NEFT", remarks: "June payout settled", generated_at: new Date().toISOString() }
];

const defaultRevenueTracking = [
  { id: 1, promoter_id: 1, retailer_id: "RET001", retailer_name: "Walk Easy Footwear", retailer_city: "Mumbai", invoice_id: 1, invoice_number: "INV-2026-001", invoice_date: "2026-06-01", invoice_amount: 85000, gst_amount: 12960, total_amount: 97960, payment_status: "Paid", period_month: 6, period_year: 2026, synced_at: new Date().toISOString() },
  { id: 2, promoter_id: 2, retailer_id: "RET002", retailer_name: "Lakhani Shoe Emporium", retailer_city: "New Delhi", invoice_id: 2, invoice_number: "INV-2026-002", invoice_date: "2026-06-03", invoice_amount: 124000, gst_amount: 18915, total_amount: 142915, payment_status: "Paid", period_month: 6, period_year: 2026, synced_at: new Date().toISOString() }
];

const defaultPerformanceSnapshots = [
  { id: 1, promoter_id: 1, period_label: "2026-06", period_month: 6, period_year: 2026, total_retailers_added: 2, total_active_retailers: 2, total_revenue_generated: 85000, total_royalty_earned: 4250, total_royalty_paid: 0, pending_royalty: 4250, computed_at: new Date().toISOString() },
  { id: 2, promoter_id: 2, period_label: "2026-06", period_month: 6, period_year: 2026, total_retailers_added: 1, total_active_retailers: 1, total_revenue_generated: 124000, total_royalty_earned: 6200, total_royalty_paid: 6200, pending_royalty: 0, computed_at: new Date().toISOString() }
];

const defaultPromoterNotifications = [
  { id: 1, promoter_id: 1, type: "Retailer_Mapped", title: "New Retailer Assigned", message: "Apex Sole Distributors has been mapped to your profile.", reference_id: 3, reference_type: "mapping", is_read: 0, priority: "Normal", created_at: new Date().toISOString() },
  { id: 2, promoter_id: 1, type: "Royalty_Calculated", title: "June Royalty Accrued", message: "Your royalty earnings of ₹4,250 have been calculated for June 2026.", reference_id: 1, reference_type: "earnings", is_read: 0, priority: "High", created_at: new Date().toISOString() }
];

// Initialize Collections in LocalStorage
let promoters = getOrSetLocal('huddo_promoters', defaultPromoters);
let mappings = getOrSetLocal('huddo_promoter_retailer_mappings', defaultMappings);
let royaltyConfigs = getOrSetLocal('huddo_promoter_royalty_config', defaultRoyaltyConfigs);
let royaltyEarnings = getOrSetLocal('huddo_promoter_royalty_earnings', defaultRoyaltyEarnings);
let royaltySettlements = getOrSetLocal('huddo_promoter_royalty_settlements', defaultRoyaltySettlements);
let revenueTracking = getOrSetLocal('huddo_promoter_revenue_tracking', defaultRevenueTracking);
let performanceSnapshots = getOrSetLocal('huddo_promoter_performance_snapshots', defaultPerformanceSnapshots);
let notifications = getOrSetLocal('huddo_promoter_notifications', defaultPromoterNotifications);
let documents = getOrSetLocal('huddo_promoter_documents', []);
let reportsLog = getOrSetLocal('huddo_promoter_reports_log', []);

// Sync retailer assigned_promoter_id column
let localRetailers = JSON.parse(localStorage.getItem('huddo_retailers') || '[]');
if (localRetailers.length > 0 && !localRetailers[0].hasOwnProperty('assigned_promoter_id')) {
  localRetailers = localRetailers.map(r => {
    if (r.promoter === "Suresh Raina") r.assigned_promoter_id = 1;
    else if (r.promoter === "Harbhajan Singh") r.assigned_promoter_id = 2;
    else r.assigned_promoter_id = null;
    return r;
  });
  localStorage.setItem('huddo_retailers', JSON.stringify(localRetailers));
}

// PROMO-MODULE: Helper to strip allocated geographic fields
function stripGeographicFields(promoter) {
  if (!promoter) return promoter;
  const copy = { ...promoter };
  delete copy.allocated_country_id;
  delete copy.allocated_state_id;
  delete copy.allocated_city_id;
  delete copy.allocated_country_name;
  delete copy.allocated_state_name;
  delete copy.allocated_city_name;
  return copy;
}

// PROMO-MODULE: Main Interceptor Handler called in mockApi.fetch
export async function handlePromoterApi(pathname, method, body, params) {
  // reload state from local storage on each request
  promoters = JSON.parse(localStorage.getItem('huddo_promoters') || '[]');
  mappings = JSON.parse(localStorage.getItem('huddo_promoter_retailer_mappings') || '[]');
  royaltyConfigs = JSON.parse(localStorage.getItem('huddo_promoter_royalty_config') || '[]');
  royaltyEarnings = JSON.parse(localStorage.getItem('huddo_promoter_royalty_earnings') || '[]');
  royaltySettlements = JSON.parse(localStorage.getItem('huddo_promoter_royalty_settlements') || '[]');
  revenueTracking = JSON.parse(localStorage.getItem('huddo_promoter_revenue_tracking') || '[]');
  performanceSnapshots = JSON.parse(localStorage.getItem('huddo_promoter_performance_snapshots') || '[]');
  notifications = JSON.parse(localStorage.getItem('huddo_promoter_notifications') || '[]');
  documents = JSON.parse(localStorage.getItem('huddo_promoter_documents') || '[]');
  reportsLog = JSON.parse(localStorage.getItem('huddo_promoter_reports_log') || '[]');
  localRetailers = JSON.parse(localStorage.getItem('huddo_retailers') || '[]');

  // Helper to save state
  const saveAll = () => {
    localStorage.setItem('huddo_promoters', JSON.stringify(promoters));
    localStorage.setItem('huddo_promoter_retailer_mappings', JSON.stringify(mappings));
    localStorage.setItem('huddo_promoter_royalty_config', JSON.stringify(royaltyConfigs));
    localStorage.setItem('huddo_promoter_royalty_earnings', JSON.stringify(royaltyEarnings));
    localStorage.setItem('huddo_promoter_royalty_settlements', JSON.stringify(royaltySettlements));
    localStorage.setItem('huddo_promoter_revenue_tracking', JSON.stringify(revenueTracking));
    localStorage.setItem('huddo_promoter_performance_snapshots', JSON.stringify(performanceSnapshots));
    localStorage.setItem('huddo_promoter_notifications', JSON.stringify(notifications));
    localStorage.setItem('huddo_promoter_documents', JSON.stringify(documents));
    localStorage.setItem('huddo_promoter_reports_log', JSON.stringify(reportsLog));
    localStorage.setItem('huddo_retailers', JSON.stringify(localRetailers));
  };

  const jsonResponse = (data, status = 200) => {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  };

  // 1. POST /api/promoters/register
  if (pathname === '/api/promoters/register' && method === 'POST') {
    const pId = promoters.length > 0 ? Math.max(...promoters.map(p => p.id)) + 1 : 1;
    const year = new Date().getFullYear();
    const pSeq = String(pId).padStart(3, '0');
    const pCode = `PRO-${year}-${pSeq}`;

    const newPromoter = {
      id: pId,
      user_id: pId + 200,
      promoter_code: pCode,
      full_name: body.full_name,
      mobile_number: body.mobile_number,
      email: body.email || null,
      address: body.address || null,
      profile_photo_url: body.profile_photo_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      aadhaar_number: body.aadhaar_number || null,
      pan_number: body.pan_number || null,
      gst_number: body.gst_number || null,
      bank_account_number: body.bank_account_number || null,
      bank_ifsc: body.bank_ifsc || null,
      bank_name: body.bank_name || null,
      bank_account_holder: body.bank_account_holder || null,
      allocated_country_id: body.allocated_country_id || null,
      allocated_state_id: body.allocated_state_id || null,
      allocated_city_id: body.allocated_city_id || null,
      allocated_country_name: body.allocated_country_name || null,
      allocated_state_name: body.allocated_state_name || null,
      allocated_city_name: body.allocated_city_name || null,
      royalty_percentage: Number(body.royalty_percentage || 5.00),
      payment_status: 'Unpaid',
      status: 'Active',
      verification_status: 'Pending',
      created_by: 1, // System/Admin
      created_at: new Date().toISOString()
    };

    // Validate unique mobile number
    if (promoters.some(p => p.mobile_number === body.mobile_number)) {
      return jsonResponse({ error: "Mobile number already registered." }, 400);
    }

    promoters.push(newPromoter);

    // Create default global config
    royaltyConfigs.push({
      id: royaltyConfigs.length + 1,
      promoter_id: pId,
      config_type: "Global",
      product_id: null,
      product_name: null,
      retailer_id: null,
      retailer_name: null,
      royalty_percentage: Number(body.royalty_percentage || 5.00),
      is_active: 1
    });

    // Create snapshot for current month
    const curYear = new Date().getFullYear();
    const curMonth = new Date().getMonth() + 1;
    const curPeriod = `${curYear}-${String(curMonth).padStart(2, '0')}`;
    performanceSnapshots.push({
      id: performanceSnapshots.length + 1,
      promoter_id: pId,
      period_label: curPeriod,
      period_month: curMonth,
      period_year: curYear,
      total_retailers_added: 0,
      total_active_retailers: 0,
      total_revenue_generated: 0.00,
      total_royalty_earned: 0.00,
      total_royalty_paid: 0.00,
      pending_royalty: 0.00,
      computed_at: new Date().toISOString()
    });

    // Send Welcome notification
    notifications.push({
      id: notifications.length + 1,
      promoter_id: pId,
      type: "System",
      title: "Welcome to Huddo Shoes!",
      message: `Welcome ${newPromoter.full_name}, your promoter registration is currently pending verification.`,
      reference_id: pId,
      reference_type: "promoter",
      is_read: 0,
      priority: "Normal",
      created_at: new Date().toISOString()
    });

    saveAll();
    return jsonResponse({ promoter_id: pId, promoter_code: pCode, message: "Welcome notification sent." }, 201);
  }

  // 2. GET /api/promoters
  if (pathname === '/api/promoters' && method === 'GET') {
    // Return list of promoters - NEVER include geographic fields (strip them)
    let filtered = [...promoters];
    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(p => 
        p.full_name.toLowerCase().includes(q) || 
        p.promoter_code.toLowerCase().includes(q) || 
        p.mobile_number.includes(q) || 
        (p.email && p.email.toLowerCase().includes(q))
      );
    }
    if (params.status && params.status !== 'All') {
      filtered = filtered.filter(p => p.status === params.status);
    }
    if (params.payment_status && params.payment_status !== 'All') {
      filtered = filtered.filter(p => p.payment_status === params.payment_status);
    }
    if (params.verification && params.verification !== 'All') {
      filtered = filtered.filter(p => p.verification_status === params.verification);
    }

    // Pagination
    const page = Number(params.page || 1);
    const limit = Number(params.limit || 10);
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    // Enrich rows for response (total_retailers_mapped, current_month_revenue, total_royalty_earned, pending_royalty)
    const enriched = paginated.map(p => {
      const pId = p.id;
      const mappedCount = mappings.filter(m => m.promoter_id === pId && m.is_active === 1).length;
      
      const curYear = new Date().getFullYear();
      const curMonth = new Date().getMonth() + 1;
      const curPeriod = `${curYear}-${String(curMonth).padStart(2, '0')}`;
      
      const perf = performanceSnapshots.find(s => s.promoter_id === pId && s.period_label === curPeriod) || {
        total_revenue_generated: 0,
        total_royalty_earned: 0,
        pending_royalty: 0
      };

      const earningsSum = royaltyEarnings.filter(e => e.promoter_id === pId && e.status !== 'Cancelled');
      const totalEarned = earningsSum.reduce((sum, e) => sum + e.royalty_amount, 0);
      const totalPending = earningsSum.filter(e => e.status === 'Pending').reduce((sum, e) => sum + e.royalty_amount, 0);

      return {
        promoter_id: p.id,
        promoter_code: p.promoter_code,
        full_name: p.full_name,
        mobile_number: p.mobile_number,
        email: p.email,
        status: p.status,
        payment_status: p.payment_status,
        verification_status: p.verification_status,
        total_retailers_mapped: mappedCount,
        current_month_revenue: perf.total_revenue_generated,
        total_royalty_earned: totalEarned,
        pending_royalty: totalPending,
        created_at: p.created_at
      };
    });

    return jsonResponse({
      data: enriched,
      pagination: {
        total: filtered.length,
        page,
        limit
      }
    });
  }

  // 3. GET /api/promoters/analytics
  if (pathname === '/api/promoters/analytics' && method === 'GET') {
    const total_promoters = promoters.length;
    const active_promoters = promoters.filter(p => p.status === 'Active').length;
    const verified_promoters = promoters.filter(p => p.verification_status === 'Verified').length;
    const pending_verification = promoters.filter(p => p.verification_status === 'Pending').length;
    const total_retailers_mapped = mappings.filter(m => m.is_active === 1).length;

    const allEarnings = royaltyEarnings.filter(e => e.status !== 'Cancelled');
    const total_revenue_generated = revenueTracking.reduce((sum, r) => sum + r.invoice_amount, 0);
    const total_royalty_earned = allEarnings.reduce((sum, e) => sum + e.royalty_amount, 0);
    const total_royalty_pending = allEarnings.filter(e => e.status === 'Pending').reduce((sum, e) => sum + e.royalty_amount, 0);

    const paidCount = promoters.filter(p => p.payment_status === 'Paid').length;
    const unpaidCount = promoters.filter(p => p.payment_status === 'Unpaid').length;
    const partialCount = promoters.filter(p => p.payment_status === 'Partial').length;

    // top performers: rank promoters by all-time revenue
    const performers = promoters.map(p => {
      const pRev = revenueTracking.filter(r => r.promoter_id === p.id).reduce((sum, r) => sum + r.invoice_amount, 0);
      const pEarned = royaltyEarnings.filter(e => e.promoter_id === p.id && e.status !== 'Cancelled').reduce((sum, e) => sum + e.royalty_amount, 0);
      const pPaid = royaltyEarnings.filter(e => e.promoter_id === p.id && e.status === 'Paid').reduce((sum, e) => sum + e.royalty_amount, 0);
      const pMapped = mappings.filter(m => m.promoter_id === p.id && m.is_active === 1).length;
      return {
        promoter_id: p.id,
        promoter_code: p.promoter_code,
        full_name: p.full_name,
        retailers: pMapped,
        revenue: pRev,
        royalty_earned: pEarned,
        royalty_paid: pPaid,
        status: p.status
      };
    }).sort((a, b) => b.revenue - a.revenue);

    // monthly trend
    const monthly_new_promoters = [
      { month: 'Jan', count: 0 }, { month: 'Feb', count: 0 }, { month: 'Mar', count: 0 },
      { month: 'Apr', count: 0 }, { month: 'May', count: 0 }, { month: 'Jun', count: promoters.length }
    ];

    // City distribution
    const cityGroups = {};
    for (const track of revenueTracking) {
      const cityKey = `${track.retailer_city}|${track.retailer_state || ''}`;
      if (!cityGroups[cityKey]) {
        cityGroups[cityKey] = {
          city: track.retailer_city,
          state: track.retailer_state || '',
          promoter_ids: new Set(),
          retailers: 0,
          revenue: 0
        };
      }
      cityGroups[cityKey].revenue += track.invoice_amount;
    }
    for (const mapping of mappings.filter(m => m.is_active === 1)) {
      const cityKey = `${mapping.retailer_city}|${mapping.retailer_state || ''}`;
      if (!cityGroups[cityKey]) {
        cityGroups[cityKey] = {
          city: mapping.retailer_city,
          state: mapping.retailer_state || '',
          promoter_ids: new Set(),
          retailers: 0,
          revenue: 0
        };
      }
      cityGroups[cityKey].retailers += 1;
      cityGroups[cityKey].promoter_ids.add(mapping.promoter_id);
    }
    const city_wise_distribution = Object.values(cityGroups).map(group => ({
      city: group.city,
      state: group.state,
      promoter_count: group.promoter_ids.size,
      retailers: group.retailers,
      revenue: group.revenue
    })).sort((a, b) => b.revenue - a.revenue);

    return jsonResponse({
      total_promoters,
      active_promoters,
      verified_promoters,
      pending_verification,
      total_retailers_mapped,
      total_revenue_generated,
      total_royalty_earned,
      total_royalty_pending,
      payment_status_breakdown: { Paid: paidCount, Unpaid: unpaidCount, Partial: partialCount },
      top_performers: performers,
      monthly_new_promoters,
      city_wise_distribution
    });
  }

  // 4. GET /api/promoters/reports/all-promoters
  if (pathname === '/api/promoters/reports/all-promoters' && method === 'GET') {
    const summary = promoters.map(p => {
      const mappedCount = mappings.filter(m => m.promoter_id === p.id && m.is_active === 1).length;
      const rev = revenueTracking.filter(r => r.promoter_id === p.id).reduce((sum, r) => sum + r.invoice_amount, 0);
      const earned = royaltyEarnings.filter(e => e.promoter_id === p.id && e.status !== 'Cancelled').reduce((sum, e) => sum + e.royalty_amount, 0);
      const paid = royaltyEarnings.filter(e => e.promoter_id === p.id && e.status === 'Paid').reduce((sum, e) => sum + e.royalty_amount, 0);
      const pending = earned - paid;
      return {
        promoter_code: p.promoter_code,
        name: p.full_name,
        retailers_mapped: mappedCount,
        revenue_generated: rev,
        royalty_earned: earned,
        royalty_paid: paid,
        royalty_pending: pending,
        payment_status: p.payment_status
      };
    });
    
    const grand_total = {
      revenue: summary.reduce((sum, s) => sum + s.revenue_generated, 0),
      royalty_earned: summary.reduce((sum, s) => sum + s.royalty_earned, 0),
      royalty_paid: summary.reduce((sum, s) => sum + s.royalty_paid, 0)
    };

    return jsonResponse({
      promoter_wise_summary: summary,
      grand_total,
      download_url: "https://mock-storage.huddoerp.in/reports/all-promoters.csv"
    });
  }

  // Dynamic endpoints:
  // Match detail routes
  const idMatch = pathname.match(/^\/api\/promoters\/([^/]+)$/);
  if (idMatch) {
    const pId = Number(idMatch[1]);
    const promoterIndex = promoters.findIndex(p => p.id === pId);
    if (promoterIndex === -1) {
      return jsonResponse({ error: "Promoter not found" }, 404);
    }
    const promoter = promoters[promoterIndex];

    if (method === 'GET') {
      // PROMO-MODULE: Strip geographic fields from response
      return jsonResponse(stripGeographicFields(promoter));
    }

    if (method === 'PUT') {
      // PROMO-MODULE: Update updatable fields, store geographic data, return stripped response
      const updated = {
        ...promoter,
        ...body,
        royalty_percentage: Number(body.royalty_percentage !== undefined ? body.royalty_percentage : promoter.royalty_percentage)
      };
      promoters[promoterIndex] = updated;
      saveAll();
      return jsonResponse({ updated: true, promoter: stripGeographicFields(updated) });
    }

    if (method === 'DELETE') {
      // PROMO-MODULE: Soft delete
      promoters[promoterIndex].deleted_at = new Date().toISOString();
      promoters[promoterIndex].status = 'Inactive';
      // Unmap all retailers mapped to this promoter
      mappings = mappings.map(m => {
        if (m.promoter_id === pId && m.is_active === 1) {
          return { ...m, is_active: 0, unmapped_at: new Date().toISOString(), unmapped_reason: "Promoter soft deleted" };
        }
        return m;
      });
      // UPDATE retailers assigned_promoter_id = NULL
      localRetailers = localRetailers.map(r => {
        if (r.assigned_promoter_id === pId) {
          return { ...r, assigned_promoter_id: null, promoter: "None" };
        }
        return r;
      });
      saveAll();
      return jsonResponse({ deleted: true });
    }
  }

  // Match /api/promoters/:id/verify
  const verifyMatch = pathname.match(/^\/api\/promoters\/([^/]+)\/verify$/);
  if (verifyMatch && method === 'POST') {
    const pId = Number(verifyMatch[1]);
    const pIdx = promoters.findIndex(p => p.id === pId);
    if (pIdx !== -1) {
      const { action, remarks } = body;
      promoters[pIdx].verification_status = action === 'Verified' ? 'Verified' : 'Rejected';
      if (action === 'Verified') {
        promoters[pIdx].status = 'Active';
      }
      notifications.push({
        id: notifications.length + 1,
        promoter_id: pId,
        type: "System",
        title: `Verification Result: ${action}`,
        message: `Your profile verification status is now ${action}. Remarks: ${remarks || 'None'}`,
        reference_id: pId,
        reference_type: "verification",
        is_read: 0,
        priority: "High",
        created_at: new Date().toISOString()
      });
      saveAll();
      return jsonResponse({ verification_status: promoters[pIdx].verification_status, message: "Verification processed." });
    }
  }

  // Match /api/promoters/:id/upload-documents
  const uploadDocMatch = pathname.match(/^\/api\/promoters\/([^/]+)\/upload-documents$/);
  if (uploadDocMatch && method === 'POST') {
    const pId = Number(uploadDocMatch[1]);
    const { document_type, document_url } = body; // in mock we receive file details in JSON
    const newDoc = {
      id: documents.length + 1,
      promoter_id: pId,
      document_type: document_type || "Aadhaar",
      document_url: document_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400",
      uploaded_at: new Date().toISOString()
    };
    documents.push(newDoc);
    saveAll();
    return jsonResponse({ document_id: newDoc.id, document_url: newDoc.document_url });
  }

  // Match /api/promoters/:id/documents
  const getDocMatch = pathname.match(/^\/api\/promoters\/([^/]+)\/documents$/);
  if (getDocMatch && method === 'GET') {
    const pId = Number(getDocMatch[1]);
    const docs = documents.filter(d => d.promoter_id === pId);
    return jsonResponse(docs);
  }

  // Match /api/promoters/:id/retailers/map
  const mapMatch = pathname.match(/^\/api\/promoters\/([^/]+)\/retailers\/map$/);
  if (mapMatch && method === 'POST') {
    const pId = Number(mapMatch[1]);
    const { retailer_id } = body;

    const promoter = promoters.find(p => p.id === pId);
    if (!promoter) return jsonResponse({ error: "Promoter not found" }, 404);

    const retailerIndex = localRetailers.findIndex(r => r.id === retailer_id);
    if (retailerIndex === -1) return jsonResponse({ error: "Retailer not found in database" }, 404);

    const retailer = localRetailers[retailerIndex];

    // Check if retailer is already actively mapped
    const activeMapping = mappings.find(m => m.retailer_id === retailer_id && m.is_active === 1);
    if (activeMapping) {
      const mappedPromoter = promoters.find(p => p.id === activeMapping.promoter_id);
      const name = mappedPromoter ? mappedPromoter.full_name : "another promoter";
      return jsonResponse({ error: `Retailer already mapped to ${name}` }, 400);
    }

    // Create mapping
    const newMap = {
      id: mappings.length + 1,
      promoter_id: pId,
      retailer_id,
      retailer_name: retailer.shopName,
      retailer_city: retailer.city,
      retailer_state: retailer.state,
      mapped_at: new Date().toISOString(),
      mapped_by: 1, // System
      is_active: 1
    };
    mappings.push(newMap);

    // Update retailer assigned_promoter_id and promoter name
    localRetailers[retailerIndex].assigned_promoter_id = pId;
    localRetailers[retailerIndex].promoter = promoter.full_name;

    // Send notification to promoter
    notifications.push({
      id: notifications.length + 1,
      promoter_id: pId,
      type: "Retailer_Mapped",
      title: "New Retailer Mapped",
      message: `Retailer ${retailer.shopName} (${retailer.city}) has been mapped to you.`,
      reference_id: newMap.id,
      reference_type: "mapping",
      is_read: 0,
      priority: "Normal",
      created_at: new Date().toISOString()
    });

    // Update performance snapshots
    const curYear = new Date().getFullYear();
    const curMonth = new Date().getMonth() + 1;
    const curPeriod = `${curYear}-${String(curMonth).padStart(2, '0')}`;
    const snapIndex = performanceSnapshots.findIndex(s => s.promoter_id === pId && s.period_label === curPeriod);
    if (snapIndex !== -1) {
      performanceSnapshots[snapIndex].total_retailers_added += 1;
      performanceSnapshots[snapIndex].total_active_retailers += 1;
    }

    saveAll();
    return jsonResponse({ mapping_id: newMap.id, retailer_name: retailer.shopName, message: "Retailer mapped successfully." }, 201);
  }

  // Match /api/promoters/:id/retailers
  const getMappedMatch = pathname.match(/^\/api\/promoters\/([^/]+)\/retailers$/);
  if (getMappedMatch && method === 'GET') {
    const pId = Number(getMappedMatch[1]);
    const list = mappings.filter(m => m.promoter_id === pId);
    
    // Enrich mapped retailers with data from retailers table + orders table
    const ordersList = JSON.parse(localStorage.getItem('huddo_orders') || '[]');

    const mapped = list.map(m => {
      const r = localRetailers.find(ret => ret.id === m.retailer_id) || {};
      const rOrders = ordersList.filter(o => o.retailerName.toLowerCase() === m.retailer_name.toLowerCase());
      const revenue = rOrders.reduce((sum, o) => sum + o.amount, 0);
      const dates = rOrders.map(o => new Date(o.date).getTime());
      const lastOrderDate = dates.length > 0 ? new Date(Math.max(...dates)).toISOString().slice(0, 10) : 'None';

      return {
        mapping_id: m.id,
        retailer_id: m.retailer_id,
        retailer_name: m.retailer_name,
        owner_name: r.owner || "N/A",
        mobile: r.mobile || "N/A",
        category: r.category || "Standard",
        city: m.retailer_city,
        state: m.retailer_state,
        mapped_at: m.mapped_at,
        is_active: m.is_active,
        monthly_revenue: revenue,
        total_orders: rOrders.length,
        last_order_date: lastOrderDate
      };
    });

    const activeCount = mapped.filter(m => m.is_active === 1).length;

    return jsonResponse({
      mapped_retailers: mapped,
      total_mapped: mapped.length,
      total_active: activeCount
    });
  }

  // Match /api/promoters/:id/retailers/:retailer_id/unmap
  const unmapMatch = pathname.match(/^\/api\/promoters\/([^/]+)\/retailers\/([^/]+)\/unmap$/);
  if (unmapMatch && method === 'DELETE') {
    const pId = Number(unmapMatch[1]);
    const retailer_id = unmapMatch[2];
    const { reason } = body || {};

    const mapIdx = mappings.findIndex(m => m.promoter_id === pId && m.retailer_id === retailer_id && m.is_active === 1);
    if (mapIdx !== -1) {
      mappings[mapIdx].is_active = 0;
      mappings[mapIdx].unmapped_at = new Date().toISOString();
      mappings[mapIdx].unmapped_reason = reason || "Unmapped by admin";
    }

    // UPDATE retailers assigned_promoter_id = NULL
    const retIdx = localRetailers.findIndex(r => r.id === retailer_id);
    if (retIdx !== -1) {
      localRetailers[retIdx].assigned_promoter_id = null;
      localRetailers[retIdx].promoter = "None";
    }

    // Send unmap notification
    notifications.push({
      id: notifications.length + 1,
      promoter_id: pId,
      type: "System",
      title: "Retailer Mappings Updated",
      message: `Retailer ${localRetailers[retIdx]?.shopName || retailer_id} has been unmapped from your account.`,
      reference_id: pId,
      reference_type: "unmap",
      is_read: 0,
      priority: "Normal",
      created_at: new Date().toISOString()
    });

    saveAll();
    return jsonResponse({ unmapped: true });
  }

  // Match /api/promoters/:id/revenue
  const revMatch = pathname.match(/^\/api\/promoters\/([^/]+)\/revenue$/);
  if (revMatch && method === 'GET') {
    const pId = Number(revMatch[1]);
    const list = revenueTracking.filter(r => r.promoter_id === pId);
    
    const sumInvoiced = list.reduce((sum, r) => sum + r.invoice_amount, 0);
    const sumPaid = list.filter(r => r.payment_status === 'Paid').reduce((sum, r) => sum + r.invoice_amount, 0);
    const sumOutstanding = sumInvoiced - sumPaid;
    const sumGst = list.reduce((sum, r) => sum + (r.gst_amount || 0), 0);

    return jsonResponse({
      revenue_list: list,
      summary: {
        total_invoiced: sumInvoiced,
        total_paid: sumPaid,
        total_outstanding: sumOutstanding,
        total_gst: sumGst
      }
    });
  }

  // Match /api/promoters/:id/revenue/summary
  const revSumMatch = pathname.match(/^\/api\/promoters\/([^/]+)\/revenue\/summary$/);
  if (revSumMatch && method === 'GET') {
    const pId = Number(revSumMatch[1]);
    const list = revenueTracking.filter(r => r.promoter_id === pId);
    const ordersList = JSON.parse(localStorage.getItem('huddo_orders') || '[]');

    const curMonthVal = new Date().getMonth() + 1;
    const curYearVal = new Date().getFullYear();
    const prevMonthVal = curMonthVal === 1 ? 12 : curMonthVal - 1;
    const prevYearVal = curMonthVal === 1 ? curYearVal - 1 : curYearVal;

    const curInvs = list.filter(i => i.period_month === curMonthVal && i.period_year === curYearVal);
    const prevInvs = list.filter(i => i.period_month === prevMonthVal && i.period_year === prevYearVal);

    const curRev = curInvs.reduce((sum, i) => sum + i.invoice_amount, 0);
    const prevRev = prevInvs.reduce((sum, i) => sum + i.invoice_amount, 0);

    const curMapped = mappings.filter(m => m.promoter_id === pId && m.is_active === 1).map(m => m.retailer_name.toLowerCase());
    const curOrdersCount = ordersList.filter(o => curMapped.includes(o.retailerName.toLowerCase()) && new Date(o.date).getMonth() + 1 === curMonthVal).length;
    const prevOrdersCount = ordersList.filter(o => curMapped.includes(o.retailerName.toLowerCase()) && new Date(o.date).getMonth() + 1 === prevMonthVal).length;

    const growth = prevRev > 0 ? ((curRev - prevRev) / prevRev) * 100 : 0;

    // Monthly trends (12 months)
    const monthly_trend = [
      { month: 'Jan', revenue: 0, orders: 0, retailers: 0 },
      { month: 'Feb', revenue: 0, orders: 0, retailers: 0 },
      { month: 'Mar', revenue: 0, orders: 0, retailers: 0 },
      { month: 'Apr', revenue: 0, orders: 0, retailers: 0 },
      { month: 'May', revenue: 0, orders: 0, retailers: 0 },
      { month: 'Jun', revenue: list.reduce((sum, r) => sum + r.invoice_amount, 0), orders: curOrdersCount, retailers: curMapped.length }
    ];

    // top 10 retailers
    const by_retailer = list.map(r => ({
      retailer_name: r.retailer_name,
      revenue: r.invoice_amount,
      orders: ordersList.filter(o => o.retailerName.toLowerCase() === r.retailer_name.toLowerCase()).length
    })).slice(0, 10);

    return jsonResponse({
      current_month: { revenue: curRev, orders: curOrdersCount, retailers: curMapped.length },
      previous_month: { revenue: prevRev, orders: prevOrdersCount, retailers: curMapped.length },
      growth_pct: Math.round(growth * 100) / 100,
      monthly_trend,
      quarterly_trend: [{ quarter: 'Q2', revenue: curRev + prevRev }],
      by_retailer,
      by_product_category: [{ category: 'Sports Shoes', revenue: curRev }]
    });
  }

  // Match /api/promoters/:id/revenue/sync
  const revSyncMatch = pathname.match(/^\/api\/promoters\/([^/]+)\/revenue\/sync$/);
  if (revSyncMatch && method === 'POST') {
    const pId = Number(revSyncMatch[1]);
    const invoicesList = JSON.parse(localStorage.getItem('huddo_invoices') || '[]');
    const mappedRetailers = mappings.filter(m => m.promoter_id === pId && m.is_active === 1);
    const shopNames = mappedRetailers.map(m => m.retailer_name.toLowerCase());

    const pInvoices = invoicesList.filter(inv => shopNames.includes(inv.shopName.toLowerCase()));
    
    let count = 0;
    pInvoices.forEach(inv => {
      const mapping = mappedRetailers.find(m => m.retailer_name.toLowerCase() === inv.shopName.toLowerCase());
      const exists = revenueTracking.some(r => r.invoice_number === inv.id);
      if (!exists && mapping) {
        const invDate = new Date(inv.date);
        revenueTracking.push({
          id: revenueTracking.length + 1,
          promoter_id: pId,
          retailer_id: mapping.retailer_id,
          retailer_name: mapping.retailer_name,
          retailer_city: mapping.retailer_city,
          invoice_id: Math.floor(1000 + Math.random() * 9000),
          invoice_number: inv.id,
          invoice_date: inv.date,
          invoice_amount: inv.amount,
          gst_amount: inv.tax,
          total_amount: inv.total,
          payment_status: inv.status,
          period_month: invDate.getMonth() + 1,
          period_year: invDate.getFullYear(),
          synced_at: new Date().toISOString()
        });
        count++;
      }
    });

    // Update snapshots
    const curYear = new Date().getFullYear();
    const curMonth = new Date().getMonth() + 1;
    const curPeriod = `${curYear}-${String(curMonth).padStart(2, '0')}`;
    const snapIdx = performanceSnapshots.findIndex(s => s.promoter_id === pId && s.period_label === curPeriod);
    if (snapIdx !== -1) {
      const pIdRevenue = revenueTracking.filter(r => r.promoter_id === pId && r.period_month === curMonth && r.period_year === curYear);
      performanceSnapshots[snapIdx].total_revenue_generated = pIdRevenue.reduce((sum, r) => sum + r.invoice_amount, 0);
    }

    saveAll();
    return jsonResponse({ synced: count, message: `Synced ${count} invoice records successfully.` });
  }

  // Match /api/promoters/:id/royalty/config
  const royConfigMatch = pathname.match(/^\/api\/promoters\/([^/]+)\/royalty\/config$/);
  if (royConfigMatch) {
    const pId = Number(royConfigMatch[1]);
    if (method === 'GET') {
      const globalConf = royaltyConfigs.find(c => c.promoter_id === pId && c.config_type === 'Global' && c.is_active === 1) || { royalty_percentage: 5.00 };
      const products = royaltyConfigs.filter(c => c.promoter_id === pId && c.config_type === 'Product' && c.is_active === 1);
      const retailers = royaltyConfigs.filter(c => c.promoter_id === pId && c.config_type === 'Retailer' && c.is_active === 1);
      return jsonResponse({
        global_config: globalConf,
        product_configs: products,
        retailer_configs: retailers
      });
    }

    if (method === 'POST') {
      const { config_type, product_id, product_name, retailer_id, retailer_name, royalty_percentage, effective_from, effective_to } = body;
      
      // Deactivate existing configs of the same type/entity
      royaltyConfigs = royaltyConfigs.map(c => {
        if (c.promoter_id === pId && c.config_type === config_type && c.is_active === 1) {
          if (config_type === 'Product' && c.product_id === product_id) return { ...c, is_active: 0 };
          if (config_type === 'Retailer' && c.retailer_id === retailer_id) return { ...c, is_active: 0 };
          if (config_type === 'Global') return { ...c, is_active: 0 };
        }
        return c;
      });

      const newOverride = {
        id: royaltyConfigs.length + 1,
        promoter_id: pId,
        config_type,
        product_id: product_id || null,
        product_name: product_name || null,
        retailer_id: retailer_id || null,
        retailer_name: retailer_name || null,
        royalty_percentage: Number(royalty_percentage),
        effective_from: effective_from || null,
        effective_to: effective_to || null,
        is_active: 1
      };
      royaltyConfigs.push(newOverride);
      saveAll();
      return jsonResponse({ config_id: newOverride.id, message: "Royalty override created." }, 201);
    }
  }

  // Match override details
  const royOverrideDetailMatch = pathname.match(/^\/api\/promoters\/([^/]+)\/royalty\/config\/([^/]+)$/);
  if (royOverrideDetailMatch) {
    const pId = Number(royOverrideDetailMatch[1]);
    const config_id = Number(royOverrideDetailMatch[2]);
    const confIdx = royaltyConfigs.findIndex(c => c.id === config_id);

    if (method === 'PUT' && confIdx !== -1) {
      royaltyConfigs[confIdx] = {
        ...royaltyConfigs[confIdx],
        royalty_percentage: Number(body.royalty_percentage),
        effective_from: body.effective_from || royaltyConfigs[confIdx].effective_from,
        effective_to: body.effective_to || royaltyConfigs[confIdx].effective_to
      };
      saveAll();
      return jsonResponse({ updated: true });
    }

    if (method === 'DELETE' && confIdx !== -1) {
      royaltyConfigs[confIdx].is_active = 0;
      saveAll();
      return jsonResponse({ deactivated: true });
    }
  }

  // Match /api/promoters/:id/royalty/calculate
  const calcRoyMatch = pathname.match(/^\/api\/promoters\/([^/]+)\/royalty\/calculate$/);
  if (calcRoyMatch && method === 'POST') {
    const pId = Number(calcRoyMatch[1]);
    const { period_month, period_year } = body;

    const promoter = promoters.find(p => p.id === pId);
    if (!promoter) return jsonResponse({ error: "Promoter not found" }, 404);

    const invoicesList = JSON.parse(localStorage.getItem('huddo_invoices') || '[]');
    const mappedRetailers = mappings.filter(m => m.promoter_id === pId && m.is_active === 1);
    const shopNames = mappedRetailers.map(m => m.retailer_name.toLowerCase());

    const pInvoices = invoicesList.filter(inv => {
      const invDate = new Date(inv.date);
      return shopNames.includes(inv.shopName.toLowerCase()) && 
             (invDate.getMonth() + 1) === Number(period_month) && 
             invDate.getFullYear() === Number(period_year);
    });

    let earningsCount = 0;
    let billingSum = 0;
    let royaltySum = 0;

    pInvoices.forEach(inv => {
      const mapping = mappedRetailers.find(m => m.retailer_name.toLowerCase() === inv.shopName.toLowerCase());
      const alreadyEarned = royaltyEarnings.some(e => e.invoice_id === inv.id || (typeof e.invoice_id === 'string' && e.invoice_id === inv.id));
      
      if (!alreadyEarned && mapping) {
        // PROMO-MODULE: Calculate applicable royalty
        // Precedence: Retailer Config Override -> Product Config Override -> Global Config Override -> Promoter Base Rate
        const retConfig = royaltyConfigs.find(c => c.promoter_id === pId && c.config_type === 'Retailer' && c.retailer_id === mapping.retailer_id && c.is_active === 1);
        
        let applicableRate = promoter.royalty_percentage || 5.00;
        let configId = null;

        if (retConfig) {
          applicableRate = retConfig.royalty_percentage;
          configId = retConfig.id;
        } else {
          const globConfig = royaltyConfigs.find(c => c.promoter_id === pId && c.config_type === 'Global' && c.is_active === 1);
          if (globConfig) {
            applicableRate = globConfig.royalty_percentage;
            configId = globConfig.id;
          }
        }

        const royaltyAmt = (inv.amount * applicableRate) / 100;

        royaltyEarnings.push({
          id: royaltyEarnings.length + 1,
          promoter_id: pId,
          retailer_id: mapping.retailer_id,
          order_id: null,
          invoice_id: inv.id,
          product_id: null,
          product_name: "All products",
          royalty_config_id: configId,
          billing_amount: inv.amount,
          royalty_percentage: applicableRate,
          royalty_amount: royaltyAmt,
          period_month: Number(period_month),
          period_year: Number(period_year),
          status: 'Pending',
          created_at: new Date().toISOString()
        });

        billingSum += inv.amount;
        royaltySum += royaltyAmt;
        earningsCount++;
      }
    });

    // Upsert settlement record
    const periodLabel = `${period_year}-${String(period_month).padStart(2, '0')}`;
    let settlementId = null;
    const existingSettlement = royaltySettlements.find(s => s.promoter_id === pId && s.settlement_period === periodLabel);
    
    if (existingSettlement) {
      existingSettlement.total_billings += billingSum;
      existingSettlement.total_royalty_earned += royaltySum;
      existingSettlement.outstanding_royalty += royaltySum;
      settlementId = existingSettlement.id;
    } else if (billingSum > 0) {
      const sId = royaltySettlements.length + 1;
      royaltySettlements.push({
        id: sId,
        promoter_id: pId,
        settlement_period: periodLabel,
        period_month: Number(period_month),
        period_year: Number(period_year),
        total_billings: billingSum,
        total_royalty_earned: royaltySum,
        total_royalty_paid: 0,
        outstanding_royalty: royaltySum,
        settlement_status: 'Pending',
        generated_at: new Date().toISOString()
      });
      settlementId = sId;
    }

    // Send calculation notification
    if (earningsCount > 0) {
      notifications.push({
        id: notifications.length + 1,
        promoter_id: pId,
        type: "Royalty_Calculated",
        title: "Royalty Accrued",
        message: `Royalty calculations generated for ${periodLabel}. Earned ₹${royaltySum.toLocaleString('en-IN')}`,
        reference_id: settlementId,
        reference_type: "settlement",
        is_read: 0,
        priority: "High",
        created_at: new Date().toISOString()
      });

      // Update snapshots
      const snapIdx = performanceSnapshots.findIndex(s => s.promoter_id === pId && s.period_label === periodLabel);
      if (snapIdx !== -1) {
        performanceSnapshots[snapIdx].total_royalty_earned += royaltySum;
        performanceSnapshots[snapIdx].pending_royalty += royaltySum;
      }
    }

    saveAll();
    return jsonResponse({
      earnings_created: earningsCount,
      total_billing_amount: billingSum,
      total_royalty_amount: royaltySum,
      settlement_id: settlementId
    });
  }

  // Match /api/promoters/:id/royalty/earnings
  const getRoyEarningsMatch = pathname.match(/^\/api\/promoters\/([^/]+)\/royalty\/earnings$/);
  if (getRoyEarningsMatch && method === 'GET') {
    const pId = Number(getRoyEarningsMatch[1]);
    let list = royaltyEarnings.filter(e => e.promoter_id === pId);

    if (params.month) {
      list = list.filter(e => e.period_month === Number(params.month));
    }
    if (params.year) {
      list = list.filter(e => e.period_year === Number(params.year));
    }
    if (params.status) {
      list = list.filter(e => e.status === params.status);
    }

    const totalEarned = list.filter(e => e.status !== 'Cancelled').reduce((sum, e) => sum + e.royalty_amount, 0);
    const totalPaid = list.filter(e => e.status === 'Paid').reduce((sum, e) => sum + e.royalty_amount, 0);
    const totalPending = list.filter(e => e.status === 'Pending').reduce((sum, e) => sum + e.royalty_amount, 0);
    const totalCancelled = list.filter(e => e.status === 'Cancelled').reduce((sum, e) => sum + e.royalty_amount, 0);

    const enriched = list.map(e => {
      const mapping = mappings.find(m => m.retailer_id === e.retailer_id) || {};
      return {
        earnings_id: e.id,
        retailer_name: mapping.retailer_name || "Unknown Retailer",
        invoice_number: e.invoice_id || "N/A",
        billing_amount: e.billing_amount,
        royalty_percentage: e.royalty_percentage,
        royalty_amount: e.royalty_amount,
        period_month: e.period_month,
        period_year: e.period_year,
        status: e.status,
        paid_at: e.paid_at
      };
    });

    return jsonResponse({
      earnings: enriched,
      summary: {
        total_earned: totalEarned,
        total_paid: totalPaid,
        total_pending: totalPending,
        total_cancelled: totalCancelled
      }
    });
  }

  // Match /api/promoters/:id/royalty/settlements
  const getRoySettlementsMatch = pathname.match(/^\/api\/promoters\/([^/]+)\/royalty\/settlements$/);
  if (getRoySettlementsMatch && method === 'GET') {
    const pId = Number(getRoySettlementsMatch[1]);
    let list = royaltySettlements.filter(s => s.promoter_id === pId);

    if (params.year) {
      list = list.filter(s => s.period_year === Number(params.year));
    }
    if (params.status) {
      list = list.filter(s => s.settlement_status === params.status);
    }

    const allEarnings = royaltyEarnings.filter(e => e.promoter_id === pId && e.status !== 'Cancelled');
    const totalEarned = allEarnings.reduce((sum, e) => sum + e.royalty_amount, 0);
    const totalPaid = allEarnings.filter(e => e.status === 'Paid').reduce((sum, e) => sum + e.royalty_amount, 0);
    const totalPending = totalEarned - totalPaid;

    return jsonResponse({
      settlements: list,
      summary: {
        total_earned_all_time: totalEarned,
        total_paid_all_time: totalPaid,
        total_pending_all_time: totalPending
      }
    });
  }

  // Match pay settlement
  const paySettlementMatch = pathname.match(/^\/api\/promoters\/([^/]+)\/royalty\/settlements\/([^/]+)\/pay$/);
  if (paySettlementMatch && method === 'POST') {
    const pId = Number(paySettlementMatch[1]);
    const settlement_id = Number(paySettlementMatch[2]);
    const { amount_paid, payment_mode, payment_reference, payment_date, remarks } = body;

    const promoterIdx = promoters.findIndex(p => p.id === pId);
    if (promoterIdx === -1) return jsonResponse({ error: "Promoter not found" }, 404);

    const setIdx = royaltySettlements.findIndex(s => s.id === settlement_id);
    if (setIdx === -1) return jsonResponse({ error: "Settlement record not found" }, 404);

    const settlement = royaltySettlements[setIdx];

    if (Number(amount_paid) > settlement.outstanding_royalty) {
      return jsonResponse({ error: "Payment amount exceeds outstanding balance" }, 400);
    }

    // Update settlement figures
    royaltySettlements[setIdx].total_royalty_paid += Number(amount_paid);
    royaltySettlements[setIdx].outstanding_royalty -= Number(amount_paid);
    royaltySettlements[setIdx].settled_at = new Date().toISOString();
    royaltySettlements[setIdx].payment_reference = payment_reference;
    royaltySettlements[setIdx].payment_mode = payment_mode;
    royaltySettlements[setIdx].remarks = remarks;
    royaltySettlements[setIdx].settlement_status = royaltySettlements[setIdx].outstanding_royalty === 0 ? 'Settled' : 'Partial';

    // Update individual earnings status for this period
    royaltyEarnings = royaltyEarnings.map(e => {
      if (e.promoter_id === pId && e.period_month === settlement.period_month && e.period_year === settlement.period_year) {
        if (royaltySettlements[setIdx].settlement_status === 'Settled') {
          return { ...e, status: 'Paid', paid_at: new Date().toISOString(), payment_reference };
        } else {
          return { ...e, status: 'Paid', paid_at: new Date().toISOString(), payment_reference }; // simple mock handles all as Paid
        }
      }
      return e;
    });

    // PROMO-MODULE: Update promoter overall payment status derivation
    // Recalculate based on settlements outstanding checks
    const pSettlements = royaltySettlements.filter(s => s.promoter_id === pId);
    let derivedStatus = 'Paid';
    if (pSettlements.some(s => s.settlement_status === 'Partial')) {
      derivedStatus = 'Partial';
    } else if (pSettlements.some(s => s.settlement_status === 'Pending') || pSettlements.length === 0) {
      derivedStatus = 'Unpaid';
    }
    promoters[promoterIdx].payment_status = derivedStatus;

    // Send Payment Success notification
    notifications.push({
      id: notifications.length + 1,
      promoter_id: pId,
      type: "Royalty_Paid",
      title: "Royalty Disbursed",
      message: `Payer references transaction ${payment_reference}. Sum of ₹${Number(amount_paid).toLocaleString('en-IN')} has been paid.`,
      reference_id: settlement_id,
      reference_type: "payment",
      is_read: 0,
      priority: "High",
      created_at: new Date().toISOString()
    });

    // Update performance snapshots
    const snapIdx = performanceSnapshots.findIndex(s => s.promoter_id === pId && s.period_label === settlement.settlement_period);
    if (snapIdx !== -1) {
      performanceSnapshots[snapIdx].total_royalty_paid += Number(amount_paid);
      performanceSnapshots[snapIdx].pending_royalty = royaltySettlements[setIdx].outstanding_royalty;
    }

    saveAll();
    return jsonResponse({
      settlement_status: royaltySettlements[setIdx].settlement_status,
      outstanding_royalty: royaltySettlements[setIdx].outstanding_royalty,
      payment_status: derivedStatus,
      message: "Royalty payout registered."
    });
  }

  // Match /api/promoters/:id/royalty/settlements/generate
  const sGenMatch = pathname.match(/^\/api\/promoters\/([^/]+)\/royalty\/settlements\/generate$/);
  if (sGenMatch && method === 'POST') {
    const pId = Number(sGenMatch[1]);
    const { period_month, period_year } = body;
    const periodLabel = `${period_year}-${String(period_month).padStart(2, '0')}`;

    // 1. Run calculation
    const calcResponse = await handlePromoterApi(`/api/promoters/${pId}/royalty/calculate`, 'POST', body, params);
    
    // 2. Generate report log entry
    const logId = reportsLog.length + 1;
    reportsLog.push({
      id: logId,
      promoter_id: pId,
      report_type: "Royalty Settlement Invoice",
      filters_applied: JSON.stringify({ periodLabel }),
      generated_at: new Date().toISOString(),
      file_url: `https://mock-storage.huddoerp.in/reports/settlement-${periodLabel}.pdf`
    });

    // Fetch newly created settlement
    const settlement = royaltySettlements.find(s => s.promoter_id === pId && s.settlement_period === periodLabel) || { id: 1 };

    notifications.push({
      id: notifications.length + 1,
      promoter_id: pId,
      type: "Settlement_Generated",
      title: `Monthly Settlement Generated`,
      message: `Periodic statement details are now available for period ${periodLabel}.`,
      reference_id: settlement.id,
      reference_type: "settlement",
      is_read: 0,
      priority: "Normal",
      created_at: new Date().toISOString()
    });

    saveAll();
    return jsonResponse({ settlement_id: settlement.id, pdf_url: `https://mock-storage.huddoerp.in/reports/settlement-${periodLabel}.pdf` });
  }

  // Match /api/promoters/:id/dashboard
  const dashMatch = pathname.match(/^\/api\/promoters\/([^/]+)\/dashboard$/);
  if (dashMatch && method === 'GET') {
    const pId = Number(dashMatch[1]);
    const promoter = promoters.find(p => p.id === pId);
    if (!promoter) return jsonResponse({ error: "Promoter not found" }, 404);

    const mapped = mappings.filter(m => m.promoter_id === pId && m.is_active === 1);
    const revItems = revenueTracking.filter(r => r.promoter_id === pId);
    
    const totalRevenue = revItems.reduce((sum, r) => sum + r.invoice_amount, 0);
    const totalEarned = royaltyEarnings.filter(e => e.promoter_id === pId && e.status !== 'Cancelled').reduce((sum, e) => sum + e.royalty_amount, 0);
    const totalPaid = royaltyEarnings.filter(e => e.promoter_id === pId && e.status === 'Paid').reduce((sum, e) => sum + e.royalty_amount, 0);
    const totalPending = totalEarned - totalPaid;

    const curMonth = new Date().getMonth() + 1;
    const curYear = new Date().getFullYear();
    const periodLabel = `${curYear}-${String(curMonth).padStart(2, '0')}`;
    const snap = performanceSnapshots.find(s => s.promoter_id === pId && s.period_label === periodLabel) || {
      total_retailers_added: 0,
      total_revenue_generated: 0,
      total_royalty_earned: 0,
      total_royalty_paid: 0,
      pending_royalty: 0
    };

    // monthly trend (last 6 months)
    const monthly_trend = [
      { month: 'Jan', retailers_added: 0, revenue: 0, royalty_earned: 0, royalty_paid: 0 },
      { month: 'Feb', retailers_added: 0, revenue: 0, royalty_earned: 0, royalty_paid: 0 },
      { month: 'Mar', retailers_added: 0, revenue: 0, royalty_earned: 0, royalty_paid: 0 },
      { month: 'Apr', retailers_added: 0, revenue: 0, royalty_earned: 0, royalty_paid: 0 },
      { month: 'May', retailers_added: 0, revenue: 0, royalty_earned: 0, royalty_paid: 0 },
      { month: 'Jun', retailers_added: snap.total_retailers_added, revenue: snap.total_revenue_generated, royalty_earned: snap.total_royalty_earned, royalty_paid: snap.total_royalty_paid }
    ];

    // top retailers
    const ordersList = JSON.parse(localStorage.getItem('huddo_orders') || '[]');
    const top_retailers = mapped.map(m => {
      const rOrders = ordersList.filter(o => o.retailerName.toLowerCase() === m.retailer_name.toLowerCase());
      const rev = rOrders.reduce((sum, o) => sum + o.amount, 0);
      return {
        retailer_name: m.retailer_name,
        city: m.retailer_city,
        revenue: rev,
        orders: rOrders.length
      };
    }).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // recent earnings
    const recent_royalty_earnings = royaltyEarnings.filter(e => e.promoter_id === pId).slice(-5);

    const paidPct = totalEarned > 0 ? (totalPaid / totalEarned) * 100 : 100;

    return jsonResponse({
      profile_snapshot: stripGeographicFields(promoter),
      summary_cards: {
        retailers_added: mapped.length,
        active_retailers: mapped.length,
        revenue_generated: totalRevenue,
        royalty_earned: totalEarned,
        pending_royalty: totalPending,
        paid_royalty: totalPaid
      },
      current_month: {
        new_retailers_added: snap.total_retailers_added,
        revenue: snap.total_revenue_generated,
        royalty_earned: snap.total_royalty_earned,
        royalty_paid: snap.total_royalty_paid,
        royalty_pending: snap.pending_royalty
      },
      monthly_trend,
      top_retailers,
      recent_royalty_earnings,
      payment_status_breakdown: {
        total_earned: totalEarned,
        total_paid: totalPaid,
        total_pending: totalPending,
        paid_pct: Math.round(paidPct),
        pending_pct: Math.round(100 - paidPct)
      },
      recent_notifications: notifications.filter(n => n.promoter_id === pId).slice(-5)
    });
  }

  // Match /api/promoters/:id/performance
  const perfMatch = pathname.match(/^\/api\/promoters\/([^/]+)\/performance$/);
  if (perfMatch && method === 'GET') {
    const pId = Number(perfMatch[1]);
    const promoter = promoters.find(p => p.id === pId);
    if (!promoter) return jsonResponse({ error: "Promoter not found" }, 404);

    const mapped = mappings.filter(m => m.promoter_id === pId && m.is_active === 1);
    const revItems = revenueTracking.filter(r => r.promoter_id === pId);
    const totalRevenue = revItems.reduce((sum, r) => sum + r.invoice_amount, 0);
    const totalEarned = royaltyEarnings.filter(e => e.promoter_id === pId && e.status !== 'Cancelled').reduce((sum, e) => sum + e.royalty_amount, 0);
    const totalPaid = royaltyEarnings.filter(e => e.promoter_id === pId && e.status === 'Paid').reduce((sum, e) => sum + e.royalty_amount, 0);
    const pending_royalty = totalEarned - totalPaid;

    const curMonth = new Date().getMonth() + 1;
    const curYear = new Date().getFullYear();
    const periodLabel = `${curYear}-${String(curMonth).padStart(2, '0')}`;
    const snap = performanceSnapshots.find(s => s.promoter_id === pId && s.period_label === periodLabel) || {
      total_retailers_added: 0,
      total_revenue_generated: 0,
      total_royalty_earned: 0,
      total_royalty_paid: 0,
      pending_royalty: 0
    };

    return jsonResponse({
      overall: {
        total_retailers_added: mapped.length,
        total_active_retailers: mapped.length,
        total_revenue_generated: totalRevenue,
        total_royalty_earned: totalEarned,
        total_royalty_paid: totalPaid,
        pending_royalty
      },
      monthly_trend: [
        { month: 'Jan', revenue: 0, royalty: 0 },
        { month: 'Feb', revenue: 0, royalty: 0 },
        { month: 'Mar', revenue: 0, royalty: 0 },
        { month: 'Apr', revenue: 0, royalty: 0 },
        { month: 'May', revenue: 0, royalty: 0 },
        { month: 'Jun', revenue: totalRevenue, royalty: totalEarned }
      ],
      quarterly_trend: [{ quarter: 'Q2', revenue: totalRevenue }],
      retailer_growth: { total: mapped.length, active: mapped.length, this_month: snap.total_retailers_added, growth_pct: 0 },
      top_performing_retailers: mapped.slice(0, 10).map(m => ({ retailer_name: m.retailer_name, revenue: totalRevenue })),
      royalty_trend: [
        { month: 'Jun', earned: totalEarned, paid: totalPaid }
      ]
    });
  }

  // Match reports revenue
  const repRevMatch = pathname.match(/^\/api\/promoters\/([^/]+)\/reports\/revenue$/);
  if (repRevMatch && method === 'GET') {
    const pId = Number(repRevMatch[1]);
    const list = revenueTracking.filter(r => r.promoter_id === pId);
    const total_revenue = list.reduce((sum, r) => sum + r.invoice_amount, 0);

    return jsonResponse({
      summary: { total_revenue, total_invoices: list.length, avg_invoice: list.length > 0 ? Math.round(total_revenue / list.length) : 0 },
      by_retailer: list.map(r => ({ retailer_name: r.retailer_name, revenue: r.invoice_amount })),
      by_month: [{ month: 'June', revenue: total_revenue }],
      download_url: "https://mock-storage.huddoerp.in/reports/revenue.csv"
    });
  }

  // Match reports royalty
  const repRoyMatch = pathname.match(/^\/api\/promoters\/([^/]+)\/reports\/royalty$/);
  if (repRoyMatch && method === 'GET') {
    const pId = Number(repRoyMatch[1]);
    const list = royaltyEarnings.filter(e => e.promoter_id === pId && e.status !== 'Cancelled');
    const total_earned = list.reduce((sum, e) => sum + e.royalty_amount, 0);
    const total_paid = list.filter(e => e.status === 'Paid').reduce((sum, e) => sum + e.royalty_amount, 0);
    const pending = total_earned - total_paid;

    return jsonResponse({
      annual_summary: { total_earned, total_paid, pending, royalty_pct: 5.00 },
      monthly_breakdown: [{ month: 'June', earned: total_earned, paid: total_paid }],
      by_retailer: list.map(e => {
        const mapping = mappings.find(m => m.retailer_id === e.retailer_id) || {};
        return { retailer_name: mapping.retailer_name || "Unknown Retailer", earned: e.royalty_amount };
      }),
      download_url: "https://mock-storage.huddoerp.in/reports/royalty.csv"
    });
  }

  // Match reports retailers
  const repRetMatch = pathname.match(/^\/api\/promoters\/([^/]+)\/reports\/retailers$/);
  if (repRetMatch && method === 'GET') {
    const pId = Number(repRetMatch[1]);
    const list = mappings.filter(m => m.promoter_id === pId);

    return jsonResponse({
      total_mapped: list.length,
      active: list.filter(m => m.is_active === 1).length,
      new_this_period: list.length,
      by_city: [{ city: 'Mumbai', count: list.filter(m => m.retailer_city === 'Mumbai').length }],
      by_category: [{ category: 'Standard', count: list.length }],
      retailer_list: list.map(m => ({ retailer_name: m.retailer_name, city: m.retailer_city, mapped_at: m.mapped_at, status: m.is_active ? 'Active' : 'Unmapped' })),
      download_url: "https://mock-storage.huddoerp.in/reports/retailers.csv"
    });
  }

  // Match notifications get
  const notifGetMatch = pathname.match(/^\/api\/promoters\/([^/]+)\/notifications$/);
  if (notifGetMatch && method === 'GET') {
    const pId = Number(notifGetMatch[1]);
    const list = notifications.filter(n => n.promoter_id === pId);
    const unread = list.filter(n => n.is_read === 0).length;
    return jsonResponse({
      notifications: list,
      unread_count: unread
    });
  }

  // Match notifications read all
  const notifReadAllMatch = pathname.match(/^\/api\/promoters\/([^/]+)\/notifications\/read-all$/);
  if (notifReadAllMatch && method === 'PATCH') {
    const pId = Number(notifReadAllMatch[1]);
    let count = 0;
    notifications = notifications.map(n => {
      if (n.promoter_id === pId && n.is_read === 0) {
        count++;
        return { ...n, is_read: 1 };
      }
      return n;
    });
    saveAll();
    return jsonResponse({ updated: count });
  }

  // Match notifications read single
  const notifReadMatch = pathname.match(/^\/api\/promoters\/([^/]+)\/notifications\/([^/]+)\/read$/);
  if (notifReadMatch && method === 'PATCH') {
    const notif_id = Number(notifReadMatch[2]);
    notifications = notifications.map(n => {
      if (n.id === notif_id) {
        return { ...n, is_read: 1 };
      }
      return n;
    });
    saveAll();
    return jsonResponse({ updated: true });
  }

  return null;
}
