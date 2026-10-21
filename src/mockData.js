// Huddo Shoes ERP Mock Database

// Indian Cities & States mapping for realistic distribution
export const GEOGRAPHY = {
  countries: [
    { id: "C1", name: "India", manager: "Rajesh Sharma", statesCount: 5, retailersCount: 48, revenue: 12450000 }
  ],
  states: [
    { id: "S1", name: "Maharashtra", country: "India", manager: "Anil Deshmukh", citiesCount: 4, retailersCount: 15, revenue: 4500000 },
    { id: "S2", name: "Delhi", country: "India", manager: "Preeti Verma", citiesCount: 1, retailersCount: 10, revenue: 3200000 },
    { id: "S3", name: "Karnataka", country: "India", manager: "Kiran Kumar", citiesCount: 3, retailersCount: 9, revenue: 2100000 },
    { id: "S4", name: "Gujarat", country: "India", manager: "Vijay Patel", citiesCount: 3, retailersCount: 8, revenue: 1650000 },
    { id: "S5", name: "Tamil Nadu", country: "India", manager: "S. Swaminathan", citiesCount: 2, retailersCount: 6, revenue: 1000000 }
  ],
  cities: [
    { id: "CT1", name: "Mumbai", state: "Maharashtra", manager: "Sanjay Joshi", retailersCount: 8, revenue: 2800000 },
    { id: "CT2", name: "Pune", state: "Maharashtra", manager: "Rahul Shinde", retailersCount: 7, revenue: 1700000 },
    { id: "CT3", name: "New Delhi", state: "Delhi", manager: "Amit Bansal", retailersCount: 10, revenue: 3200000 },
    { id: "CT4", name: "Bengaluru", state: "Karnataka", manager: "Nikhil Gowda", retailersCount: 6, revenue: 1500000 },
    { id: "CT5", name: "Ahmedabad", state: "Gujarat", manager: "Harsh Shah", retailersCount: 5, revenue: 1100000 },
    { id: "CT6", name: "Chennai", state: "Tamil Nadu", manager: "Ravi Chandran", retailersCount: 6, revenue: 1000000 }
  ]
};

// Standard system roles & permission matrix mapping
export const MODULES_LIST = [
  "Dashboard", "Orders", "Retailers", "Products", "Employees", "Teams", "Departments", "Promoters", "Billing", "Commissions", "Sales", "Targets", "Approvals", "Field Tracking", "Notifications", "Reports", "Security", "Inventory"
];

export const PERMISSIONS_LIST = [
  "Create", "View", "Edit", "Delete", "Approve", "Reject", "Export", "Assign"
];

// Predefined Roles list
export const STANDARD_ROLES = [
  "Founder", "CEO", "Admin", "Country Manager", "State Manager", "City Manager", 
  "Sales Manager", "Sales Executive", "Purchase Manager", "Inventory Manager", 
  "Finance Manager", "HR Manager", "Retailer", "Distributor", "Team Member", "Promoter"
];

// Seed Permission Grid for roles (default permissions enabled)
export const initialRolePermissions = STANDARD_ROLES.reduce((acc, role) => {
  acc[role] = MODULES_LIST.reduce((modAcc, mod) => {
    modAcc[mod] = PERMISSIONS_LIST.reduce((permAcc, perm) => {
      // Founder & Admin have full access. CEO has full access except for financial modules.
      if (["Founder", "Admin"].includes(role)) {
        permAcc[perm] = true;
      } else if (role === "CEO") {
        const financialModules = ["Billing", "Commissions", "Sales", "Targets"];
        if (financialModules.includes(mod)) {
          permAcc[perm] = false;
        } else {
          permAcc[perm] = true;
        }
      } else if (role.includes("Manager")) {
        // Managers can view, edit, approve, reject, assign, export
        permAcc[perm] = ["View", "Edit", "Approve", "Reject", "Assign", "Export"].includes(perm);
      } else {
        // Executives / Retailer / Member have restricted access
        permAcc[perm] = ["View"].includes(perm);
      }
      return permAcc;
    }, {});
    return modAcc;
  }, {});
  return acc;
}, {});

