// HUDDO-UPDATE: Core — Mock API engine intercepting fetch globally
import { refreshAccessToken, forceLoginRedirect } from './utils/authSession';
import { GEOGRAPHY, initialOrders, initialInvoices, initialEmployees, initialRetailers, initialInventory, initialDepartmentsDetails } from './mockData';
// CM-MODULE: Import simulated Country Manager endpoints
import { handleCountryManagerApi } from './modules/country-manager/mockApiCM';
// PROMO-MODULE: Import simulated Promoter endpoints
import { handlePromoterApi } from './modules/promoter/mockApiPromo';


const geoLabel = (value, fallback = '') => {
  if (value == null || value === '') return fallback;
  if (typeof value === 'object') return value.name || fallback;
  return String(value);
};

// Helper to initialize local storage data if not present
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

// Initialize persistent mock collections
let orders = getOrSetLocal('huddo_orders', initialOrders);
let invoices = getOrSetLocal('huddo_invoices', initialInvoices);
let employees = getOrSetLocal('huddo_employees', initialEmployees);
let retailers = getOrSetLocal('huddo_retailers', initialRetailers);
let inventory = getOrSetLocal('huddo_inventory', initialInventory);
let departments = getOrSetLocal('huddo_departments', initialDepartmentsDetails);
let returnLogs = getOrSetLocal('huddo_return_logs', []);
let pettyCash = getOrSetLocal('huddo_petty_cash', [
  { id: 1, date: "2026-06-11", description: "Office stationary printing", category: "Stationery", type: "expense", amount: 450.00, created_by: "Rohan Hudda", notes: "Bought from local printing press", receipt_url: null },
  { id: 2, date: "2026-06-10", description: "Client travel reimbursement", category: "Travel", type: "expense", amount: 1500.00, created_by: "Rohan Hudda", notes: "Pune client visit", receipt_url: null },
  { id: 3, date: "2026-06-09", description: "Inbound budget allocation", category: "Miscellaneous", type: "income", amount: 5000.00, created_by: "Rohan Hudda", notes: "Approved by Finance Dept", receipt_url: null }
]);
let billingCustomerInfo = getOrSetLocal('huddo_billing_customer_info', []);

// Communication Settings Mock State
let mockSmtp = getOrSetLocal('huddo_communication_smtp', {
  sender_name: 'Huddo Shoes',
  sender_email: 'noreply@huddoerp.in',
  smtp_host: 'smtp.mailtrap.io',
  smtp_port: 2525,
  smtp_username: 'dummy_username',
  smtp_password: 'dummy_password',
  encryption: 'TLS',
  reply_to: '',
  is_enabled: true
});

let mockSms = getOrSetLocal('huddo_communication_sms', {
  provider_name: 'Twilio',
  api_url: 'https://api.twilio.com',
  api_key: 'dummy_key',
  api_secret_token: 'dummy_token',
  sender_id: 'HUDDOS',
  country_code: '+91',
  is_enabled: true
});

let mockWhatsapp = getOrSetLocal('huddo_communication_whatsapp', {
  provider: 'Twilio',
  phone_number_id: '123456789',
  business_phone_number: '+14155238886',
  access_token: 'dummy_token',
  api_version: 'v19.0',
  webhook_url: 'http://localhost:5000/api/v1/whatsapp/webhook',
  is_enabled: true
});

let mockGlobalPref = getOrSetLocal('huddo_communication_global', {
  enable_emails: true,
  enable_sms: true,
  enable_whatsapp: true,
  enable_otp: true,
  enable_marketing: true,
  enable_transactional: true
});

let mockLogs = getOrSetLocal('huddo_communication_logs', [
  {
    id: 'LOG-1001',
    timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
    type: 'Email',
    recipient: 'founder@huddoerp.in',
    subject_template: 'Welcome Email',
    status: 'Sent',
    provider_response: '{"messageId":"<mock-id-1234@huddoerp.in>"}',
    sent_by: { name: 'Rohan Hudda', email: 'rohan@huddoerp.in' }
  },
  {
    id: 'LOG-1002',
    timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
    type: 'SMS',
    recipient: '+919876543210',
    subject_template: 'OTP SMS',
    status: 'Sent',
    provider_response: '{"sid":"SMabc123"}',
    sent_by: { name: 'Rohan Hudda', email: 'rohan@huddoerp.in' }
  },
  {
    id: 'LOG-1003',
    timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
    type: 'WhatsApp',
    recipient: 'whatsapp:+919876543210',
    subject_template: 'OTP WhatsApp',
    status: 'Failed',
    provider_response: 'Twilio Auth failure: Invalid Account SID',
    sent_by: { name: 'Rohan Hudda', email: 'rohan@huddoerp.in' }
  }
]);

