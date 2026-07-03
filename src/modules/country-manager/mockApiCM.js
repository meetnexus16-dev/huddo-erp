// CM-MODULE: Mock API simulation for all Country Manager routes (/api/country-managers/*)
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

// Seed Country Manager profiles (Rajesh Sharma is CM for India)
const defaultCountryManagers = [
  {
    id: 1,
    user_id: "U2", // Rajesh Sharma
    employee_code: "CM-IN-2026-001",
    full_name: "Rajesh Sharma",
    mobile_number: "9812345678",
    email: "rajesh@huddoerp.in",
    profile_photo_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    assigned_country_id: 1,
    assigned_country_name: "India",
    residential_address: "101, Sea Breeze Apartments, Juhu, Mumbai",
    aadhaar_number: "1234-5678-9012",
    pan_number: "ABCDE1234F",
    department: "Sales",
    designation: "Country Manager",
    reporting_to: "U1", // Rohan Hudda
    joining_date: "2023-01-01",
    salary_structure: 180000.00,
    bank_account_number: "50100234567890",
    bank_ifsc: "HDFC0000120",
    bank_name: "HDFC Bank",
    status: "Active",
    created_at: new Date().toISOString()
  }
];

// Seed state assignments matching our mockData.js GEOGRAPHY
const defaultStateAssignments = [
  { id: 1, country_manager_id: 1, state_id: 1, state_name: "Maharashtra", state_manager_id: "U3", assigned_at: new Date().toISOString(), is_active: 1 },
  { id: 2, country_manager_id: 1, state_id: 2, state_name: "Delhi", state_manager_id: "U3", assigned_at: new Date().toISOString(), is_active: 1 },
  { id: 3, country_manager_id: 1, state_id: 3, state_name: "Karnataka", state_manager_id: "U3", assigned_at: new Date().toISOString(), is_active: 1 },
  { id: 4, country_manager_id: 1, state_id: 4, state_name: "Gujarat", state_manager_id: "U3", assigned_at: new Date().toISOString(), is_active: 1 },
  { id: 5, country_manager_id: 1, state_id: 5, state_name: "Tamil Nadu", state_manager_id: null, assigned_at: new Date().toISOString(), is_active: 1 }
];

// Seed targets
const defaultTargets = [
  {
    id: 1,
    country_manager_id: 1,
    country_id: 1,
    target_type: "Monthly",
    target_period: "2026-06",
    revenue_target: 15000000.00,
    revenue_achieved: 12450000.00,
    revenue_pct: 83.0,
    order_count_target: 120,
    order_count_achieved: 96,
    retailer_target: 10,
    retailer_achieved: 8,
    new_cities_target: 5,
    new_cities_achieved: 4,
    status: "Active"
  }
];

// Seed commissions
const defaultCommissions = [
  {
    id: 1,
    country_manager_id: 1,
    country_id: 1,
    commission_type: "Country Manager Incentive",
    basis: "Country Revenue",
    period_type: "Monthly",
    period_label: "2026-05",
    base_revenue: 12100000.00,
    commission_percentage: 1.5,
    commission_amount: 181500.00,
    bonus_amount: 20000.00,
    total_payable: 201500.00,
    status: "Paid",
    approved_by: "U1",
    paid_at: "2026-06-05T10:00:00Z",
    payment_reference: "TXN-CM-99881",
    remarks: "May sales slab milestone bonus included"
  },
  {
    id: 2,
    country_manager_id: 1,
    country_id: 1,
    commission_type: "Country Manager Incentive",
    basis: "Country Revenue",
    period_type: "Monthly",
    period_label: "2026-06",
    base_revenue: 12450000.00,
    commission_percentage: 1.5,
    commission_amount: 186750.00,
    bonus_amount: 0.00,
    total_payable: 186750.00,
    status: "Pending",
    remarks: "June sales cycle active calculation"
  }
];

// Seed approvals queue
// CM approves level 3 (after state manager, when items are 'State_Approved' / ready for CM)
const defaultApprovals = [
  {
    id: 1,
    country_manager_id: 1,
    country_id: 1,
    approval_type: "Retailer_Registration",
    reference_id: "RET005", // Apex Sole Distributors
    reference_type: "retailer",
    reference_label: "Apex Sole Distributors (Silver Category - Pune)",
    submitted_by: "U4", // Sanjay Joshi (City Manager)
    submitted_by_role: "City Manager",
    submitted_at: "2026-06-08T11:00:00Z",
    priority: "Normal",
    action: "Pending",
    remarks: ""
  },
  {
    id: 2,
    country_manager_id: 1,
    country_id: 1,
    approval_type: "Large_Order",
    reference_id: "ORD-5509", // Large order ORD-5509
    reference_type: "order",
    reference_label: "Walk Easy Footwear (Order Value: ₹1,50,000)",
    submitted_by: "U3", // Preeti Verma (State Manager)
    submitted_by_role: "State Manager",
    submitted_at: "2026-06-08T14:30:00Z",
    priority: "High",
    action: "Pending",
    remarks: ""
  }
];