// Initial list of Users inside the platform
export const initialUsers = [
  { id: "U1", name: "Rohan Hudda", email: "rohan@huddoerp.in", mobile: "9876543210", role: "Founder", department: "Executive", status: "Active", bank_details: { bank_name: "HDFC Bank", account_no: "50200012345678", ifsc_code: "HDFC0000001", account_holder: "Rohan Hudda", branch_name: "Fort Mumbai", upi_id: "rohan@okhdfcbank" } },
  { id: "U2", name: "Rajesh Sharma", email: "rajesh@huddoerp.in", mobile: "9812345678", role: "Country Manager", department: "Sales", status: "Active", bank_details: { bank_name: "ICICI Bank", account_no: "001105001234", ifsc_code: "ICIC0000011", account_holder: "Rajesh Sharma", branch_name: "Connaught Place Delhi", upi_id: "rajesh@okicici" } },
  { id: "U3", name: "Preeti Verma", email: "preeti@huddoerp.in", mobile: "9988776655", role: "State Manager", department: "Sales", status: "Active", bank_details: { bank_name: "Axis Bank", account_no: "912010012345678", ifsc_code: "UTIB0000025", account_holder: "Preeti Verma", branch_name: "Bandra West Mumbai", upi_id: "preeti@okaxis" } },
  { id: "U4", name: "Sanjay Joshi", email: "sanjay@huddoerp.in", mobile: "9560412345", role: "City Manager", department: "Sales", status: "Active", bank_details: { bank_name: "Kotak Mahindra Bank", account_no: "2311456789", ifsc_code: "KKBK0000456", account_holder: "Sanjay Joshi", branch_name: "Andheri East Mumbai", upi_id: "sanjay@kotak" } },
  { id: "U5", name: "Vikram Malhotra", email: "vikram@huddoerp.in", mobile: "9123456789", role: "Finance Manager", department: "Finance", status: "Active", bank_details: { bank_name: "State Bank of India", account_no: "30501234567", ifsc_code: "SBIN0000300", account_holder: "Vikram Malhotra", branch_name: "Nariman Point Mumbai", upi_id: "vikram@sbi" } },
  { id: "U6", name: "Neha Sen", email: "neha@huddoerp.in", mobile: "9001122334", role: "HR Manager", department: "HR", status: "Active", bank_details: { bank_name: "HDFC Bank", account_no: "50100499887766", ifsc_code: "HDFC0000045", account_holder: "Neha Sen", branch_name: "Indiranagar Bengaluru", upi_id: "neha@okhdfcbank" } },
  { id: "U7", name: "Sunil Mehta", email: "sunil@huddoerp.in", mobile: "9777888999", role: "Inventory Manager", department: "Inventory", status: "Active", bank_details: { bank_name: "Punjab National Bank", account_no: "0123002100045678", ifsc_code: "PUNB0012300", account_holder: "Sunil Mehta", branch_name: "Navrangpura Ahmedabad", upi_id: "sunil@pnb" } },
  { id: "U8", name: "Arjun Dev", email: "arjun@huddoerp.in", mobile: "8889990001", role: "Sales Executive", department: "Sales", status: "Active", bank_details: { bank_name: "Yes Bank", account_no: "002581234567890", ifsc_code: "YESB0000025", account_holder: "Arjun Dev", branch_name: "Koramangala Bengaluru", upi_id: "arjun@yesbank" } },
];

// Employee Details
export const initialEmployees = [
  {
    id: "EMP001",
    name: "Amit Kumar",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    email: "amit.kumar@huddoerp.in",
    mobile: "9988771122",
    department: "Sales",
    designation: "Sales Executive",
    manager: "Sanjay Joshi",
    joiningDate: "2024-01-15",
    status: "Active",
    personalInfo: { address: "Flat 402, Sector 15, Vashi, Navi Mumbai", aadhaar: "4567-8912-3456", pan: "ABCDE1234F" },
    salary_structure: {
      basic: 45000,
      hra: 15000,
      allowances: 5000,
      incentive_pct: 5.0, // 5% incentive on product sales
      incentive_earned: 14500,
      promoter_override_pct: 1.0 // 1% override on assigned promoter network sales
    },
    assigned_promoters: ["Suresh Raina", "Harbhajan Singh"],
    assigned_promoter_ids: [1, 2],
    bank_details: {
      bank_name: "HDFC Bank",
      account_no: "50100412345678",
      ifsc_code: "HDFC0000020",
      account_holder: "Amit Kumar",
      branch_name: "Vashi Sector 15 Navi Mumbai",
      upi_id: "amit@okhdfcbank"
    },
    performance: [ { month: "Jan", target: 500000, achieved: 480000 }, { month: "Feb", target: 500000, achieved: 520000 }, { month: "Mar", target: 550000, achieved: 580000 } ],
    history: [ { date: "2024-01-15", event: "Joined Huddo Shoes as Sales Trainee" }, { date: "2025-01-15", event: "Promoted to Sales Executive" } ]
  },
  {
    id: "EMP002",
    name: "Sunita Rao",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    email: "sunita.rao@huddoerp.in",
    mobile: "9876541212",
    department: "Finance",
    designation: "Finance Executive",
    manager: "Vikram Malhotra",
    joiningDate: "2023-06-10",
    status: "Active",
    personalInfo: { address: "A-50, Prestige Park, Bengaluru", aadhaar: "9876-5432-1098", pan: "WXYZ9876A" },
    salary_structure: {
      basic: 55000,
      hra: 18000,
      allowances: 7000,
      incentive_pct: 3.0,
      incentive_earned: 8200,
      promoter_override_pct: 0.5
    },
    assigned_promoters: [],
    assigned_promoter_ids: [],
    bank_details: {
      bank_name: "ICICI Bank",
      account_no: "000401567890",
      ifsc_code: "ICIC0000004",
      account_holder: "Sunita Rao",
      branch_name: "MG Road Bengaluru",
      upi_id: "sunita@okicici"
    },
    performance: [ { month: "Jan", target: 100, achieved: 100 }, { month: "Feb", target: 100, achieved: 100 }, { month: "Mar", target: 100, achieved: 100 } ],
    history: [ { date: "2023-06-10", event: "Joined Huddo Shoes as Finance Analyst" } ]
  },
  {
    id: "EMP003",
    name: "Karan Johar",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    email: "karan@huddoerp.in",
    mobile: "9560123456",
    department: "Inventory",
    designation: "Warehouse In-charge",
    manager: "Sunil Mehta",
    joiningDate: "2022-09-01",
    status: "Active",
    personalInfo: { address: "12, GIDC Estate, Ahmedabad", aadhaar: "1122-3344-5566", pan: "JKLM4321B" },
    salary_structure: {
      basic: 38000,
      hra: 12000,
      allowances: 4000,
      incentive_pct: 4.0,
      incentive_earned: 9400,
      promoter_override_pct: 0.8
    },
    assigned_promoters: ["Gautam Gambhir"],
    assigned_promoter_ids: [3],
    bank_details: {
      bank_name: "State Bank of India",
      account_no: "30234567890",
      ifsc_code: "SBIN0001822",
      account_holder: "Karan Johar",
      branch_name: "GIDC Vatva Ahmedabad",
      upi_id: "karan@sbi"
    },
    performance: [ { month: "Jan", target: 1000, achieved: 950 }, { month: "Feb", target: 1000, achieved: 1020 }, { month: "Mar", target: 1200, achieved: 1180 } ],
    history: [ { date: "2022-09-01", event: "Joined Huddo Shoes as Inventory Supervisor" } ]
  }
];