let mockTemplates = getOrSetLocal('huddo_communication_templates', [
  {
    id: 'TEMP-1',
    name: 'Welcome Email',
    slug: 'welcome_email',
    type: 'email',
    subject: 'Welcome to {{company_name}}!',
    body: 'Hello {{user_name}},\n\nWelcome to {{company_name}}! We are thrilled to have you join us. Your account is now active.\n\nBest regards,\nThe Team',
    variables: ['user_name', 'company_name']
  },
  {
    id: 'TEMP-2',
    name: 'Password Reset',
    slug: 'password_reset',
    type: 'email',
    subject: 'Reset Your Password - {{company_name}}',
    body: 'Hello {{user_name}},\n\nWe received a request to reset your password. Use the OTP below to complete the reset:\n\nOTP: {{otp}}\n\nThis OTP is valid for 15 minutes.\n\nIf you did not request this, please ignore this email.',
    variables: ['user_name', 'company_name', 'otp']
  },
  {
    id: 'TEMP-3',
    name: 'OTP Email',
    slug: 'otp_email',
    type: 'email',
    subject: 'Your Verification OTP - {{company_name}}',
    body: 'Hello {{user_name}},\n\nYour OTP for verification is: {{otp}}\n\nThis is valid for 10 minutes. Do not share this OTP with anyone.',
    variables: ['user_name', 'company_name', 'otp']
  },
  {
    id: 'TEMP-4',
    name: 'OTP SMS',
    slug: 'otp_sms',
    type: 'sms',
    body: 'Your {{company_name}} verification OTP is {{otp}}. Valid for 10 minutes.',
    variables: ['company_name', 'otp']
  },
  {
    id: 'TEMP-5',
    name: 'OTP WhatsApp',
    slug: 'otp_whatsapp',
    type: 'whatsapp',
    body: 'Your {{company_name}} verification OTP is {{otp}}. Valid for 10 minutes.',
    variables: ['company_name', 'otp']
  },
  {
    id: 'TEMP-6',
    name: 'Appointment Confirmation',
    slug: 'appointment_confirmation',
    type: 'email',
    subject: 'Appointment Confirmed - {{company_name}}',
    body: 'Hello {{user_name}},\n\nYour appointment has been confirmed for {{date}}.\n\nThank you for choosing {{company_name}}.',
    variables: ['user_name', 'company_name', 'date']
  },
  {
    id: 'TEMP-7',
    name: 'Order Confirmation',
    slug: 'order_confirmation',
    type: 'email',
    subject: 'Order Confirmed: #{{order_id}}',
    body: 'Hello {{user_name}},\n\nThank you for your order! Your order #{{order_id}} has been received and is being processed.\nOrder Date: {{date}}\nTotal Amount: {{amount}}\n\nWe will notify you when it ships.',
    variables: ['user_name', 'order_id', 'date', 'amount']
  },
  {
    id: 'TEMP-8',
    name: 'Invoice',
    slug: 'invoice',
    type: 'email',
    subject: 'Invoice {{invoice_no}} from {{company_name}}',
    body: 'Hello {{user_name}},\n\nPlease find attached invoice {{invoice_no}} for your order.\nInvoice Date: {{date}}\nTotal Amount Due: {{amount}}\n\nThank you for your business!',
    variables: ['user_name', 'invoice_no', 'date', 'amount', 'company_name']
  },
  {
    id: 'TEMP-9',
    name: 'Payment Success',
    slug: 'payment_success',
    type: 'email',
    subject: 'Payment Received: Invoice {{invoice_no}}',
    body: 'Hello {{user_name}},\n\nWe have successfully processed your payment of {{amount}} for invoice {{invoice_no}} on {{date}}.\n\nThank you for your payment!',
    variables: ['user_name', 'invoice_no', 'amount', 'date']
  },
  {
    id: 'TEMP-10',
    name: 'Payment Failed',
    slug: 'payment_failed',
    type: 'email',
    subject: 'Payment Failed: Invoice {{invoice_no}}',
    body: 'Hello {{user_name}},\n\nWe were unable to process your payment of {{amount}} for invoice {{invoice_no}} on {{date}}. Please update your payment method or try again.',
    variables: ['user_name', 'invoice_no', 'amount', 'date']
  },
  {
    id: 'TEMP-11',
    name: 'Inventory Low Stock Alert',
    slug: 'inventory_low_stock_alert',
    type: 'email',
    subject: 'ALERT: Low Stock for {{product_name}}',
    body: 'Hello Team,\n\nThis is an automated alert that the stock for {{product_name}} has dropped below the threshold. Current stock level: {{amount}}.\nDate: {{date}}.\n\nPlease place a purchase order soon.',
    variables: ['product_name', 'amount', 'date']
  },
  {
    id: 'TEMP-12',
    name: 'Purchase Order',
    slug: 'purchase_order',
    type: 'email',
    subject: 'Purchase Order {{order_id}} - {{company_name}}',
    body: 'Hello Partner,\n\nPlease find attached our purchase order {{order_id}} generated on {{date}}.\n\nKindly acknowledge receipt and confirm shipment date.',
    variables: ['order_id', 'date', 'company_name']
  },
  {
    id: 'TEMP-13',
    name: 'Shipment Status',
    slug: 'shipment_status',
    type: 'email',
    subject: 'Shipment Update: Order #{{order_id}}',
    body: 'Hello {{user_name}},\n\nGood news! Your order #{{order_id}} has been shipped on {{date}}.\n\nThank you for choosing us!',
    variables: ['user_name', 'order_id', 'date']
  },
  {
    id: 'TEMP-14',
    name: 'Custom Notification',
    slug: 'custom_notification',
    type: 'email',
    subject: 'Notification from {{company_name}}',
    body: 'Hello {{user_name}},\n\n{{date}}: This is a custom notification sent from the administration panel.',
    variables: ['user_name', 'company_name', 'date']
  }
]);