// Seed notifications
const defaultNotifications = [
  { id: 1, country_manager_id: 1, type: "Approval_Request", title: "Large Order Pending Review", message: "Walk Easy Footwear has submitted order ORD-5509 of value ₹1,50,000 which requires Country Manager clearance.", reference_id: 2, reference_type: "approval", is_read: 0, priority: "High", created_at: "2026-06-08T14:30:00Z" },
  { id: 2, country_manager_id: 1, type: "Target_Reminder", title: "Target Period Closing", message: "Monthly target cycles for June 2026 will freeze soon. Current revenue achievement is 83%.", reference_id: 1, reference_type: "target", is_read: 0, priority: "Normal", created_at: "2026-06-08T09:00:00Z" },
  { id: 3, country_manager_id: 1, type: "Commission_Alert", title: "Incentive Calculated", message: "June commission incentive calculations are ready for review.", reference_id: 2, reference_type: "commission", is_read: 1, priority: "Normal", created_at: "2026-06-08T08:00:00Z" }
];

// Seed state manager reviews
const defaultReviews = [
  { id: 1, state_manager_id: "U3", review_period: "2026-Q1", performance_rating: 4, remarks: "Maintained steady distributor relationships in Maharashtra. Target acquisition criteria met.", created_at: "2026-04-05T10:00:00Z" }
];

// Initialize Collections in LocalStorage
let countryManagers = getOrSetLocal('huddo_country_managers', defaultCountryManagers);
let cmStateAssignments = getOrSetLocal('huddo_cm_state_assignments', defaultStateAssignments);
let cmTargets = getOrSetLocal('huddo_cm_targets', defaultTargets);
let cmCommissions = getOrSetLocal('huddo_cm_commissions', defaultCommissions);
let cmApprovals = getOrSetLocal('huddo_cm_approval_queue', defaultApprovals);
let cmNotifications = getOrSetLocal('huddo_cm_notifications', defaultNotifications);
let cmReviews = getOrSetLocal('huddo_cm_state_manager_reviews', defaultReviews);
let cmReportsLog = getOrSetLocal('huddo_cm_reports_log', []);