// Teams Configuration
export const initialTeams = [
  { id: "T1", name: "Mumbai Mavericks", department: "Sales", leader: "Sanjay Joshi", memberCount: 5, performance: 92, responsibilities: "Covering sales, distributor supply, and retail order collections in Mumbai City." },
  { id: "T2", name: "Bengaluru Blazers", department: "Sales", leader: "Nikhil Gowda", memberCount: 4, performance: 88, responsibilities: "Promotional campaigns, retailer visits, and product distribution in Bengaluru Metropolitan area." },
  { id: "T3", name: "Finance Wizards", department: "Finance", leader: "Vikram Malhotra", memberCount: 3, performance: 96, responsibilities: "Audit trials, invoice collection matching, promoter royalty settlements, and sales tax compliance (GST)." },
  { id: "T4", name: "Stock Sentinels", department: "Inventory", leader: "Sunil Mehta", memberCount: 6, performance: 90, responsibilities: "Warehouse allocations, logistics mapping, low stock notifications, and inbound stock audits." }
];

// Promoters Management
export const initialPromoters = [
  {
    id: "PR01",
    numeric_id: 1,
    name: "Suresh Raina",
    code: "HUDDOPR01",
    mobile: "9820129034",
    email: "suresh@raina.com",
    cities: ["Mumbai", "Pune"],
    retailersAdded: 8,
    revenue: 1540000,
    royaltyEarned: 77000,
    royaltyPending: 15400,
    royaltySettled: 61600,
    status: "Active",
    trained_by: null,
    trainer_name: "None (Master Trainer)",
    training_royalty_percentage: 2.0, // Earns 2% royalty on sales of promoters he trained
    total_training_royalty_earned: 24500,
    assigned_employee: "Amit Kumar",
    bank_details: {
      bank_name: "HDFC Bank",
      account_no: "1234567890",
      ifsc_code: "HDFC0000001",
      account_holder: "Suresh Raina",
      branch_name: "Bandra West Mumbai",
      upi_id: "suresh@okhdfcbank"
    }
  },
  {
    id: "PR02",
    numeric_id: 2,
    name: "Harbhajan Singh",
    code: "HUDDOPR02",
    mobile: "9910456723",
    email: "harbhajan@singh.com",
    cities: ["New Delhi"],
    retailersAdded: 5,
    revenue: 1280000,
    royaltyEarned: 64000,
    royaltyPending: 24000,
    royaltySettled: 40000,
    status: "Active",
    trained_by: "PR01",
    trainer_name: "Suresh Raina (PR01)",
    training_royalty_percentage: 2.0,
    total_training_royalty_earned: 11200,
    assigned_employee: "Amit Kumar",
    bank_details: {
      bank_name: "Punjab National Bank",
      account_no: "9876543210",
      ifsc_code: "PUNB0000002",
      account_holder: "Harbhajan Singh",
      branch_name: "Model Town Jalandhar",
      upi_id: "harbhajan@pnb"
    }
  },
  {
    id: "PR03",
    numeric_id: 3,
    name: "Gautam Gambhir",
    code: "HUDDOPR03",
    mobile: "9560901234",
    email: "gautam@gambhir.com",
    cities: ["Ahmedabad"],
    retailersAdded: 6,
    revenue: 890000,
    royaltyEarned: 44500,
    royaltyPending: 4500,
    royaltySettled: 40000,
    status: "Inactive",
    trained_by: "PR01",
    trainer_name: "Suresh Raina (PR01)",
    training_royalty_percentage: 2.0,
    total_training_royalty_earned: 0,
    assigned_employee: "Karan Johar",
    bank_details: {
      bank_name: "State Bank of India",
      account_no: "4567890123",
      ifsc_code: "SBIN0000003",
      account_holder: "Gautam Gambhir",
      branch_name: "Old Rajinder Nagar New Delhi",
      upi_id: "gautam@sbi"
    }
  }
];

