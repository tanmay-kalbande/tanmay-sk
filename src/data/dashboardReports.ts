export type MonthKey =
  | "Jan"
  | "Feb"
  | "Mar"
  | "Apr"
  | "May"
  | "Jun"
  | "Jul"
  | "Aug"
  | "Sep"
  | "Oct"
  | "Nov"
  | "Dec";

export const reportMonths: MonthKey[] = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export type SalesRecord = {
  month: MonthKey;
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  region: "North" | "South" | "West" | "East";
  channel: "Retail" | "Marketplace" | "Direct" | "Partner";
  category: "SaaS" | "Services" | "Hardware" | "Training";
  revenue: number;
  target: number;
  profit: number;
  orders: number;
  customers: number;
};

export const salesRecords: SalesRecord[] = [
  { month: "Jan", quarter: "Q1", region: "North", channel: "Direct", category: "SaaS", revenue: 188000, target: 176000, profit: 72000, orders: 318, customers: 182 },
  { month: "Feb", quarter: "Q1", region: "South", channel: "Marketplace", category: "Services", revenue: 164000, target: 158000, profit: 54000, orders: 286, customers: 166 },
  { month: "Mar", quarter: "Q1", region: "West", channel: "Retail", category: "Hardware", revenue: 196000, target: 188000, profit: 58000, orders: 342, customers: 214 },
  { month: "Apr", quarter: "Q2", region: "East", channel: "Partner", category: "Training", revenue: 142000, target: 148000, profit: 52000, orders: 252, customers: 136 },
  { month: "May", quarter: "Q2", region: "North", channel: "Marketplace", category: "SaaS", revenue: 224000, target: 207000, profit: 91000, orders: 392, customers: 228 },
  { month: "Jun", quarter: "Q2", region: "South", channel: "Direct", category: "Services", revenue: 218000, target: 206000, profit: 79000, orders: 364, customers: 210 },
  { month: "Jul", quarter: "Q3", region: "West", channel: "Partner", category: "SaaS", revenue: 254000, target: 236000, profit: 104000, orders: 418, customers: 247 },
  { month: "Aug", quarter: "Q3", region: "East", channel: "Retail", category: "Hardware", revenue: 231000, target: 229000, profit: 67000, orders: 405, customers: 236 },
  { month: "Sep", quarter: "Q3", region: "North", channel: "Direct", category: "Training", revenue: 206000, target: 194000, profit: 86000, orders: 336, customers: 198 },
  { month: "Oct", quarter: "Q4", region: "South", channel: "Marketplace", category: "SaaS", revenue: 286000, target: 257000, profit: 121000, orders: 462, customers: 275 },
  { month: "Nov", quarter: "Q4", region: "West", channel: "Direct", category: "Services", revenue: 302000, target: 282000, profit: 116000, orders: 481, customers: 286 },
  { month: "Dec", quarter: "Q4", region: "East", channel: "Partner", category: "Hardware", revenue: 274000, target: 265000, profit: 82000, orders: 438, customers: 256 },
  { month: "Jan", quarter: "Q1", region: "East", channel: "Marketplace", category: "SaaS", revenue: 132000, target: 128000, profit: 51000, orders: 226, customers: 132 },
  { month: "Feb", quarter: "Q1", region: "West", channel: "Partner", category: "Training", revenue: 118000, target: 121000, profit: 47000, orders: 194, customers: 112 },
  { month: "Mar", quarter: "Q1", region: "North", channel: "Retail", category: "Services", revenue: 158000, target: 149000, profit: 59000, orders: 269, customers: 151 },
  { month: "Apr", quarter: "Q2", region: "South", channel: "Retail", category: "Hardware", revenue: 173000, target: 166000, profit: 46000, orders: 301, customers: 174 },
  { month: "May", quarter: "Q2", region: "West", channel: "Direct", category: "SaaS", revenue: 242000, target: 226000, profit: 102000, orders: 398, customers: 241 },
  { month: "Jun", quarter: "Q2", region: "East", channel: "Marketplace", category: "Training", revenue: 129000, target: 134000, profit: 48000, orders: 207, customers: 118 },
  { month: "Jul", quarter: "Q3", region: "North", channel: "Partner", category: "Hardware", revenue: 214000, target: 204000, profit: 61000, orders: 357, customers: 212 },
  { month: "Aug", quarter: "Q3", region: "South", channel: "Direct", category: "SaaS", revenue: 269000, target: 247000, profit: 113000, orders: 436, customers: 259 },
  { month: "Sep", quarter: "Q3", region: "West", channel: "Marketplace", category: "Services", revenue: 221000, target: 216000, profit: 78000, orders: 379, customers: 223 },
  { month: "Oct", quarter: "Q4", region: "East", channel: "Retail", category: "Training", revenue: 171000, target: 166000, profit: 65000, orders: 281, customers: 161 },
  { month: "Nov", quarter: "Q4", region: "North", channel: "Marketplace", category: "SaaS", revenue: 318000, target: 296000, profit: 134000, orders: 506, customers: 304 },
  { month: "Dec", quarter: "Q4", region: "South", channel: "Partner", category: "Services", revenue: 247000, target: 232000, profit: 89000, orders: 411, customers: 243 },
];