// CM-MODULE: Main Interceptor Handler called in mockApi.fetch
export async function handleCountryManagerApi(pathname, method, body, params) {
  // reload state from local storage on each request
  countryManagers = JSON.parse(localStorage.getItem('huddo_country_managers') || '[]');
  cmStateAssignments = JSON.parse(localStorage.getItem('huddo_cm_state_assignments') || '[]');
  cmTargets = JSON.parse(localStorage.getItem('huddo_cm_targets') || '[]');
  cmCommissions = JSON.parse(localStorage.getItem('huddo_cm_commissions') || '[]');
  cmApprovals = JSON.parse(localStorage.getItem('huddo_cm_approval_queue') || '[]');
  cmNotifications = JSON.parse(localStorage.getItem('huddo_cm_notifications') || '[]');
  cmReviews = JSON.parse(localStorage.getItem('huddo_cm_state_manager_reviews') || '[]');
  cmReportsLog = JSON.parse(localStorage.getItem('huddo_cm_reports_log') || '[]');

  // Helper to save state
  const saveAll = () => {
    localStorage.setItem('huddo_country_managers', JSON.stringify(countryManagers));
    localStorage.setItem('huddo_cm_state_assignments', JSON.stringify(cmStateAssignments));
    localStorage.setItem('huddo_cm_targets', JSON.stringify(cmTargets));
    localStorage.setItem('huddo_cm_commissions', JSON.stringify(cmCommissions));
    localStorage.setItem('huddo_cm_approval_queue', JSON.stringify(cmApprovals));
    localStorage.setItem('huddo_cm_notifications', JSON.stringify(cmNotifications));
    localStorage.setItem('huddo_cm_state_manager_reviews', JSON.stringify(cmReviews));
    localStorage.setItem('huddo_cm_reports_log', JSON.stringify(cmReportsLog));
  };

  // Helper to map a response
  const jsonResponse = (data, status = 200) => {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  };

  // 1. GET /api/country-managers
  if (pathname === '/api/country-managers' && method === 'GET') {
    if (countryManagers.length === 0) {
      countryManagers = [...defaultCountryManagers];
      saveAll();
    }
    let list = [...countryManagers];
    if (params.search) {
      const q = params.search.toLowerCase();
      list = list.filter(cm => cm.full_name.toLowerCase().includes(q) || cm.email.toLowerCase().includes(q) || cm.employee_code.toLowerCase().includes(q));
    }
    if (params.status && params.status !== 'All') {
      list = list.filter(cm => cm.status === params.status);
    }
    if (params.country_id && params.country_id !== 'All') {
      list = list.filter(cm => String(cm.assigned_country_id) === String(params.country_id));
    }
    // calculate simple states count
    const enrichedList = list.map(cm => {
      const states = cmStateAssignments.filter(sa => sa.country_manager_id === cm.id && sa.is_active);
      return {
        ...cm,
        total_states: states.length,
        current_month_revenue: 12450000.00,
        target_achievement_pct: 83.0
      };
    });
    return jsonResponse({
      success: true,
      data: enrichedList,
      pagination: { total: enrichedList.length, page: 1, limit: 10 }
    });
  }

  // 2. POST /api/country-managers
  if (pathname === '/api/country-managers' && method === 'POST') {
    const newCM = {
      id: countryManagers.length + 1,
      user_id: body.user_id || `U_CM_${Date.now()}`,
      ...body,
      employee_code: `CM-IN-2026-00${countryManagers.length + 1}`,
      assigned_country_name: "India",
      status: body.status || "Active",
      created_at: new Date().toISOString()
    };
    countryManagers.push(newCM);
    
    // Auto assign all states to this CM if none assigned
    const statesCount = cmStateAssignments.filter(sa => sa.country_manager_id === newCM.id).length;
    if (statesCount === 0) {
      const basicStates = [
        { state_id: 1, name: "Maharashtra", mgr: "U3" },
        { state_id: 2, name: "Delhi", mgr: "U3" },
        { state_id: 3, name: "Karnataka", mgr: "U3" },
        { state_id: 4, name: "Gujarat", mgr: "U3" },
        { state_id: 5, name: "Tamil Nadu", mgr: null }
      ];
      basicStates.forEach(bs => {
        cmStateAssignments.push({
          id: cmStateAssignments.length + 1,
          country_manager_id: newCM.id,
          state_id: bs.state_id,
          state_name: bs.name,
          state_manager_id: bs.mgr,
          assigned_at: new Date().toISOString(),
          is_active: 1
        });
      });
    }

    // Seed target for new CM
    cmTargets.push({
      id: cmTargets.length + 1,
      country_manager_id: newCM.id,
      country_id: newCM.assigned_country_id,
      target_type: "Monthly",
      target_period: "2026-06",
      revenue_target: 10000000.00,
      revenue_achieved: 0.00,
      revenue_pct: 0.0,
      order_count_target: 100,
      order_count_achieved: 0,
      retailer_target: 10,
      retailer_achieved: 0,
      new_cities_target: 5,
      new_cities_achieved: 0,
      status: "Active"
    });

    saveAll();
    return jsonResponse({ success: true, cm_id: String(newCM.id), employee_code: newCM.employee_code, message: "Country Manager created." }, 201);
  }

  // 3. GET /api/country-managers/:id/profile
  const profileMatch = pathname.match(/^\/api\/country-managers\/([^/]+)\/profile$/);
  if (profileMatch && method === 'GET') {
    const idParam = profileMatch[1];
    const id = Number(idParam);
    const cm = Number.isNaN(id)
      ? countryManagers.find(c => String(c.id) === idParam || String(c.user_id) === idParam)
      : countryManagers.find(c => c.id === id);
    if (!cm) return jsonResponse({ success: false, error: "Country Manager not found" }, 404);
    const cmKey = cm.id;
    const states = cmStateAssignments.filter(sa => sa.country_manager_id === cmKey && sa.is_active);
    const target = cmTargets.find(t => t.country_manager_id === cmKey && t.target_period === "2026-06") || {};
    const unreadNotifs = cmNotifications.filter(n => n.country_manager_id === cmKey && !n.is_read).length;
    const pendingApps = cmApprovals.filter(a => a.country_manager_id === cmKey && a.action === "Pending").length;
    return jsonResponse({
      ...cm,
      assigned_states: states,
      targets_progress: target,
      pending_approval_count: pendingApps,
      unread_notification_count: unreadNotifs
    });
  }

  // 4. GET /api/country-managers/:id
  const cmDetailMatch = pathname.match(/^\/api\/country-managers\/([^/]+)$/);
  if (cmDetailMatch && method === 'GET') {
    const id = Number(cmDetailMatch[1]);
    const cm = countryManagers.find(c => c.id === id);
    if (!cm) return jsonResponse({ error: "Not found" }, 404);
    return jsonResponse(cm);
  }

  // 5. PUT /api/country-managers/:id
  if (cmDetailMatch && method === 'PUT') {
    const id = Number(cmDetailMatch[1]);
    countryManagers = countryManagers.map(c => c.id === id ? { ...c, ...body } : c);
    saveAll();
    return jsonResponse({ updated: true, cm: countryManagers.find(c => c.id === id) });
  }

  // 6. DELETE /api/country-managers/:id
  if (cmDetailMatch && method === 'DELETE') {
    const id = Number(cmDetailMatch[1]);
    countryManagers = countryManagers.map(c => c.id === id ? { ...c, deleted_at: new Date().toISOString() } : c);
    cmStateAssignments = cmStateAssignments.map(sa => sa.country_manager_id === id ? { ...sa, is_active: 0, removed_at: new Date().toISOString() } : sa);
    saveAll();
    return jsonResponse({ deleted: true });
  }

  // 7. GET /api/country-managers/:id/states
  const statesMatch = pathname.match(/^\/api\/country-managers\/([^/]+)\/states$/);
  if (statesMatch && method === 'GET') {
    const id = Number(statesMatch[1]);
    const assigned = cmStateAssignments.filter(sa => sa.country_manager_id === id && sa.is_active);
    
    // Enrich with metrics
    const enrichedStates = assigned.map(sa => {
      let retailersData = JSON.parse(localStorage.getItem('huddo_retailers') || '[]');
      let ordersData = JSON.parse(localStorage.getItem('huddo_orders') || '[]');
      
      const stateRetailers = retailersData.filter(r => r.state.toLowerCase() === sa.state_name.toLowerCase());
      const stateRetailerNames = stateRetailers.map(r => r.shopName.toLowerCase());
      const stateOrders = ordersData.filter(o => stateRetailerNames.includes(o.retailerName.toLowerCase()));
      const confirmedOrders = stateOrders.filter(o => ['delivered', 'shipped', 'approved', 'processing'].includes(o.status.toLowerCase()));
      const monthlyRevenue = confirmedOrders.reduce((sum, o) => sum + o.amount, 0);

      return {
        state_id: sa.state_id,
        state_name: sa.state_name,
        state_manager: {
          id: sa.state_manager_id || '',
          name: sa.state_manager_id === "U3" ? "Preeti Verma" : "Not Assigned",
          mobile: sa.state_manager_id === "U3" ? "9988776655" : ""
        },
        total_cities: sa.state_name === "Maharashtra" ? 2 : 1,
        total_retailers: stateRetailers.length,
        monthly_revenue: monthlyRevenue || 100000,
        monthly_orders: confirmedOrders.length,
        performance_trend: monthlyRevenue > 50000 ? 'Up' : 'Stable'
      };
    });

    return jsonResponse({
      assigned_states: enrichedStates,
      total_states: enrichedStates.length,
      unassigned_states_in_country: []
    });
  }

  // 8. POST /api/country-managers/:id/states/assign-manager
  const assignManagerMatch = pathname.match(/^\/api\/country-managers\/([^/]+)\/states\/assign-manager$/);
  if (assignManagerMatch && method === 'POST') {
    const { state_id, state_manager_id } = body;
    cmStateAssignments = cmStateAssignments.map(sa => 
      sa.state_id === Number(state_id) ? { ...sa, state_manager_id } : sa
    );
    saveAll();
    return jsonResponse({ updated: true, message: "State manager assigned." });
  }

  // 9. GET /api/country-managers/:id/dashboard
  const dashMatch = pathname.match(/^\/api\/country-managers\/([^/]+)\/dashboard$/);
  if (dashMatch && method === 'GET') {
    const id = Number(dashMatch[1]);
    const cm = countryManagers.find(c => c.id === id);
    if (!cm) return jsonResponse({ error: "Country Manager not found" }, 404);
    
    const target = cmTargets.find(t => t.country_manager_id === id && t.target_period === "2026-06") || {
      revenue_target: 15000000.00, revenue_achieved: 12450000.00, revenue_pct: 83.0,
      order_count_target: 120, order_count_achieved: 96,
      retailer_target: 10, retailer_achieved: 8
    };

    const pendingApps = cmApprovals.filter(a => a.country_manager_id === id && a.action === "Pending");
    const listNotifications = cmNotifications.filter(n => n.country_manager_id === id);

    return jsonResponse({
      profile_snapshot: {
        name: cm.full_name,
        employee_code: cm.employee_code,
        assigned_country: cm.assigned_country_name,
        status: cm.status,
        total_states_managed: 5
      },
      kpi_cards: {
        total_states: 5,
        total_cities: 14,
        total_retailers: 48,
        active_retailers: 44,
        total_promoters: 3,
        pending_approvals: pendingApps.length,
        unread_notifications: listNotifications.filter(n => !n.is_read).length
      },
      current_period_targets: {
        revenue: { target: target.revenue_target, achieved: target.revenue_achieved, pct: target.revenue_pct, trend: "Up" },
        orders: { target: target.order_count_target, achieved: target.order_count_achieved, pct: Math.round(target.order_count_achieved/target.order_count_target*100) },
        retailer_acquisition: { target: target.retailer_target, achieved: target.retailer_achieved, pct: Math.round(target.retailer_achieved/target.retailer_target*100) }
      },
      state_performance: [
        { state_id: 1, state_name: "Maharashtra", state_manager_name: "Anil Deshmukh", revenue: 4500000, orders: 85, retailers: 15, achievement_pct: 90.0, rank: 1, trend: "Up" },
        { state_id: 2, state_name: "Delhi", state_manager_name: "Preeti Verma", revenue: 3200000, orders: 60, retailers: 10, achievement_pct: 80.0, rank: 2, trend: "Stable" },
        { state_id: 3, state_name: "Karnataka", state_manager_name: "Kiran Kumar", revenue: 2100000, orders: 45, retailers: 9, achievement_pct: 70.0, rank: 3, trend: "Up" },
        { state_id: 4, state_name: "Gujarat", state_manager_name: "Vijay Patel", revenue: 1650000, orders: 35, retailers: 8, achievement_pct: 75.0, rank: 4, trend: "Stable" },
        { state_id: 5, state_name: "Tamil Nadu", state_manager_name: "Not Assigned", revenue: 1000000, orders: 20, retailers: 6, achievement_pct: 50.0, rank: 5, trend: "Down" }
      ],
      city_performance_top10: [
        { city_name: "New Delhi", state_name: "Delhi", revenue: 3200000, orders: 60, retailers: 10 },
        { city_name: "Mumbai", state_name: "Maharashtra", revenue: 2800000, orders: 48, retailers: 8 },
        { city_name: "Pune", state_name: "Maharashtra", revenue: 1700000, orders: 37, retailers: 7 },
        { city_name: "Bengaluru", state_name: "Karnataka", revenue: 1500000, orders: 30, retailers: 6 },
        { city_name: "Ahmedabad", state_name: "Gujarat", revenue: 1100000, orders: 22, retailers: 5 },
        { city_name: "Chennai", state_name: "Tamil Nadu", revenue: 1000000, orders: 20, retailers: 6 }
      ],
      retailer_performance: {
        total: 48,
        active: 44,
        new_this_month: 2,
        by_category: { Platinum: 25, Gold: 12, Silver: 8, Standard: 3 }
      },
      revenue_analysis: {
        current_month: 12450000,
        previous_month: 12100000,
        growth_pct: 2.89,
        monthly_trend: [
          { month: "Jan", revenue: 9800000 },
          { month: "Feb", revenue: 10200000 },
          { month: "Mar", revenue: 13800000 },
          { month: "Apr", revenue: 11500000 },
          { month: "May", revenue: 12100000 },
          { month: "Jun", revenue: 12450000 }
        ],
        quarterly_trend: []
      },
      sales_trends: {
        daily_this_week: [
          { day: "Mon", revenue: 1200000 },
          { day: "Tue", revenue: 1800000 },
          { day: "Wed", revenue: 1500000 },
          { day: "Thu", revenue: 2200000 },
          { day: "Fri", revenue: 1900000 },
          { day: "Sat", revenue: 2500000 },
          { day: "Sun", revenue: 1350000 }
        ],
        weekly_this_month: [],
        top_products: [
          { name: "Huddo Air Classic", quantity: 320, revenue: 959680 },
          { name: "Huddo Flex Runner", quantity: 240, revenue: 599760 },
          { name: "Huddo Elegant Derby", quantity: 180, revenue: 899820 }
        ],
        top_states: []
      },
      recent_approvals: pendingApps.slice(0, 5),
      recent_notifications: listNotifications.slice(0, 5)
    });
  }

  // 10. GET /api/country-managers/:id/approvals
  const approvalsMatch = pathname.match(/^\/api\/country-managers\/([^/]+)\/approvals$/);
  if (approvalsMatch && method === 'GET') {
    const id = Number(approvalsMatch[1]);
    const list = cmApprovals.filter(a => a.country_manager_id === id);
    return jsonResponse(list);
  }

  // 11. GET /api/country-managers/:id/approvals/summary
  const approvalsSumMatch = pathname.match(/^\/api\/country-managers\/([^/]+)\/approvals\/summary$/);
  if (approvalsSumMatch && method === 'GET') {
    const id = Number(approvalsSumMatch[1]);
    const pending = cmApprovals.filter(a => a.country_manager_id === id && a.action === "Pending");
    const byType = pending.reduce((acc, curr) => {
      acc[curr.approval_type] = (acc[curr.approval_type] || 0) + 1;
      return acc;
    }, {});
    const urgent = pending.filter(a => a.priority === "Urgent" || a.priority === "High").length;
    return jsonResponse({
      total_pending: pending.length,
      by_type: byType,
      urgent_count: urgent,
      overdue_count: 0
    });
  }

  // 12. POST /api/country-managers/:id/approvals/:queue_id/action
  const approvalActionMatch = pathname.match(/^\/api\/country-managers\/([^/]+)\/approvals\/([^/]+)\/action$/);
  if (approvalActionMatch && method === 'POST') {
    const id = Number(approvalActionMatch[1]);
    const qid = Number(approvalActionMatch[2]);
    const { action, remarks } = body;
    
    let targetItem = cmApprovals.find(a => a.id === qid);
    if (!targetItem) return jsonResponse({ error: "Item not found" }, 404);

    cmApprovals = cmApprovals.map(a => 
      a.id === qid 
        ? { ...a, action, actioned_by: id, actioned_at: new Date().toISOString(), remarks } 
        : a
    );

    // Write-back column logic to core models
    if (targetItem.reference_type === 'retailer') {
      // CM-MODULE: Retailer integration — approval_status column only
      let retailersData = JSON.parse(localStorage.getItem('huddo_retailers') || '[]');
      retailersData = retailersData.map(r => 
        r.id === targetItem.reference_id 
          ? { ...r, status: action === 'Approved' ? 'Approved' : 'Rejected' } 
          : r
      );
      localStorage.setItem('huddo_retailers', JSON.stringify(retailersData));
    } else if (targetItem.reference_type === 'order') {
      // CM-MODULE: Order integration — single column update only
      let ordersData = JSON.parse(localStorage.getItem('huddo_orders') || '[]');
      ordersData = ordersData.map(o => 
        o.id === targetItem.reference_id 
          ? { 
              ...o, 
              workflow: { ...o.workflow, countryApproved: action === 'Approved' ? true : false },
              status: action === 'Approved' ? 'Approved' : 'Cancelled' 
            } 
          : o
      );
      localStorage.setItem('huddo_orders', JSON.stringify(ordersData));

      // CM-MODULE: Target Achievement Auto-Update Trigger
      if (action === 'Approved') {
        const orderVal = ordersData.find(o => o.id === targetItem.reference_id)?.amount || 0;
        cmTargets = cmTargets.map(t => {
          if (t.country_manager_id === id && t.target_period === "2026-06") {
            const newAchieved = t.revenue_achieved + orderVal;
            const newPct = Math.round((newAchieved / t.revenue_target) * 100);
            return {
              ...t,
              revenue_achieved: newAchieved,
              revenue_pct: newPct,
              order_count_achieved: t.order_count_achieved + 1,
              status: newAchieved >= t.revenue_target ? 'Completed' : 'Active'
            };
          }
          return t;
        });
      }
    }

    saveAll();
    return jsonResponse({ actioned: true, next_step: "Final_Approved", message: "Action recorded." });
  }

  // 13. GET /api/country-managers/:id/state-managers
  const smMatch = pathname.match(/^\/api\/country-managers\/([^/]+)\/state-managers$/);
  if (smMatch && method === 'GET') {
    // Read state managers
    const managers = [
      { state_manager_id: "U3", name: "Preeti Verma", mobile: "9988776655", email: "preeti@huddoerp.in", assigned_state: "Delhi", status: "Active", performance: { revenue: 3200000, orders: 60, retailers: 10, target_pct: 80.0 } },
      { state_manager_id: "U4-mgr", name: "Anil Deshmukh", mobile: "9560412211", email: "anil@huddoerp.in", assigned_state: "Maharashtra", status: "Active", performance: { revenue: 4500000, orders: 85, retailers: 15, target_pct: 90.0 } }
    ];
    return jsonResponse({ state_managers: managers, total: managers.length });
  }

  // 14. POST /api/country-managers/:id/state-managers/review
  const smReviewMatch = pathname.match(/^\/api\/country-managers\/([^/]+)\/state-managers\/review$/);
  if (smReviewMatch && method === 'POST') {
    const newReview = {
      id: cmReviews.length + 1,
      ...body,
      created_at: new Date().toISOString()
    };
    cmReviews.push(newReview);
    saveAll();
    return jsonResponse({ review_id: newReview.id });
  }

  // 15. GET /api/country-managers/:id/targets
  const targetsMatch = pathname.match(/^\/api\/country-managers\/([^/]+)\/targets$/);
  if (targetsMatch && method === 'GET') {
    const id = Number(targetsMatch[1]);
    const list = cmTargets.filter(t => t.country_manager_id === id);
    return jsonResponse({
      targets: list,
      summary: { total_active: list.filter(t=>t.status==='Active').length, completed: list.filter(t=>t.status==='Completed').length, missed: list.filter(t=>t.status==='Missed').length }
    });
  }

  // 16. POST /api/country-managers/:id/targets
  if (targetsMatch && method === 'POST') {
    const id = Number(targetsMatch[1]);
    // check if target already exists for type and period
    const existingIdx = cmTargets.findIndex(t => t.country_manager_id === id && t.target_type === body.target_type && t.target_period === body.target_period);
    if (existingIdx > -1) {
      cmTargets[existingIdx] = {
        ...cmTargets[existingIdx],
        revenue_target: Number(body.revenue_target),
        order_count_target: Number(body.order_count_target),
        retailer_target: Number(body.retailer_target),
        new_cities_target: Number(body.new_cities_target)
      };
    } else {
      cmTargets.push({
        id: cmTargets.length + 1,
        country_manager_id: id,
        country_id: 1,
        target_type: body.target_type,
        target_period: body.target_period,
        revenue_target: Number(body.revenue_target),
        revenue_achieved: 0,
        revenue_pct: 0,
        order_count_target: Number(body.order_count_target),
        order_count_achieved: 0,
        retailer_target: Number(body.retailer_target),
        retailer_achieved: 0,
        new_cities_target: Number(body.new_cities_target),
        new_cities_achieved: 0,
        status: "Active"
      });
    }
    saveAll();
    return jsonResponse({ message: "Target saved successfully." });
  }

  // 17. GET /api/country-managers/:id/commissions
  const commsMatch = pathname.match(/^\/api\/country-managers\/([^/]+)\/commissions$/);
  if (commsMatch && method === 'GET') {
    const id = Number(commsMatch[1]);
    const list = cmCommissions.filter(c => c.country_manager_id === id);
    const totalEarned = list.reduce((sum, c) => sum + c.total_payable, 0);
    const totalPaid = list.filter(c => c.status === 'Paid').reduce((sum, c) => sum + c.total_payable, 0);
    const totalPending = list.filter(c => c.status === 'Pending').reduce((sum, c) => sum + c.total_payable, 0);
    return jsonResponse({
      commissions: list,
      summary: { total_earned: totalEarned, total_paid: totalPaid, total_pending: totalPending }
    });
  }

  // 18. POST /api/country-managers/:id/commissions/:comm_id/approve
  const commApproveMatch = pathname.match(/^\/api\/country-managers\/([^/]+)\/commissions\/([^/]+)\/approve$/);
  if (commApproveMatch && method === 'POST') {
    const commId = Number(commApproveMatch[2]);
    cmCommissions = cmCommissions.map(c => 
      c.id === commId ? { ...c, status: body.action === 'Approved' ? 'Approved' : 'Cancelled', remarks: body.remarks } : c
    );
    saveAll();
    return jsonResponse({ status: body.action === 'Approved' ? 'Approved' : 'Cancelled', message: "Commission status updated." });
  }

  // 19. POST /api/country-managers/:id/commissions/:comm_id/mark-paid
  const commPaidMatch = pathname.match(/^\/api\/country-managers\/([^/]+)\/commissions\/([^/]+)\/mark-paid$/);
  if (commPaidMatch && method === 'POST') {
    const commId = Number(commPaidMatch[2]);
    cmCommissions = cmCommissions.map(c => 
      c.id === commId ? { ...c, status: 'Paid', payment_reference: body.payment_reference, paid_at: body.paid_at || new Date().toISOString() } : c
    );
    saveAll();
    return jsonResponse({ updated: true });
  }

  // 20. GET /api/country-managers/:id/reports/:type
  const reportTypeMatch = pathname.match(/^\/api\/country-managers\/([^/]+)\/reports\/([^/]+)$/);
  if (reportTypeMatch && method === 'GET') {
    const cmId = Number(reportTypeMatch[1]);
    const reportType = reportTypeMatch[2];
    
    // Read-only aggregation scoped strictly to CM's assigned country (India)
    let ordersData = JSON.parse(localStorage.getItem('huddo_orders') || '[]');
    let retailersData = JSON.parse(localStorage.getItem('huddo_retailers') || '[]');

    if (reportType === 'sales') {
      const confirmedOrders = ordersData.filter(o => ['delivered', 'shipped', 'approved', 'processing'].includes(o.status.toLowerCase()));
      const totalRev = confirmedOrders.reduce((sum, o) => sum + o.amount, 0);
      return jsonResponse({
        summary: { total_revenue: totalRev, total_orders: confirmedOrders.length, avg_order_value: Math.round(totalRev / (confirmedOrders.length || 1)) },
        by_state: [
          { state_name: "Maharashtra", revenue: 4500000, orders: 85 },
          { state_name: "Delhi", revenue: 3200000, orders: 60 }
        ],
        by_city: [
          { city_name: "New Delhi", state_name: "Delhi", revenue: 3200000, orders: 60 },
          { city_name: "Mumbai", state_name: "Maharashtra", revenue: 2800000, orders: 48 }
        ],
        by_product: [
          { product_name: "Huddo Air Classic", quantity: 320, revenue: 959680 },
          { product_name: "Huddo Elegant Derby", quantity: 180, revenue: 899820 }
        ],
        daily_breakdown: []
      });
    }

    if (reportType === 'revenue') {
      return jsonResponse({
        monthly_revenue: [
          { month: "Jan", revenue: 9800000 },
          { month: "Feb", revenue: 10200000 },
          { month: "Mar", revenue: 13800000 },
          { month: "Apr", revenue: 11500000 },
          { month: "May", revenue: 12100000 },
          { month: "Jun", revenue: 12450000 }
        ],
        quarterly_revenue: [
          { quarter: "Q1 2026", revenue: 33800000 },
          { quarter: "Q2 2026", revenue: 36050000 }
        ],
        yoy_comparison: { current_year: 69850000, previous_year: 65400000, growth_pct: 6.8 },
        by_category: { Platinum: 8500000, Gold: 3450000, Silver: 500000 }
      });
    }

    if (reportType === 'retailers') {
      const active = retailersData.filter(r => r.status === 'Approved').length;
      return jsonResponse({
        total_retailers: retailersData.length,
        active,
        pending: retailersData.filter(r => r.status.toLowerCase().includes('pending')).length,
        new_this_period: 2,
        by_category: { Platinum: 2, Gold: 1, Silver: 1, Standard: 1 },
        by_state: [
          { state_name: "Maharashtra", count: 15 },
          { state_name: "Delhi", count: 10 }
        ],
        top_retailers: retailersData.slice(0, 5).map(r => ({ shop_name: r.shopName, revenue: r.revenue, city: r.city }))
      });
    }



    if (reportType === 'commissions') {
      return jsonResponse({
        annual_summary: { total_earned: 388250, total_paid: 201500, pending: 186750 },
        monthly_breakdown: [
          { period: "2026-05", base_revenue: 12100000, amount: 181500, status: "Paid" },
          { period: "2026-06", base_revenue: 12450000, amount: 186750, status: "Pending" }
        ]
      });
    }

    if (reportType === 'employees') {
      return jsonResponse({
        total_under_country: { state_managers: 2, city_managers: 4, sales_executives: 12 },
        by_state: [
          { state_name: "Maharashtra", managers: 2, executives: 5 },
          { state_name: "Delhi", managers: 1, executives: 3 }
        ],
        performance_summary: []
      });
    }
  }

  // 21. GET /api/country-managers/:id/notifications
  const notifsMatch = pathname.match(/^\/api\/country-managers\/([^/]+)\/notifications$/);
  if (notifsMatch && method === 'GET') {
    const id = Number(notifsMatch[1]);
    const list = cmNotifications.filter(n => n.country_manager_id === id);
    const unread = list.filter(n => !n.is_read).length;
    const byType = list.reduce((acc, curr) => {
      acc[curr.type] = (acc[curr.type] || 0) + 1;
      return acc;
    }, {});
    return jsonResponse({
      notifications: list,
      unread_count: unread,
      by_type: byType
    });
  }

  // 22. PATCH /api/country-managers/:id/notifications/:notif_id/read
  const notifReadMatch = pathname.match(/^\/api\/country-managers\/([^/]+)\/notifications\/([^/]+)\/read$/);
  if (notifReadMatch && method === 'PATCH') {
    const nid = Number(notifReadMatch[2]);
    cmNotifications = cmNotifications.map(n => n.id === nid ? { ...n, is_read: 1 } : n);
    saveAll();
    return jsonResponse({ updated: true });
  }

  // 23. PATCH /api/country-managers/:id/notifications/read-all
  const notifReadAllMatch = pathname.match(/^\/api\/country-managers\/([^/]+)\/notifications\/read-all$/);
  if (notifReadAllMatch && method === 'PATCH') {
    const id = Number(notifReadAllMatch[1]);
    let count = 0;
    cmNotifications = cmNotifications.map(n => {
      if (n.country_manager_id === id && !n.is_read) {
        count++;
        return { ...n, is_read: 1 };
      }
      return n;
    });
    saveAll();
    return jsonResponse({ updated: count });
  }

  // 24. GET /api/country-managers/:id/analytics/state-performance
  const statePerfMatch = pathname.match(/^\/api\/country-managers\/([^/]+)\/analytics\/state-performance$/);
  if (statePerfMatch && method === 'GET') {
    return jsonResponse([
      { state_id: 1, state_name: "Maharashtra", state_manager_name: "Anil Deshmukh", revenue: 4500000, orders: 85, retailers: 15, avg_order_value: 52941, target_revenue: 5000000, target_pct: 90.0, rank: 1, previous_rank: 1, trend: 'Stable', top_city: { city_name: "Mumbai", revenue: 2800050 } },
      { state_id: 2, state_name: "Delhi", state_manager_name: "Preeti Verma", revenue: 3200000, orders: 60, retailers: 10, avg_order_value: 53333, target_revenue: 4000000, target_pct: 80.0, rank: 2, previous_rank: 2, trend: 'Stable', top_city: { city_name: "New Delhi", revenue: 3200050 } }
    ]);
  }

  // 25. GET /api/country-managers/:id/analytics/city-performance
  const cityPerfMatch = pathname.match(/^\/api\/country-managers\/([^/]+)\/analytics\/city-performance$/);
  if (cityPerfMatch && method === 'GET') {
    return jsonResponse([
      { city_id: 1, city_name: "New Delhi", state_name: "Delhi", revenue: 3200000, orders: 60, retailers: 10, city_manager_name: "Amit Bansal", rank: 1 },
      { city_id: 2, city_name: "Mumbai", state_name: "Maharashtra", revenue: 2800000, orders: 48, retailers: 8, city_manager_name: "Sanjay Joshi", rank: 2 }
    ]);
  }

  // 26. GET /api/country-managers/:id/analytics/retailer-performance
  const retPerfMatch = pathname.match(/^\/api\/country-managers\/([^/]+)\/analytics\/retailer-performance$/);
  if (retPerfMatch && method === 'GET') {
    return jsonResponse({
      summary: { total: 48, active: 44, new: 2, by_category: { Platinum: 25, Gold: 12, Silver: 8, Standard: 3 } },
      top_retailers: [
        { shop_name: "Walk Easy Footwear", revenue: 1850000, city: "Mumbai" },
        { shop_name: "Lakhani Shoe Emporium", revenue: 2150000, city: "New Delhi" }
      ],
      growth_trend: [
        { period: "Jan", count: 40 },
        { period: "Feb", count: 42 },
        { period: "Mar", count: 45 },
        { period: "Apr", count: 46 },
        { period: "May", count: 46 },
        { period: "Jun", count: 48 }
      ],
      underperforming: []
    });
  }

  // 27. GET /api/country-managers/:id/analytics/sales-trends
  const salesTrendsMatch = pathname.match(/^\/api\/country-managers\/([^/]+)\/analytics\/sales-trends$/);
  if (salesTrendsMatch && method === 'GET') {
    return jsonResponse({
      trend_data: [
        { period: "Week 1", revenue: 2800000, orders: 20, retailers: 46 },
        { period: "Week 2", revenue: 3100000, orders: 24, retailers: 47 },
        { period: "Week 3", revenue: 3300000, orders: 26, retailers: 48 },
        { period: "Week 4", revenue: 3250000, orders: 26, retailers: 48 }
      ],
      top_products: [
        { name: "Huddo Air Classic", quantity: 320, revenue: 959680 },
        { name: "Huddo Elegant Derby", quantity: 180, revenue: 899820 }
      ],
      top_categories: [
        { name: "Sports Shoes", revenue: 4500000 },
        { name: "Formal Shoes", revenue: 3800000 }
      ],
      peak_period: { label: "Week 3", revenue: 3300000 },
      lowest_period: { label: "Week 1", revenue: 2800000 }
    });
  }

  // If no match was found, return null so main fetch interceptor can handle or fallback
  return null;
}