// Backup the original window.fetch
const originalFetch = window.fetch;
window.originalFetch = originalFetch;

// Custom Mock Fetch Interceptor
window.fetch = async function (input, init) {
  let url = typeof input === 'string' ? input : input.url;
  
  if (!url.startsWith('/api/')) {
    return originalFetch.apply(this, arguments);
  }

  // ────────────────────────────────────────────────────────────────────────
  // BACKEND REDIRECT BRIDGE
  // ────────────────────────────────────────────────────────────────────────
  try {
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const backendPath = url.startsWith('/api/v1')
      ? url
      : url.replace(/^\/api/, '/api/v1');
    const backendUrl = `${apiBaseUrl}${backendPath}`;
    const headers = { ...(init && init.headers) };
    
    // Auto-set content type for JSON if body is present and not form-data
    if (init && init.body && typeof init.body === 'string' && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    
    const token = localStorage.getItem('huddo_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await originalFetch(backendUrl, {
      ...init,
      headers
    });

    if (response.status === 401) {
      const isAuthEndpoint = backendUrl.includes('/auth/login')
        || backendUrl.includes('/auth/refresh-token')
        || backendUrl.includes('/auth/register');

      if (!isAuthEndpoint) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          const newToken = localStorage.getItem('huddo_token');
          if (newToken) {
            headers.Authorization = `Bearer ${newToken}`;
          }
          return originalFetch(backendUrl, { ...init, headers });
        }
      }

      console.warn('[Mock API Bridge] Session expired. Redirecting to login...');
      forceLoginRedirect();
      return response;
    }

    if (response.ok || (response.status < 500 && response.status !== 404)) {
      return response;
    }
  } catch (error) {
    console.warn("[Mock API Bridge] Backend down or unreachable. Falling back to frontend mock data.", error);
  }

  // Parse HTTP method
  const method = (init && init.method || 'GET').toUpperCase();
  
  let body = null;
  if (init && init.body) {
    if (typeof init.body === 'string') {
      try {
        body = JSON.parse(init.body);
      } catch (e) {
        body = init.body;
      }
    } else {
      body = init.body;
    }
  }

  // Parse FormData if body is a FormData instance
  if (body instanceof FormData) {
    const formDataObj = {};
    for (const [key, value] of body.entries()) {
      formDataObj[key] = value;
    }
    body = formDataObj;
  }
  
  // Query parameters parsing
  const urlObj = new URL(url, window.location.origin);
  const params = Object.fromEntries(urlObj.searchParams.entries());
  const pathname = urlObj.pathname;

  // CM-MODULE: Intercept Country Manager APIs
  const cmResponse = await handleCountryManagerApi(pathname, method, body, params);
  if (cmResponse) {
    return cmResponse;
  }

  // PROMO-MODULE: Intercept Promoter APIs
  const promoResponse = await handlePromoterApi(pathname, method, body, params);
  if (promoResponse) {
    return promoResponse;
  }


  console.log(`[Mock API Interceptor] ${method} ${pathname}`, { params, body });

  // Simulate networking delay
  await new Promise(resolve => setTimeout(resolve, 300));

  // 1. GET /api/hierarchy/state/:id/revenue
  const stateRevenueMatch = pathname.match(/^\/api\/hierarchy\/state\/([^/]+)\/revenue$/);
  if (stateRevenueMatch && method === 'GET') {
    const stateId = stateRevenueMatch[1];
    const stateNode = GEOGRAPHY.states.find(s => s.id === stateId);
    if (!stateNode) {
      return new Response(JSON.stringify({ error: "State not found" }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    
    // Sum of confirmed billing/order revenue for retailers under that state
    // Mapped via retailers belonging to stateName
    const stateRetailers = retailers.filter(r => r.state.toLowerCase() === stateNode.name.toLowerCase());
    const stateRetailerNames = stateRetailers.map(r => r.shopName.toLowerCase());
    
    const confirmedOrders = orders.filter(o => 
      stateRetailerNames.includes(o.retailerName.toLowerCase()) && 
      ['delivered', 'shipped', 'approved', 'processing'].includes(o.status.toLowerCase())
    );
    
    const totalRevenue = confirmedOrders.reduce((sum, o) => sum + o.amount, 0);
    return new Response(JSON.stringify({ state: stateNode.name, revenue: totalRevenue }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // 2. GET /api/hierarchy/city/:id/revenue
  const cityRevenueMatch = pathname.match(/^\/api\/hierarchy\/city\/([^/]+)\/revenue$/);
  if (cityRevenueMatch && method === 'GET') {
    const cityId = cityRevenueMatch[1];
    const cityNode = GEOGRAPHY.cities.find(c => c.id === cityId);
    if (!cityNode) {
      return new Response(JSON.stringify({ error: "City not found" }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    
    const cityRetailers = retailers.filter(r => r.city.toLowerCase() === cityNode.name.toLowerCase());
    const cityRetailerNames = cityRetailers.map(r => r.shopName.toLowerCase());
    
    const confirmedOrders = orders.filter(o => 
      cityRetailerNames.includes(o.retailerName.toLowerCase()) && 
      ['delivered', 'shipped', 'approved', 'processing'].includes(o.status.toLowerCase())
    );
    
    const totalRevenue = confirmedOrders.reduce((sum, o) => sum + o.amount, 0);
    return new Response(JSON.stringify({ city: cityNode.name, revenue: totalRevenue }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // GET /api/departments
  if (pathname === '/api/departments' && method === 'GET') {
    return new Response(JSON.stringify({
      success: true,
      message: "Departments retrieved successfully.",
      data: departments
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // POST /api/departments
  if (pathname === '/api/departments' && method === 'POST') {
    if (!body || !body.name) {
      return new Response(JSON.stringify({ error: "Department Name is required" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    
    const newId = body.name.replace(/\s+/g, '');
    const newDept = {
      _id: newId,
      id: newId,
      name: body.name,
      code: body.code || "",
      head: body.head || "Not Assigned",
      members: 0,
      teams: 0,
      icon: "Users",
      features: body.features || { "Attendance Tracking": true, "Performance Reviews": true },
      is_active: true
    };
    
    departments = [...departments, newDept];
    localStorage.setItem('huddo_departments', JSON.stringify(departments));
    return new Response(JSON.stringify({
      success: true,
      message: "Department created successfully.",
      data: newDept
    }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  // PUT /api/departments/:id
  const deptUpdateMatch = pathname.match(/^\/api\/departments\/([^/]+)$/);
  if (deptUpdateMatch && method === 'PUT') {
    const deptId = deptUpdateMatch[1];
    const idx = departments.findIndex(d => d.id === deptId || d._id === deptId);
    if (idx === -1) {
      return new Response(JSON.stringify({ error: "Department not found" }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    departments[idx] = {
      ...departments[idx],
      ...body
    };

    localStorage.setItem('huddo_departments', JSON.stringify(departments));
    return new Response(JSON.stringify({
      success: true,
      message: "Department updated successfully.",
      data: departments[idx]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // GET /api/employees
  if (pathname === '/api/employees' && method === 'GET') {
    return new Response(JSON.stringify({
      success: true,
      message: "Employees retrieved successfully.",
      data: employees
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // 4. POST /api/inventory/qr-in
  if (pathname === '/api/inventory/qr-in' && method === 'POST') {
    const { product_id, quantity } = body;
    if (!product_id || !quantity) {
      return new Response(JSON.stringify({ error: "Product ID and Quantity are required" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    
    inventory = inventory.map(item => {
      if (item.id === product_id) {
        const newLevel = item.stockLevel + Number(quantity);
        return {
          ...item,
          stockLevel: newLevel,
          status: newLevel <= item.reorderLevel ? (newLevel === 0 ? 'Out of Stock' : 'Low Stock') : 'Normal'
        };
      }
      return item;
    });
    localStorage.setItem('huddo_inventory', JSON.stringify(inventory));
    return new Response(JSON.stringify({ success: true, inventory }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // 5. POST /api/inventory/qr-out
  if (pathname === '/api/inventory/qr-out' && method === 'POST') {
    const { product_id, quantity } = body;
    if (!product_id || !quantity) {
      return new Response(JSON.stringify({ error: "Product ID and Quantity are required" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    
    const targetItem = inventory.find(item => item.id === product_id);
    if (!targetItem) {
      return new Response(JSON.stringify({ error: "Product not found in stock ledger" }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    
    if (targetItem.stockLevel < Number(quantity)) {
      return new Response(JSON.stringify({ error: `Insufficient stock! Current stock: ${targetItem.stockLevel}` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    
    inventory = inventory.map(item => {
      if (item.id === product_id) {
        const newLevel = item.stockLevel - Number(quantity);
        return {
          ...item,
          stockLevel: newLevel,
          status: newLevel <= item.reorderLevel ? (newLevel === 0 ? 'Out of Stock' : 'Low Stock') : 'Normal'
        };
      }
      return item;
    });
    localStorage.setItem('huddo_inventory', JSON.stringify(inventory));
    return new Response(JSON.stringify({ success: true, inventory }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // 6. GET /api/promoters/:id/revenue-billings
  const promoterRevenueMatch = pathname.match(/^\/api\/promoters\/([^/]+)\/revenue-billings$/);
  if (promoterRevenueMatch && method === 'GET') {
    const promoterId = promoterRevenueMatch[1];
    // Find promoter's retailers
    const mappedRetailerNames = retailers
      .filter(r => r.promoter && r.promoter.toLowerCase() === promoterId.toLowerCase())
      .map(r => r.shopName.toLowerCase());
      
    // Find billings linked to these retailers
    const matchedInvoices = invoices.filter(inv => mappedRetailerNames.includes(inv.shopName.toLowerCase()));
    
    // Enrich with city details
    const enrichedInvoices = matchedInvoices.map(inv => {
      const retailerNode = retailers.find(r => r.shopName.toLowerCase() === inv.shopName.toLowerCase());
      return {
        ...inv,
        city: retailerNode ? retailerNode.city : "Unknown"
      };
    });
    
    return new Response(JSON.stringify(enrichedInvoices), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // 7. PATCH /api/billing/:id/get-percentage
  const billingPercentMatch = pathname.match(/^\/api\/billing\/([^/]+)\/get-percentage$/);
  if (billingPercentMatch && method === 'PATCH') {
    const invoiceId = billingPercentMatch[1];
    const { percentage } = body;
    
    invoices = invoices.map(inv => {
      if (inv.id === invoiceId) {
        const newTax = Math.round(inv.amount * (Number(percentage) / 100));
        const newTotal = inv.amount + newTax;
        return {
          ...inv,
          overridePercentage: Number(percentage),
          tax: newTax,
          total: newTotal
        };
      }
      return inv;
    });
    localStorage.setItem('huddo_invoices', JSON.stringify(invoices));
    
    const updatedInvoice = invoices.find(inv => inv.id === invoiceId);
    return new Response(JSON.stringify(updatedInvoice), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // 8. GET /api/inventory/return-stock
  if (pathname === '/api/inventory/return-stock' && method === 'GET') {
    return new Response(JSON.stringify(returnLogs), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // 8. POST /api/inventory/return-stock
  if (pathname === '/api/inventory/return-stock' && method === 'POST') {
    const { product_id, quantity, reason, reference_no, notes, returned_by } = body;
    if (!product_id || !quantity) {
      return new Response(JSON.stringify({ error: "Product and Quantity are required" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const targetItem = inventory.find(item => item.id === product_id);
    if (!targetItem) {
      return new Response(JSON.stringify({ error: "Product variant not found" }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    // Update stock Level
    inventory = inventory.map(item => {
      if (item.id === product_id) {
        const newLevel = item.stockLevel + Number(quantity);
        return {
          ...item,
          stockLevel: newLevel,
          status: newLevel <= item.reorderLevel ? (newLevel === 0 ? 'Out of Stock' : 'Low Stock') : 'Normal'
        };
      }
      return item;
    });
    localStorage.setItem('huddo_inventory', JSON.stringify(inventory));

    // Log the return
    const newLog = {
      id: `RET-LOG-${returnLogs.length + 1001}`,
      product_id,
      productName: targetItem.name,
      sku: targetItem.sku,
      quantity: Number(quantity),
      reason,
      reference_no: reference_no || "N/A",
      notes: notes || "",
      returned_by: returned_by || "Rohan Hudda",
      created_at: new Date().toISOString()
    };
    returnLogs = [newLog, ...returnLogs];
    localStorage.setItem('huddo_return_logs', JSON.stringify(returnLogs));

    return new Response(JSON.stringify({ success: true, log: newLog }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  // 9. GET /api/customers
  if (pathname === '/api/customers' && method === 'GET') {
    // Generate Customer database dynamically from billing invoices
    // Retailers mapping holds details for retailers, let's also seed some end-consumers from billing_customer_info
    const customerDb = [...billingCustomerInfo];
    
    // Filter and search
    let results = customerDb;
    if (params.search) {
      const query = params.search.toLowerCase();
      results = results.filter(c => 
        c.customer_name.toLowerCase().includes(query) || 
        c.mobile.includes(query)
      );
    }
    if (params.city && params.city !== 'All') {
      results = results.filter(c => c.city.toLowerCase() === params.city.toLowerCase());
    }

    return new Response(JSON.stringify(results), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // 10. GET /api/customers/:id
  const customerDetailMatch = pathname.match(/^\/api\/customers\/([^/]+)$/);
  if (customerDetailMatch && method === 'GET') {
    const customerId = customerDetailMatch[1];
    const customer = billingCustomerInfo.find(c => c.id === customerId);
    if (!customer) {
      return new Response(JSON.stringify({ error: "Customer not found" }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    // Get order history from invoices/billing customer mappings
    const history = invoices.filter(inv => inv.customer_mobile === customer.mobile);
    return new Response(JSON.stringify({ customer, history }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // 11. GET /api/petty-cash
  if (pathname === '/api/petty-cash' && method === 'GET') {
    let list = [...pettyCash];
    if (params.type && params.type !== 'All') {
      list = list.filter(item => item.type === params.type.toLowerCase());
    }
    if (params.category && params.category !== 'All') {
      list = list.filter(item => item.category.toLowerCase() === params.category.toLowerCase());
    }
    if (params.startDate && params.endDate) {
      list = list.filter(item => item.date >= params.startDate && item.date <= params.endDate);
    }
    return new Response(JSON.stringify(list), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // 12. GET /api/petty-cash/summary
  if (pathname === '/api/petty-cash/summary' && method === 'GET') {
    let list = [...pettyCash];
    if (params.startDate && params.endDate) {
      list = list.filter(item => item.date >= params.startDate && item.date <= params.endDate);
    }
    
    const totalIn = list.filter(item => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
    const totalOut = list.filter(item => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
    const netBalance = totalIn - totalOut;

    return new Response(JSON.stringify({ totalIn, totalOut, netBalance }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // Helper to convert File to base64 DataURL in mock environment
  const fileToDataURL = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  };

  // 13. POST /api/petty-cash/add
  if (pathname === '/api/petty-cash/add' && method === 'POST') {
    const { date, description, amount, type, category, notes, receipt } = body;
    if (!description || !amount || !type || !category) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    let receipt_image = null;
    if (body.receipt_image instanceof File) {
      // Check size limit: 5MB
      if (body.receipt_image.size > 5 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: "File size exceeds the 5 MB limit." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      // Check file type
      const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
      const fileExt = body.receipt_image.name.split('.').pop().toLowerCase();
      if (!allowedExts.includes(fileExt)) {
        return new Response(JSON.stringify({ error: "Invalid file type. Only JPG, JPEG, PNG, WEBP, and PDF are allowed." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      receipt_image = await fileToDataURL(body.receipt_image);
    }

    const newId = pettyCash.length > 0 ? Math.max(...pettyCash.map(item => item.id)) + 1 : 1;

    const newEntry = {
      id: newId,
      date: date || new Date().toISOString().split('T')[0],
      description,
      amount: Number(amount),
      type,
      category,
      notes: notes || "",
      created_by: "Rohan Hudda",
      receipt_url: receipt || null,
      receipt_image: receipt_image,
      created_at: new Date().toISOString()
    };

    pettyCash = [newEntry, ...pettyCash];
    localStorage.setItem('huddo_petty_cash', JSON.stringify(pettyCash));
    return new Response(JSON.stringify(newEntry), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  // 13.1 PUT /api/petty-cash/:id
  const pettyCashEditMatch = pathname.match(/^\/api\/petty-cash\/([^/]+)$/);
  if (pettyCashEditMatch && method === 'PUT') {
    const id = pettyCashEditMatch[1];
    const index = pettyCash.findIndex(item => String(item.id) === String(id));
    if (index === -1) {
      return new Response(JSON.stringify({ error: "Transaction not found" }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const { date, description, amount, type, category, notes, receipt, delete_image } = body;

    const entry = pettyCash[index];
    if (description !== undefined) entry.description = description;
    if (amount !== undefined) entry.amount = Number(amount);
    if (type !== undefined) entry.type = type;
    if (category !== undefined) entry.category = category;
    if (notes !== undefined) entry.notes = notes;
    if (receipt !== undefined) entry.receipt_url = receipt;
    if (date !== undefined) entry.date = date;

    if (body.receipt_image instanceof File) {
      // Check size limit: 5MB
      if (body.receipt_image.size > 5 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: "File size exceeds the 5 MB limit." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      // Check file type
      const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
      const fileExt = body.receipt_image.name.split('.').pop().toLowerCase();
      if (!allowedExts.includes(fileExt)) {
        return new Response(JSON.stringify({ error: "Invalid file type. Only JPG, JPEG, PNG, WEBP, and PDF are allowed." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      entry.receipt_image = await fileToDataURL(body.receipt_image);
    } else if (delete_image === 'true' || delete_image === true) {
      entry.receipt_image = null;
    }

    pettyCash[index] = entry;
    localStorage.setItem('huddo_petty_cash', JSON.stringify(pettyCash));
    return new Response(JSON.stringify(entry), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // 13.2 DELETE /api/petty-cash/:id
  const pettyCashDeleteMatch = pathname.match(/^\/api\/petty-cash\/([^/]+)$/);
  if (pettyCashDeleteMatch && method === 'DELETE') {
    const id = pettyCashDeleteMatch[1];
    const index = pettyCash.findIndex(item => String(item.id) === String(id));
    if (index === -1) {
      return new Response(JSON.stringify({ error: "Transaction not found" }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    pettyCash.splice(index, 1);
    localStorage.setItem('huddo_petty_cash', JSON.stringify(pettyCash));
    return new Response(JSON.stringify({ success: true, message: "Transaction deleted successfully" }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // 14. POST /api/billing/retailer/customer-info (Internal helper to link customer during invoice generation)
  if (pathname === '/api/billing/retailer/customer-info' && method === 'POST') {
    const { invoice_id, customer_name, mobile, email, city, amount } = body;
    
    const customerRecord = {
      id: `CUST-${billingCustomerInfo.length + 101}`,
      customer_name,
      mobile,
      email: email || "N/A",
      city,
      totalOrders: 1,
      totalSpend: Number(amount),
      lastOrderDate: new Date().toISOString().split('T')[0]
    };
    
    // Check if customer already exists by mobile
    const existingIdx = billingCustomerInfo.findIndex(c => c.mobile === mobile);
    if (existingIdx > -1) {
      const existing = billingCustomerInfo[existingIdx];
      billingCustomerInfo[existingIdx] = {
        ...existing,
        totalOrders: existing.totalOrders + 1,
        totalSpend: existing.totalSpend + Number(amount),
        lastOrderDate: new Date().toISOString().split('T')[0]
      };
    } else {
      billingCustomerInfo = [...billingCustomerInfo, customerRecord];
    }
    
    localStorage.setItem('huddo_billing_customer_info', JSON.stringify(billingCustomerInfo));
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // ==========================================
  // COMMUNICATION SETTINGS MOCK ENDPOINTS
  // ==========================================
  if (pathname === '/api/communication-settings' && method === 'GET') {
    const smtpMasked = { ...mockSmtp, smtp_password: mockSmtp.smtp_password ? '••••••••' : '' };
    const smsMasked = { ...mockSms, api_key: mockSms.api_key ? '••••••••' : '', api_secret_token: mockSms.api_secret_token ? '••••••••' : '' };
    const waMasked = { ...mockWhatsapp, access_token: mockWhatsapp.access_token ? '••••••••' : '' };

    return new Response(JSON.stringify({
      success: true,
      data: {
        smtp: smtpMasked,
        sms: smsMasked,
        whatsapp: waMasked,
        global: mockGlobalPref
      }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  if (pathname === '/api/communication-settings/smtp' && method === 'POST') {
    const updated = { ...body };
    if (updated.smtp_password === '••••••••') {
      updated.smtp_password = mockSmtp.smtp_password;
    }
    mockSmtp = updated;
    localStorage.setItem('huddo_communication_smtp', JSON.stringify(mockSmtp));
    return new Response(JSON.stringify({ success: true, message: 'SMTP settings saved' }), { status: 200 });
  }

  if (pathname === '/api/communication-settings/sms' && method === 'POST') {
    const updated = { ...body };
    if (updated.api_key === '••••••••') updated.api_key = mockSms.api_key;
    if (updated.api_secret_token === '••••••••') updated.api_secret_token = mockSms.api_secret_token;
    mockSms = updated;
    localStorage.setItem('huddo_communication_sms', JSON.stringify(mockSms));
    return new Response(JSON.stringify({ success: true, message: 'SMS settings saved' }), { status: 200 });
  }

  if (pathname === '/api/communication-settings/whatsapp' && method === 'POST') {
    const updated = { ...body };
    if (updated.access_token === '••••••••') updated.access_token = mockWhatsapp.access_token;
    mockWhatsapp = updated;
    localStorage.setItem('huddo_communication_whatsapp', JSON.stringify(mockWhatsapp));
    return new Response(JSON.stringify({ success: true, message: 'WhatsApp settings saved' }), { status: 200 });
  }

  if (pathname === '/api/communication-settings/global' && method === 'POST') {
    mockGlobalPref = body;
    localStorage.setItem('huddo_communication_global', JSON.stringify(mockGlobalPref));
    return new Response(JSON.stringify({ success: true, data: mockGlobalPref }), { status: 200 });
  }

  if (pathname === '/api/communication-settings/reveal' && method === 'POST') {
    const { type, field } = body;
    let val = '';
    if (type === 'smtp' && field === 'smtp_password') val = mockSmtp.smtp_password;
    if (type === 'sms' && field === 'api_key') val = mockSms.api_key;
    if (type === 'sms' && field === 'api_secret_token') val = mockSms.api_secret_token;
    if (type === 'whatsapp' && field === 'access_token') val = mockWhatsapp.access_token;

    return new Response(JSON.stringify({ success: true, value: val }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  if (pathname === '/api/communication-settings/test-email' && method === 'POST') {
    const { recipient_email } = body;
    const newLog = {
      id: `LOG-${1000 + mockLogs.length + 1}`,
      timestamp: new Date().toISOString(),
      type: 'Email',
      recipient: recipient_email,
      subject_template: 'SMTP configuration Test Email',
      status: 'Sent',
      provider_response: 'Mock Test successful (Vite Frontend Development Mode)',
      sent_by: { name: 'Rohan Hudda', email: 'rohan@huddoerp.in' }
    };
    mockLogs = [newLog, ...mockLogs];
    localStorage.setItem('huddo_communication_logs', JSON.stringify(mockLogs));
    return new Response(JSON.stringify({ success: true, message: 'Test email simulated successfully!' }), { status: 200 });
  }

  if (pathname === '/api/communication-settings/test-sms' && method === 'POST') {
    const { recipient_mobile } = body;
    const newLog = {
      id: `LOG-${1000 + mockLogs.length + 1}`,
      timestamp: new Date().toISOString(),
      type: 'SMS',
      recipient: recipient_mobile,
      subject_template: 'SMS Provider Test',
      status: 'Sent',
      provider_response: 'Mock Test successful (Vite Frontend Development Mode)',
      sent_by: { name: 'Rohan Hudda', email: 'rohan@huddoerp.in' }
    };
    mockLogs = [newLog, ...mockLogs];
    localStorage.setItem('huddo_communication_logs', JSON.stringify(mockLogs));
    return new Response(JSON.stringify({ success: true, message: 'Test SMS simulated successfully!' }), { status: 200 });
  }

  if (pathname === '/api/communication-settings/test-whatsapp' && method === 'POST') {
    const { recipient_mobile } = body;
    const newLog = {
      id: `LOG-${1000 + mockLogs.length + 1}`,
      timestamp: new Date().toISOString(),
      type: 'WhatsApp',
      recipient: recipient_mobile,
      subject_template: 'WhatsApp API Connection Test',
      status: 'Sent',
      provider_response: 'Mock Test successful (Vite Frontend Development Mode)',
      sent_by: { name: 'Rohan Hudda', email: 'rohan@huddoerp.in' }
    };
    mockLogs = [newLog, ...mockLogs];
    localStorage.setItem('huddo_communication_logs', JSON.stringify(mockLogs));
    return new Response(JSON.stringify({ success: true, message: 'Test WhatsApp message simulated successfully!' }), { status: 200 });
  }

  if (pathname === '/api/communication-settings/logs' && method === 'GET') {
    const { page = 1, limit = 10, search = '', type = '', status = '' } = params;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    let filtered = [...mockLogs];
    if (type) filtered = filtered.filter(l => l.type === type);
    if (status) filtered = filtered.filter(l => l.status === status);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(l => 
        l.recipient.toLowerCase().includes(q) ||
        l.subject_template.toLowerCase().includes(q) ||
        l.provider_response.toLowerCase().includes(q)
      );
    }

    const paginated = filtered.slice(skip, skip + limitNum);

    return new Response(JSON.stringify({
      success: true,
      data: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filtered.length,
        pages: Math.ceil(filtered.length / limitNum)
      }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  if (pathname.startsWith('/api/communication-settings/logs/retry/') && method === 'POST') {
    const logId = pathname.split('/').pop();
    const idx = mockLogs.findIndex(l => String(l.id) === String(logId));
    if (idx === -1) {
      return new Response(JSON.stringify({ error: "Log not found" }), { status: 404 });
    }
    mockLogs[idx] = {
      ...mockLogs[idx],
      status: 'Sent',
      timestamp: new Date().toISOString(),
      provider_response: 'Retry successful (Mock Mode)'
    };
    localStorage.setItem('huddo_communication_logs', JSON.stringify(mockLogs));
    return new Response(JSON.stringify({ success: true, message: 'Message retried successfully!' }), { status: 200 });
  }

  if (pathname === '/api/communication-settings/templates' && method === 'GET') {
    return new Response(JSON.stringify({
      success: true,
      data: mockTemplates
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const templateEditMatch = pathname.match(/^\/api\/communication-settings\/templates\/([^/]+)$/);
  if (templateEditMatch && method === 'PUT') {
    const tempId = templateEditMatch[1];
    const idx = mockTemplates.findIndex(t => String(t.id) === String(tempId));
    if (idx === -1) {
      return new Response(JSON.stringify({ error: "Template not found" }), { status: 404 });
    }
    mockTemplates[idx] = {
      ...mockTemplates[idx],
      subject: body.subject !== undefined ? body.subject : mockTemplates[idx].subject,
      body: body.body !== undefined ? body.body : mockTemplates[idx].body
    };
    localStorage.setItem('huddo_communication_templates', JSON.stringify(mockTemplates));
    return new Response(JSON.stringify({ success: true, data: mockTemplates[idx] }), { status: 200 });
  }

  // Profile Mock Endpoints
  if (pathname === '/api/profile' && method === 'GET') {
    const cachedUser = localStorage.getItem('huddo_user');
    let userProfile = {};
    try {
      userProfile = cachedUser ? JSON.parse(cachedUser) : {};
    } catch(e) {}
    
    const profile = {
      _id: userProfile.id || userProfile._id || "U1",
      name: userProfile.name || "Rohan Hudda",
      email: userProfile.email || "rohan@huddoerp.in",
      mobile: userProfile.mobile || "9876543210",
      alternate_mobile: userProfile.alternate_mobile || "9812345678",
      gender: userProfile.gender || "Male",
      date_of_birth: userProfile.date_of_birth || "1992-05-15",
      blood_group: userProfile.blood_group || "O+",
      marital_status: userProfile.marital_status || "Single",
      profile_photo: userProfile.profile_photo || userProfile.profile_photo_url || "",
      
      role: userProfile.role?.name || userProfile.roleName || "Founder",
      department: userProfile.department?.name || userProfile.departmentName || "Executive",
      designation: userProfile.designation?.title || userProfile.designationName || "Director",
      branch: userProfile.branch || "Mumbai Main HQ",
      reporting_manager: userProfile.reporting_manager?.name || "Board of Directors",
      joining_date: userProfile.joining_date || "2023-01-01",
      employment_status: "Active",
      shift_timing: userProfile.shift_timing || "09:00 AM - 06:00 PM",
      
      address: userProfile.address || "101, Sea Breeze Apartments, Juhu",
      city: geoLabel(userProfile.city, "Mumbai"),
      state: geoLabel(userProfile.state, "Maharashtra"),
      country: geoLabel(userProfile.country, "India"),
      pincode: userProfile.pincode || "400049",
      
      emergency_contact: userProfile.emergency_contact || {
        contact_person: "Mrs. Hudda",
        relationship: "Mother",
        mobile: "9820011223"
      },
      
      employee_id: userProfile.employee_id || "EMP000",
      user_code: "USR-001",
      last_login: new Date().toISOString()
    };

    return new Response(JSON.stringify({ success: true, data: profile }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  if (pathname === '/api/profile' && method === 'PUT') {
    const cachedUser = localStorage.getItem('huddo_user');
    let userProfile = {};
    try {
      userProfile = cachedUser ? JSON.parse(cachedUser) : {};
    } catch(e) {}

    const updatedUser = {
      ...userProfile,
      ...body
    };

    localStorage.setItem('huddo_user', JSON.stringify(updatedUser));
    return new Response(JSON.stringify({ success: true, data: updatedUser }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  if (pathname === '/api/profile/upload-photo' && method === 'POST') {
    const cachedUser = localStorage.getItem('huddo_user');
    let userProfile = {};
    try {
      userProfile = cachedUser ? JSON.parse(cachedUser) : {};
    } catch(e) {}

    const mockPhoto = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150";
    const updatedUser = {
      ...userProfile,
      profile_photo: mockPhoto
    };

    localStorage.setItem('huddo_user', JSON.stringify(updatedUser));
    return new Response(JSON.stringify({ success: true, data: { profile_photo: mockPhoto } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  if (pathname === '/api/profile/remove-photo' && method === 'POST') {
    const cachedUser = localStorage.getItem('huddo_user');
    let userProfile = {};
    try {
      userProfile = cachedUser ? JSON.parse(cachedUser) : {};
    } catch(e) {}

    const updatedUser = {
      ...userProfile,
      profile_photo: ""
    };

    localStorage.setItem('huddo_user', JSON.stringify(updatedUser));
    return new Response(JSON.stringify({ success: true, data: { profile_photo: "" } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // Fallback to normal fetch
  return originalFetch.apply(this, arguments);
};