export type SupportRecord = {
  month: MonthKey;
  team: "Platform" | "Payments" | "Data" | "Infra";
  priority: "P1" | "P2" | "P3";
  tickets: number;
  resolved: number;
  sla: number;
  csat: number;
  backlog: number;
  avgHours: number;
};

export const supportRecords: SupportRecord[] = [
  { month: "Jan", team: "Platform", priority: "P2", tickets: 286, resolved: 271, sla: 91, csat: 4.2, backlog: 42, avgHours: 19 },
  { month: "Feb", team: "Payments", priority: "P1", tickets: 194, resolved: 181, sla: 88, csat: 4.0, backlog: 34, avgHours: 15 },
  { month: "Mar", team: "Data", priority: "P3", tickets: 238, resolved: 229, sla: 94, csat: 4.4, backlog: 27, avgHours: 22 },
  { month: "Apr", team: "Infra", priority: "P2", tickets: 262, resolved: 251, sla: 90, csat: 4.1, backlog: 38, avgHours: 24 },
  { month: "May", team: "Platform", priority: "P1", tickets: 312, resolved: 302, sla: 93, csat: 4.3, backlog: 31, avgHours: 17 },
  { month: "Jun", team: "Payments", priority: "P2", tickets: 276, resolved: 268, sla: 95, csat: 4.5, backlog: 24, avgHours: 16 },
  { month: "Jul", team: "Data", priority: "P2", tickets: 334, resolved: 319, sla: 92, csat: 4.2, backlog: 43, avgHours: 21 },
  { month: "Aug", team: "Infra", priority: "P1", tickets: 298, resolved: 288, sla: 89, csat: 4.0, backlog: 45, avgHours: 18 },
  { month: "Sep", team: "Platform", priority: "P3", tickets: 241, resolved: 236, sla: 96, csat: 4.6, backlog: 19, avgHours: 25 },
  { month: "Oct", team: "Payments", priority: "P2", tickets: 356, resolved: 344, sla: 94, csat: 4.4, backlog: 28, avgHours: 14 },
  { month: "Nov", team: "Data", priority: "P1", tickets: 292, resolved: 276, sla: 87, csat: 3.9, backlog: 52, avgHours: 20 },
  { month: "Dec", team: "Infra", priority: "P3", tickets: 224, resolved: 219, sla: 97, csat: 4.7, backlog: 17, avgHours: 23 },
  { month: "Jan", team: "Data", priority: "P1", tickets: 156, resolved: 142, sla: 84, csat: 3.8, backlog: 36, avgHours: 18 },
  { month: "Feb", team: "Infra", priority: "P2", tickets: 218, resolved: 205, sla: 90, csat: 4.1, backlog: 41, avgHours: 22 },
  { month: "Mar", team: "Platform", priority: "P1", tickets: 247, resolved: 234, sla: 89, csat: 4.1, backlog: 39, avgHours: 16 },
  { month: "Apr", team: "Payments", priority: "P3", tickets: 185, resolved: 181, sla: 97, csat: 4.6, backlog: 15, avgHours: 21 },
  { month: "May", team: "Data", priority: "P2", tickets: 274, resolved: 265, sla: 93, csat: 4.3, backlog: 26, avgHours: 20 },
  { month: "Jun", team: "Infra", priority: "P1", tickets: 233, resolved: 221, sla: 88, csat: 4.0, backlog: 36, avgHours: 17 },
  { month: "Jul", team: "Platform", priority: "P2", tickets: 319, resolved: 310, sla: 94, csat: 4.5, backlog: 24, avgHours: 18 },
  { month: "Aug", team: "Payments", priority: "P3", tickets: 211, resolved: 207, sla: 96, csat: 4.6, backlog: 13, avgHours: 19 },
  { month: "Sep", team: "Data", priority: "P1", tickets: 281, resolved: 265, sla: 86, csat: 3.9, backlog: 49, avgHours: 17 },
  { month: "Oct", team: "Infra", priority: "P2", tickets: 268, resolved: 259, sla: 92, csat: 4.2, backlog: 33, avgHours: 22 },
  { month: "Nov", team: "Platform", priority: "P3", tickets: 236, resolved: 229, sla: 96, csat: 4.5, backlog: 22, avgHours: 24 },
  { month: "Dec", team: "Payments", priority: "P1", tickets: 249, resolved: 235, sla: 87, csat: 3.9, backlog: 44, avgHours: 15 },
];