// Product wise Promoter Royalty configuration %
export const initialRoyaltyConfig = [
  { productId: "P1", name: "Huddo Air Classic", category: "Sports Shoes", size: "6-11", royaltyPercent: 5.0, employeeIncentive: 5.0, trainerRoyalty: 2.0 },
  { productId: "P2", name: "Huddo Flex Runner", category: "Sports Shoes", size: "7-12", royaltyPercent: 4.5, employeeIncentive: 4.5, trainerRoyalty: 2.0 },
  { productId: "P3", name: "Huddo Elegant Derby", category: "Formal Shoes", size: "5-10", royaltyPercent: 6.0, employeeIncentive: 6.0, trainerRoyalty: 2.5 },
  { productId: "P4", name: "Huddo Leather Loafer", category: "Casual Shoes", size: "6-11", royaltyPercent: 5.5, employeeIncentive: 5.5, trainerRoyalty: 2.0 },
  { productId: "P5", name: "Huddo Comfort Slide", category: "Sandals", size: "6-12", royaltyPercent: 3.5, employeeIncentive: 3.5, trainerRoyalty: 1.5 },
];

// Retailers Management
export const initialRetailers = [
  {
    id: "RET001",
    shopName: "Walk Easy Footwear",
    owner: "Dinesh Shah",
    email: "dinesh@walkeasy.in",
    mobile: "9821012345",
    address: "Linking Road, Bandra West",
    state: "Maharashtra",
    city: "Mumbai",
    category: "Platinum",
    promoter: "Suresh Raina",
    cityManager: "Sanjay Joshi",
    ordersCount: 14,
    revenue: 1850000,
    status: "Approved",
    gstNo: "27AAAAA1111A1Z1",
    panNo: "AAAAA1111A",
    aadhaarNo: "1234-5678-9012",
    bank_details: {
      bank_name: "HDFC Bank",
      account_no: "50200055443322",
      ifsc_code: "HDFC0000240",
      account_holder: "Walk Easy Footwear",
      branch_name: "Bandra West",
      upi_id: "walkeasy@okhdfcbank"
    }
  },
  {
    id: "RET002",
    shopName: "Lakhani Shoe Emporium",
    owner: "Vijay Lakhani",
    email: "vijay@lakhani.com",
    mobile: "9930412345",
    address: "Karol Bagh, Metro Pillar 110",
    state: "Delhi",
    city: "New Delhi",
    category: "Platinum",
    promoter: "Harbhajan Singh",
    cityManager: "Amit Bansal",
    ordersCount: 19,
    revenue: 2150000,
    status: "Approved",
    gstNo: "07BBBBB2222B2Z2",
    panNo: "BBBBB2222B",
    aadhaarNo: "2345-6789-0123",
    bank_details: {
      bank_name: "Punjab National Bank",
      account_no: "0145002100088997",
      ifsc_code: "PUNB0014500",
      account_holder: "Lakhani Shoe Emporium",
      branch_name: "Karol Bagh New Delhi",
      upi_id: "lakhani@pnb"
    }
  },
  {
    id: "RET003",
    shopName: "Metro Steps",
    owner: "Suresh Gowda",
    email: "gowda@metrosteps.co.in",
    mobile: "9560412323",
    address: "Indiranagar 100ft Rd",
    state: "Karnataka",
    city: "Bengaluru",
    category: "Gold",
    promoter: "None",
    cityManager: "Nikhil Gowda",
    ordersCount: 8,
    revenue: 980000,
    status: "Approved",
    gstNo: "29CCCCC3333C3Z3",
    panNo: "CCCCC3333C",
    aadhaarNo: "3456-7890-1234",
    bank_details: {
      bank_name: "Canara Bank",
      account_no: "0412101009876",
      ifsc_code: "CNRB0000412",
      account_holder: "Metro Steps",
      branch_name: "Indiranagar Bengaluru",
      upi_id: "metrosteps@canara"
    }
  },
  {
    id: "RET004",
    shopName: "Rajkot Footwear Mart",
    owner: "Kirit Bhai",
    email: "kirit@rajkotfoot.com",
    mobile: "9001122556",
    address: "Kalavad Road",
    state: "Gujarat",
    city: "Ahmedabad",
    category: "Silver",
    promoter: "Gautam Gambhir",
    cityManager: "Harsh Shah",
    ordersCount: 5,
    revenue: 450000,
    status: "Approved",
    gstNo: "24DDDDD4444D4Z4",
    panNo: "DDDDD4444D",
    aadhaarNo: "4567-8901-2345",
    bank_details: {
      bank_name: "Bank of Baroda",
      account_no: "28450100012345",
      ifsc_code: "BARB0KALAVA",
      account_holder: "Rajkot Footwear Mart",
      branch_name: "Kalavad Road Rajkot",
      upi_id: "rajkotfoot@barodampay"
    }
  },
  {
    id: "RET005",
    shopName: "Apex Sole Distributors",
    owner: "Manish Joshi",
    email: "manish@apexsole.com",
    mobile: "9810101010",
    address: "FC Road",
    state: "Maharashtra",
    city: "Pune",
    category: "Standard",
    promoter: "Suresh Raina",
    cityManager: "Rahul Shinde",
    ordersCount: 2,
    revenue: 150000,
    status: "Pending Verification",
    gstNo: "27EEEEE5555E5Z5",
    panNo: "EEEEE5555E",
    aadhaarNo: "5678-9012-3456",
    bank_details: {
      bank_name: "Axis Bank",
      account_no: "919010055443322",
      ifsc_code: "UTIB0000192",
      account_holder: "Apex Sole Distributors",
      branch_name: "FC Road Pune",
      upi_id: "apexsole@axis"
    }
  }
];