export type FinanceRecord = {
  month: MonthKey;
  unit: "Core" | "Growth" | "Enterprise" | "Labs";
  revenue: number;
  cogs: number;
  opex: number;
  forecast: number;
  cash: number;
  invoices: number;
};

export const financeRecords: FinanceRecord[] = [
  { month: "Jan", unit: "Core", revenue: 420000, cogs: 138000, opex: 142000, forecast: 405000, cash: 620000, invoices: 128 },
  { month: "Feb", unit: "Growth", revenue: 286000, cogs: 92000, opex: 118000, forecast: 278000, cash: 612000, invoices: 94 },
  { month: "Mar", unit: "Enterprise", revenue: 512000, cogs: 164000, opex: 151000, forecast: 486000, cash: 681000, invoices: 102 },
  { month: "Apr", unit: "Labs", revenue: 188000, cogs: 71000, opex: 98000, forecast: 204000, cash: 584000, invoices: 61 },
  { month: "May", unit: "Core", revenue: 462000, cogs: 149000, opex: 143000, forecast: 448000, cash: 702000, invoices: 136 },
  { month: "Jun", unit: "Growth", revenue: 334000, cogs: 104000, opex: 122000, forecast: 316000, cash: 733000, invoices: 108 },
  { month: "Jul", unit: "Enterprise", revenue: 558000, cogs: 172000, opex: 158000, forecast: 532000, cash: 791000, invoices: 117 },
  { month: "Aug", unit: "Labs", revenue: 214000, cogs: 76000, opex: 99000, forecast: 208000, cash: 746000, invoices: 69 },
  { month: "Sep", unit: "Core", revenue: 484000, cogs: 155000, opex: 146000, forecast: 462000, cash: 802000, invoices: 143 },
  { month: "Oct", unit: "Growth", revenue: 371000, cogs: 112000, opex: 126000, forecast: 352000, cash: 841000, invoices: 121 },
  { month: "Nov", unit: "Enterprise", revenue: 604000, cogs: 188000, opex: 164000, forecast: 579000, cash: 918000, invoices: 124 },
  { month: "Dec", unit: "Labs", revenue: 247000, cogs: 83000, opex: 103000, forecast: 231000, cash: 932000, invoices: 76 },
  { month: "Jan", unit: "Enterprise", revenue: 334000, cogs: 112000, opex: 127000, forecast: 326000, cash: 620000, invoices: 72 },
  { month: "Feb", unit: "Core", revenue: 398000, cogs: 132000, opex: 139000, forecast: 391000, cash: 612000, invoices: 119 },
  { month: "Mar", unit: "Growth", revenue: 312000, cogs: 99000, opex: 120000, forecast: 301000, cash: 681000, invoices: 101 },
  { month: "Apr", unit: "Enterprise", revenue: 529000, cogs: 171000, opex: 153000, forecast: 514000, cash: 584000, invoices: 111 },
  { month: "May", unit: "Labs", revenue: 196000, cogs: 74000, opex: 99000, forecast: 202000, cash: 702000, invoices: 64 },
  { month: "Jun", unit: "Core", revenue: 448000, cogs: 144000, opex: 142000, forecast: 431000, cash: 733000, invoices: 133 },
  { month: "Jul", unit: "Growth", revenue: 351000, cogs: 108000, opex: 124000, forecast: 337000, cash: 791000, invoices: 112 },
  { month: "Aug", unit: "Enterprise", revenue: 571000, cogs: 179000, opex: 160000, forecast: 548000, cash: 746000, invoices: 120 },
  { month: "Sep", unit: "Labs", revenue: 226000, cogs: 79000, opex: 101000, forecast: 218000, cash: 802000, invoices: 71 },
  { month: "Oct", unit: "Core", revenue: 502000, cogs: 162000, opex: 148000, forecast: 486000, cash: 841000, invoices: 151 },
  { month: "Nov", unit: "Growth", revenue: 389000, cogs: 119000, opex: 128000, forecast: 371000, cash: 918000, invoices: 126 },
  { month: "Dec", unit: "Enterprise", revenue: 632000, cogs: 196000, opex: 168000, forecast: 605000, cash: 932000, invoices: 131 },
];

export type WorkforceRecord = {
  month: MonthKey;
  department: "Analytics" | "Engineering" | "Sales" | "Operations";
  location: "India" | "US" | "Europe" | "Remote";
  headcount: number;
  hires: number;
  exits: number;
  engagement: number;
  trainingHours: number;
  openRoles: number;
};

export const workforceRecords: WorkforceRecord[] = [
  { month: "Jan", department: "Analytics", location: "India", headcount: 42, hires: 4, exits: 1, engagement: 82, trainingHours: 420, openRoles: 5 },
  { month: "Feb", department: "Engineering", location: "Remote", headcount: 88, hires: 6, exits: 2, engagement: 78, trainingHours: 690, openRoles: 9 },
  { month: "Mar", department: "Sales", location: "US", headcount: 53, hires: 5, exits: 3, engagement: 74, trainingHours: 310, openRoles: 6 },
  { month: "Apr", department: "Operations", location: "Europe", headcount: 61, hires: 3, exits: 1, engagement: 80, trainingHours: 360, openRoles: 4 },
  { month: "May", department: "Analytics", location: "Remote", headcount: 47, hires: 5, exits: 0, engagement: 85, trainingHours: 512, openRoles: 4 },
  { month: "Jun", department: "Engineering", location: "India", headcount: 96, hires: 8, exits: 2, engagement: 79, trainingHours: 760, openRoles: 8 },
  { month: "Jul", department: "Sales", location: "Remote", headcount: 58, hires: 6, exits: 2, engagement: 76, trainingHours: 334, openRoles: 7 },
  { month: "Aug", department: "Operations", location: "India", headcount: 64, hires: 4, exits: 2, engagement: 81, trainingHours: 388, openRoles: 3 },
  { month: "Sep", department: "Analytics", location: "Europe", headcount: 51, hires: 4, exits: 1, engagement: 86, trainingHours: 540, openRoles: 3 },
  { month: "Oct", department: "Engineering", location: "US", headcount: 103, hires: 9, exits: 3, engagement: 77, trainingHours: 820, openRoles: 10 },
  { month: "Nov", department: "Sales", location: "India", headcount: 61, hires: 5, exits: 1, engagement: 79, trainingHours: 365, openRoles: 5 },
  { month: "Dec", department: "Operations", location: "Remote", headcount: 69, hires: 6, exits: 2, engagement: 83, trainingHours: 418, openRoles: 4 },
  { month: "Jan", department: "Engineering", location: "Europe", headcount: 71, hires: 5, exits: 1, engagement: 81, trainingHours: 610, openRoles: 7 },
  { month: "Feb", department: "Analytics", location: "US", headcount: 39, hires: 3, exits: 1, engagement: 83, trainingHours: 392, openRoles: 4 },
  { month: "Mar", department: "Operations", location: "India", headcount: 59, hires: 4, exits: 2, engagement: 78, trainingHours: 350, openRoles: 5 },
  { month: "Apr", department: "Sales", location: "Remote", headcount: 55, hires: 5, exits: 3, engagement: 73, trainingHours: 322, openRoles: 8 },
  { month: "May", department: "Engineering", location: "Remote", headcount: 94, hires: 7, exits: 2, engagement: 80, trainingHours: 742, openRoles: 8 },
  { month: "Jun", department: "Analytics", location: "India", headcount: 49, hires: 5, exits: 1, engagement: 87, trainingHours: 526, openRoles: 3 },
  { month: "Jul", department: "Operations", location: "US", headcount: 66, hires: 4, exits: 1, engagement: 82, trainingHours: 401, openRoles: 4 },
  { month: "Aug", department: "Sales", location: "Europe", headcount: 57, hires: 5, exits: 2, engagement: 77, trainingHours: 348, openRoles: 6 },
  { month: "Sep", department: "Engineering", location: "India", headcount: 101, hires: 8, exits: 2, engagement: 81, trainingHours: 806, openRoles: 7 },
  { month: "Oct", department: "Analytics", location: "Remote", headcount: 54, hires: 6, exits: 1, engagement: 88, trainingHours: 582, openRoles: 2 },
  { month: "Nov", department: "Operations", location: "Remote", headcount: 71, hires: 5, exits: 2, engagement: 84, trainingHours: 443, openRoles: 4 },
  { month: "Dec", department: "Sales", location: "India", headcount: 64, hires: 6, exits: 1, engagement: 80, trainingHours: 392, openRoles: 5 },
];