// Product Catalogue
export const initialProducts = [
  { id: "P1", name: "Huddo Air Classic", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400", category: "Sports Shoes", description: "Premium air cushioned athletic running shoes built for maximum impact resistance.", sizes: [6, 7, 8, 9, 10, 11], colors: ["#ff0000", "#000000", "#ffffff"], mrp: 2999, costPrice: 1200, margin: 45, status: "Active", retailerMargin: 25, cityManagerIncentive: 2, stateManagerIncentive: 1, hsn_code: "6403.99.90", article_no: "ART-AC-01", colour: "Red", franchise_points: 12.50 },
  { id: "P2", name: "Huddo Flex Runner", image: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=400", category: "Sports Shoes", description: "Ultralight, breathable synthetic mesh running shoe with memory foam soles.", sizes: [7, 8, 9, 10, 11, 12], colors: ["#0000ff", "#808080", "#000000"], mrp: 2499, costPrice: 1000, margin: 40, status: "Active", retailerMargin: 22, cityManagerIncentive: 1.5, stateManagerIncentive: 1, hsn_code: "6403.99.90", article_no: "ART-FR-02", colour: "Grey", franchise_points: 10.00 },
  { id: "P3", name: "Huddo Elegant Derby", image: "https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=400", category: "Formal Shoes", description: "Genuine calfskin leather oxford derby shoes with premium wood grain heel.", sizes: [5, 6, 7, 8, 9, 10], colors: ["#4a2c00", "#000000"], mrp: 4999, costPrice: 2000, margin: 50, status: "Active", retailerMargin: 28, cityManagerIncentive: 3, stateManagerIncentive: 1.5, hsn_code: "6403.20.40", article_no: "ART-ED-03", colour: "Brown", franchise_points: 20.00 },
  { id: "P4", name: "Huddo Leather Loafer", image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400", category: "Casual Shoes", description: "Soft suede slip-on driving loafers, hand-stitched for all-day comfort wear.", sizes: [6, 7, 8, 9, 10, 11], colors: ["#000000", "#8b4513", "#d2b48c"], mrp: 3499, costPrice: 1400, margin: 42, status: "Active", retailerMargin: 24, cityManagerIncentive: 2, stateManagerIncentive: 1, hsn_code: "6403.20.40", article_no: "ART-LL-04", colour: "Tan", franchise_points: 15.00 },
  { id: "P5", name: "Huddo Comfort Slide", image: "https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=400", category: "Sandals", description: "Ergonomic leather strap slippers with cork orthotic footbed contours.", sizes: [6, 7, 8, 9, 10, 11, 12], colors: ["#000000", "#8b4513"], mrp: 1299, costPrice: 500, margin: 35, status: "Active", retailerMargin: 20, cityManagerIncentive: 1, stateManagerIncentive: 0.5, hsn_code: "6402.99.90", article_no: "ART-CS-05", colour: "Black", franchise_points: 5.00 }
];

// Orders List & Approval pipeline
export const initialOrders = [
  { id: "ORD-9281", retailerName: "Walk Easy Footwear", city: "Mumbai", productsCount: 3, amount: 85000, paymentStatus: "Verified", utrNo: "UTR123456789", date: "2026-06-01", status: "Delivered", items: [{ name: "Huddo Air Classic", size: 8, color: "Red", qty: 10, price: 2999 }, { name: "Huddo Elegant Derby", size: 9, color: "Brown", qty: 5, price: 4999 }, { name: "Huddo Leather Loafer", size: 7, color: "Tan", qty: 10, price: 3499 }], workflow: { cityApproved: true, stateApproved: true, countryApproved: true, adminApproved: true }, proofImage: "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=300" },
  { id: "ORD-8712", retailerName: "Lakhani Shoe Emporium", city: "New Delhi", productsCount: 2, amount: 124000, paymentStatus: "Verified", utrNo: "UTR987654321", date: "2026-06-03", status: "Shipped", items: [{ name: "Huddo Elegant Derby", size: 8, color: "Black", qty: 20, price: 4999 }, { name: "Huddo Flex Runner", size: 9, color: "Grey", qty: 10, price: 2499 }], workflow: { cityApproved: true, stateApproved: true, countryApproved: true, adminApproved: true }, proofImage: "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=300" },
  { id: "ORD-7391", retailerName: "Metro Steps", city: "Bengaluru", productsCount: 1, amount: 49990, paymentStatus: "Pending Verification", utrNo: "UTR445566778", date: "2026-06-06", status: "Approved", items: [{ name: "Huddo Elegant Derby", size: 10, color: "Black", qty: 10, price: 4999 }], workflow: { cityApproved: true, stateApproved: true, countryApproved: true, adminApproved: false }, proofImage: "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=300" },
  { id: "ORD-6120", retailerName: "Rajkot Footwear Mart", city: "Ahmedabad", productsCount: 2, amount: 38980, paymentStatus: "Pending", utrNo: "", date: "2026-06-07", status: "Submitted", items: [{ name: "Huddo Air Classic", size: 9, color: "Black", qty: 10, price: 2999 }, { name: "Huddo Comfort Slide", size: 8, color: "Black", qty: 10, price: 1299 }], workflow: { cityApproved: true, stateApproved: false, countryApproved: false, adminApproved: false }, proofImage: "" },
  { id: "ORD-5509", retailerName: "Walk Easy Footwear", city: "Mumbai", productsCount: 1, amount: 150000, paymentStatus: "Pending Verification", utrNo: "UTR998877112", date: "2026-06-08", status: "Submitted", items: [{ name: "Huddo Elegant Derby", size: 9, color: "Black", qty: 30, price: 4999 }], workflow: { cityApproved: false, stateApproved: false, countryApproved: false, adminApproved: false }, proofImage: "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=300" }
];

// Invoices & Billing
export const initialInvoices = [
  { id: "INV-2026-001", orderId: "ORD-9281", shopName: "Walk Easy Footwear", amount: 85000, tax: 12960, total: 97960, date: "2026-06-01", status: "Paid" },
  { id: "INV-2026-002", orderId: "ORD-8712", shopName: "Lakhani Shoe Emporium", amount: 124000, tax: 18915, total: 142915, date: "2026-06-03", status: "Paid" },
  { id: "INV-2026-003", orderId: "ORD-7391", shopName: "Metro Steps", amount: 49990, tax: 7625, total: 57615, date: "2026-06-06", status: "Unpaid" }
];

// Transaction logs for billing ledger
export const initialTransactions = [
  { id: "TXN10082", utr: "UTR123456789", amount: 97960, date: "2026-06-01", order: "ORD-9281", status: "Verified" },
  { id: "TXN10095", utr: "UTR987654321", amount: 142915, date: "2026-06-03", order: "ORD-8712", status: "Verified" },
  { id: "TXN10104", utr: "UTR445566778", amount: 57615, date: "2026-06-06", order: "ORD-7391", status: "Pending Verification" }
];

// Outstanding Payments mapping
export const initialOutstandings = [
  { id: "OUT001", shopName: "Metro Steps", city: "Bengaluru", pendingAmount: 57615, overdueDays: 2, lastReminder: "2026-06-07" },
  { id: "OUT002", shopName: "Apex Sole Distributors", city: "Pune", pendingAmount: 177000, overdueDays: 15, lastReminder: "2026-06-05" },
];



// Sales Executive ranking
export const salesRepRanking = [
  { name: "Amit Kumar", role: "Sales Executive", location: "Mumbai", revenue: 950000, growth: 12.5 },
  { name: "Suresh Gowda", role: "Sales Rep", location: "Bengaluru", revenue: 820000, growth: 8.2 },
  { name: "Rohit Verma", role: "Sales Executive", location: "Delhi", revenue: 780000, growth: -2.1 },
  { name: "Dinesh Patel", role: "Sales Trainee", location: "Ahmedabad", revenue: 450000, growth: 15.0 }
];

// Targets Management dataset
export const initialTargets = [
  { id: "TGT01", name: "Maharashtra Zone", type: "State", target: 5000000, achieved: 4500000, orderTarget: 100, orderAchieved: 92, acquisitionTarget: 10, acquisitionAchieved: 8 },
  { id: "TGT02", name: "Delhi NCR Zone", type: "State", target: 4000000, achieved: 3200000, orderTarget: 80, orderAchieved: 65, acquisitionTarget: 8, acquisitionAchieved: 7 },
  { id: "TGT03", name: "Karnataka Zone", type: "State", target: 3000000, achieved: 2100000, orderTarget: 60, orderAchieved: 48, acquisitionTarget: 6, acquisitionAchieved: 5 },
  { id: "TGT04", name: "Mumbai Mavericks Team", type: "Team", target: 2000000, achieved: 1950000, orderTarget: 45, orderAchieved: 42, acquisitionTarget: 5, acquisitionAchieved: 5 }
];

// Approvals queue
export const initialApprovals = [
  { id: "APP01", requester: "Apex Sole Distributors", type: "Retailer Registration", details: "Registration request under Silver Category in Pune.", date: "2026-06-08", status: "Pending", comment: "" },
  { id: "APP02", requester: "Walk Easy Footwear", type: "Large Orders", details: "Order value ₹1,50,000 exceeds standard limit.", date: "2026-06-08", status: "Pending", comment: "" },
  { id: "APP03", requester: "Amit Kumar (Sales)", type: "Discounts", details: "Requesting 5% extra discount for Lakhani Shoe Emporium on ORD-8712.", date: "2026-06-07", status: "Approved", comment: "Approved due to bulk purchase value." }
];

// Approval workflow configs
export const initialWorkflowConfig = {
  orders: { city: true, state: false, country: true, admin: true },
  retailers: { city: false, state: true, country: false, admin: true },
  commissions: { city: false, state: false, country: true, admin: true }
};

// Field Force Tracker records
export const fieldTrackingList = [
  { id: "FT01", name: "Amit Kumar", role: "Sales Executive", lastLocation: "Linking Road, Bandra, Mumbai", lastActive: "10 mins ago", visitsToday: 4, distance: "12.8 km", lat: 19.0600, lng: 72.8350 },
  { id: "FT02", name: "Suresh Gowda", role: "Sales Rep", lastLocation: "Indiranagar Double Rd, Bengaluru", lastActive: "Just Now", visitsToday: 5, distance: "15.2 km", lat: 12.9716, lng: 77.5946 },
  { id: "FT03", name: "Rohit Verma", role: "Sales Executive", lastLocation: "Karol Bagh Market, New Delhi", lastActive: "2 hours ago", visitsToday: 2, distance: "6.5 km", lat: 28.6139, lng: 77.2090 }
];

export const visitLogs = [
  { id: "VL001", representative: "Amit Kumar", retailer: "Walk Easy Footwear", time: "11:30 AM", duration: "45 mins", notes: "Collected bulk payment cheque. Discussed new sports line sizes availability.", gpsVerified: true },
  { id: "VL002", representative: "Amit Kumar", retailer: "Metro Shoes Bandra", time: "02:15 PM", duration: "30 mins", notes: "Retailer feedback received regarding slide margins. High stock on sports category.", gpsVerified: true },
  { id: "VL003", representative: "Suresh Gowda", retailer: "Metro Steps", time: "10:15 AM", duration: "60 mins", notes: "Introductory meet with owner. Retailer registration pending tax document collection.", gpsVerified: true }
];

export const routeHistories = {
  "Amit Kumar": [
    { time: "09:30 AM", location: "Mumbai Sales HQ (Clock-In)" },
    { time: "11:30 AM", location: "Walk Easy Footwear, Bandra" },
    { time: "02:15 PM", location: "Metro Shoes, Bandra West" },
    { time: "04:30 PM", location: "Apex sole depot, Pune Highway" }
  ],
  "Suresh Gowda": [
    { time: "09:00 AM", location: "Bengaluru Depot (Clock-In)" },
    { time: "10:15 AM", location: "Metro Steps, Indiranagar" },
    { time: "01:30 PM", location: "Soleful shoes, Koramangala" }
  ]
};

// Notification & Communications templates
export const initialNotifications = [
  { id: "N1", title: "Target Period Closing", message: "Monthly target cycles for June 2026 will freeze on 25-06-2026. Please complete visit logs.", type: "Target", audience: "All Sales Managers", channels: ["Email", "In-App"], date: "2026-06-08" },
  { id: "N2", title: "New Sports Collection Launch", message: "Huddo Flex Runner has launched with new color patterns. Promoters can map new orders now.", type: "Announcement", audience: "All Roles", channels: ["WhatsApp", "In-App"], date: "2026-06-05" },
  { id: "N3", title: "Order Approval Routing Update", message: "Orders exceeding ₹1L will route through Country Managers automatically from today.", type: "Order", audience: "City Manager, State Manager", channels: ["Email"], date: "2026-06-03" }
];

export const communicationTemplates = [
  { id: "TPL01", name: "Order Approved Alert", event: "Order Approved", channel: "WhatsApp/SMS", text: "Dear {name}, your order #{order_id} of value {amount} has been approved and moved to processing. Team Huddo Shoes." },
  { id: "TPL02", name: "Outstanding Payment Reminder", event: "Payment Reminder", channel: "Email/SMS", text: "Hi {name}, payment of INR {amount} is overdue for invoice #{invoice_id}. Kindly clear the outstanding. Team Huddo Shoes." },
  { id: "TPL03", name: "Target Status Update", event: "Target Tracker", channel: "In-App", text: "Attention {name}, you have achieved {percent}% of your monthly target of {amount}. Drive collections to hit slab incentives!" }
];

// Security Audit & Policy Configurations
export const initialAuditLogs = [
  { id: "LOG5021", user: "Rohan Hudda (Founder)", action: "Approved large order ORD-5509", module: "Orders", ip: "192.168.1.10", timestamp: "2026-06-08 17:45:12", status: "Success" },
  { id: "LOG5020", user: "Vikram Malhotra (Finance Mgr)", action: "Verified payment UTR123456789", module: "Billing", ip: "192.168.1.18", timestamp: "2026-06-08 16:30:45", status: "Success" },
  { id: "LOG5019", user: "Neha Sen (HR Manager)", action: "Added new employee sunita.rao@huddoerp.in", module: "Employees", ip: "192.168.1.22", timestamp: "2026-06-08 14:15:22", status: "Success" },
  { id: "LOG5018", user: "Rohan Hudda (Founder)", action: "Changed City Manager approval workflow state", module: "Approvals", ip: "192.168.1.10", timestamp: "2026-06-08 11:10:00", status: "Success" }
];

export const activeSessions = [
  { id: "SES01", user: "Rohan Hudda (Founder)", device: "Windows 11 / Chrome 125", ip: "192.168.1.10", loginTime: "2026-06-08 09:00:00", expireTime: "2026-06-08 21:00:00" },
  { id: "SES02", user: "Vikram Malhotra (Finance Mgr)", device: "MacOS Sonoma / Safari 17.4", ip: "192.168.1.18", loginTime: "2026-06-08 10:15:30", expireTime: "2026-06-08 22:15:30" }
];

// Inventory & Warehouse logs
export const initialInventory = [
  { id: "INV001", name: "Huddo Air Classic", sku: "HDO-AC-RD-08", category: "Sports Shoes", size: 8, color: "Red", stockLevel: 250, warehouse: "Mumbai Central Whse", reorderLevel: 50, status: "Normal" },
  { id: "INV002", name: "Huddo Air Classic", sku: "HDO-AC-RD-09", category: "Sports Shoes", size: 9, color: "Red", stockLevel: 35, warehouse: "Mumbai Central Whse", reorderLevel: 50, status: "Low Stock" },
  { id: "INV003", name: "Huddo Elegant Derby", sku: "HDO-ED-BK-10", category: "Formal Shoes", size: 10, color: "Black", stockLevel: 12, warehouse: "Delhi NCR Whse", reorderLevel: 20, status: "Low Stock" },
  { id: "INV004", name: "Huddo Elegant Derby", sku: "HDO-ED-BK-09", category: "Formal Shoes", size: 9, color: "Black", stockLevel: 0, warehouse: "Delhi NCR Whse", reorderLevel: 20, status: "Out of Stock" },
  { id: "INV005", name: "Huddo Leather Loafer", sku: "HDO-LL-TN-07", category: "Casual Shoes", size: 7, color: "Tan", stockLevel: 180, warehouse: "Bengaluru Depot Whse", reorderLevel: 30, status: "Normal" }
];

export const warehouses = [
  { id: "W1", name: "Mumbai Central Whse", location: "Bhiwandi, Maharashtra", manager: "Rajesh Deshpande", capacity: "10,000 SKUs" },
  { id: "W2", name: "Delhi NCR Whse", location: "Gurugram, Haryana", manager: "Kishore Kumar", capacity: "8,000 SKUs" },
  { id: "W3", name: "Bengaluru Depot Whse", location: "Nelamangala, Karnataka", manager: "M. Nanjappa", capacity: "5,000 SKUs" }
];

// Department Managers & Sub-modules details (Module 6)
export const initialDepartmentsDetails = [
  { id: "Sales", name: "Sales & Account Management", head: "Rajesh Sharma", members: 18, teams: 2, icon: "TrendingUp", features: { "Sales Targets": true, "Retailer Visits": true, "Lead Generation": true, "Order Collection": true, "Performance Tracking": true } },
  { id: "Purchase", name: "Purchase & Vendor Logistics", head: "Karan Johar", members: 8, teams: 1, icon: "ShoppingCart", features: { "Vendor Management": true, "Purchase Orders": true, "Purchase Approvals": false, "Material Tracking": true, "Quality Check": true } },
  { id: "Inventory", name: "Inventory & Warehouses", head: "Sunil Mehta", members: 12, teams: 1, icon: "Archive", features: { "Stock Management": true, "Warehouse Management": true, "Stock Transfers": true, "Stock Alerts": true } },
  { id: "Finance", name: "Finance & Tax Compliance", head: "Vikram Malhotra", members: 6, teams: 1, icon: "Percent", features: { "Commission Calculations": true, "Incentive Management": true, "Revenue Reports": true, "GST Management": true } },
  { id: "HR", name: "Human Resources & Payroll", head: "Neha Sen", members: 5, teams: 1, icon: "Users", features: { "Attendance Tracking": true, "Leave Management": true, "Payroll Management": true, "Performance Reviews": false } },
  { id: "Marketing", name: "Marketing & Scheme Ops", head: "Rohan Hudda", members: 7, teams: 0, icon: "Award", features: { "Campaign Management": true, "Scheme Management": true, "Promotional Activities": true } }
];

// Analytics Dashboard Trends mock data
export const monthlyRevenueTrends = [
  { month: "Jul 25", revenue: 8500000 },
  { month: "Aug 25", revenue: 9200000 },
  { month: "Sep 25", revenue: 8900000 },
  { month: "Oct 25", revenue: 10400000 },
  { month: "Nov 25", revenue: 11200000 },
  { month: "Dec 25", revenue: 12500000 },
  { month: "Jan 26", revenue: 9800000 },
  { month: "Feb 26", revenue: 10200000 },
  { month: "Mar 26", revenue: 13800000 },
  { month: "Apr 26", revenue: 11500000 },
  { month: "May 26", revenue: 12100000 },
  { month: "Jun 26", revenue: 12450000 },
];

export const statePerformanceData = [
  { state: "Maharashtra", revenue: 4500000, orders: 85 },
  { state: "Delhi", revenue: 3200000, orders: 60 },
  { state: "Karnataka", revenue: 2100000, orders: 45 },
  { state: "Gujarat", revenue: 1650000, orders: 35 },
  { state: "Tamil Nadu", revenue: 1000000, orders: 20 }
];

export const orderStatusDistribution = [
  { name: "Pending", value: 12 },
  { name: "Approved", value: 8 },
  { name: "Shipped", value: 24 },
  { name: "Delivered", value: 48 },
  { name: "Cancelled", value: 4 }
];
