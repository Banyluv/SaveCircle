// Pre-loaded realistic demo data for Nigerian Ajo Groups (Pan-Nigerian with Calabar, Lagos, Abuja & Aba hubs)

export const initialCalabarGroups = [
  {
    id: 'group-1',
    name: 'Watt Market Fabric & Textiles Ajo',
    hubLocation: 'Watt Market, Calabar South, Cross River',
    description: 'Weekly contribution pool for fabric wholesalers and fashion designers preparing for festival and bulk inventory orders.',
    contributionAmount: 100000, // ₦100,000 per week
    frequency: 'Weekly',
    penaltyFee: 5000,
    startDate: '2026-06-01',
    currentCycleIndex: 4, // 4th cycle/week
    totalCycles: 8,
    trustee: 'Mama Blessing Edet (Iya Ajo)',
    trusteeContact: '+234 803 456 7890',
    members: [
      { id: 'm1', name: 'Blessing Edet', role: 'Iya Ajo (Trustee)', phone: '08034567890', bank: 'Moniepoint Microfinance Bank', accountNumber: '6490123841', trustScore: 98, position: 1 },
      { id: 'm2', name: 'Effiong Bassey', role: 'Member', phone: '08021112233', bank: 'Zenith Bank', accountNumber: '2084910293', trustScore: 95, position: 2 },
      { id: 'm3', name: 'Ekaette Okon', role: 'Member', phone: '08139994455', bank: 'First Bank Nigeria', accountNumber: '3049102948', trustScore: 92, position: 3 },
      { id: 'm4', name: 'Chief Asuquo Henshaw', role: 'Member', phone: '07038887766', bank: 'OPay Nigeria', accountNumber: '7038887766', trustScore: 90, position: 4 },
      { id: 'm5', name: 'Grace Archibong', role: 'Member', phone: '08056665544', bank: 'Access Bank', accountNumber: '0049102947', trustScore: 88, position: 5 },
      { id: 'm6', name: 'Dominic Ekpenyong', role: 'Member', phone: '08123334455', bank: 'United Bank for Africa (UBA)', accountNumber: '2049102931', trustScore: 85, position: 6 },
      { id: 'm7', name: 'Peace Itam', role: 'Member', phone: '09012223344', bank: 'Palmpay', accountNumber: '9012223344', trustScore: 94, position: 7 },
      { id: 'm8', name: 'Victor Offiong', role: 'Member', phone: '08091118899', bank: 'Kuda Bank', accountNumber: '2019401928', trustScore: 91, position: 8 },
    ],
    contributions: {
      1: [
        { memberId: 'm1', status: 'Verified', date: '2026-06-01', channel: 'Moniepoint', ref: 'MNP-20260601-091' },
        { memberId: 'm2', status: 'Verified', date: '2026-06-01', channel: 'Zenith Transfer', ref: 'ZNT-994012' },
        { memberId: 'm3', status: 'Verified', date: '2026-06-02', channel: 'FirstBank Mobile', ref: 'FB-401928' },
        { memberId: 'm4', status: 'Verified', date: '2026-06-01', channel: 'OPay Transfer', ref: 'OPY-110293' },
        { memberId: 'm5', status: 'Verified', date: '2026-06-02', channel: 'Access Bank', ref: 'ACC-881920' },
        { memberId: 'm6', status: 'Verified', date: '2026-06-03', channel: 'Cash at Shop 14', ref: 'CASH-WATT-01' },
        { memberId: 'm7', status: 'Verified', date: '2026-06-01', channel: 'Palmpay', ref: 'PLM-991029' },
        { memberId: 'm8', status: 'Verified', date: '2026-06-02', channel: 'Kuda Bank', ref: 'KUD-001928' },
      ],
      2: [
        { memberId: 'm1', status: 'Verified', date: '2026-06-08', channel: 'Moniepoint', ref: 'MNP-20260608-012' },
        { memberId: 'm2', status: 'Verified', date: '2026-06-08', channel: 'Zenith Transfer', ref: 'ZNT-994111' },
        { memberId: 'm3', status: 'Verified', date: '2026-06-09', channel: 'FirstBank Mobile', ref: 'FB-402100' },
        { memberId: 'm4', status: 'Verified', date: '2026-06-08', channel: 'OPay Transfer', ref: 'OPY-110555' },
        { memberId: 'm5', status: 'Verified', date: '2026-06-09', channel: 'Access Bank', ref: 'ACC-881999' },
        { memberId: 'm6', status: 'Verified', date: '2026-06-10', channel: 'Cash at Shop 14', ref: 'CASH-WATT-02' },
        { memberId: 'm7', status: 'Verified', date: '2026-06-08', channel: 'Palmpay', ref: 'PLM-991088' },
        { memberId: 'm8', status: 'Verified', date: '2026-06-09', channel: 'Kuda Bank', ref: 'KUD-001999' },
      ],
      3: [
        { memberId: 'm1', status: 'Verified', date: '2026-06-15', channel: 'Moniepoint', ref: 'MNP-20260615-555' },
        { memberId: 'm2', status: 'Verified', date: '2026-06-15', channel: 'Zenith Transfer', ref: 'ZNT-994222' },
        { memberId: 'm3', status: 'Verified', date: '2026-06-16', channel: 'FirstBank Mobile', ref: 'FB-402222' },
        { memberId: 'm4', status: 'Verified', date: '2026-06-15', channel: 'OPay Transfer', ref: 'OPY-110888' },
        { memberId: 'm5', status: 'Verified', date: '2026-06-16', channel: 'Access Bank', ref: 'ACC-882111' },
        { memberId: 'm6', status: 'Verified', date: '2026-06-17', channel: 'Cash at Shop 14', ref: 'CASH-WATT-03' },
        { memberId: 'm7', status: 'Verified', date: '2026-06-15', channel: 'Palmpay', ref: 'PLM-991222' },
        { memberId: 'm8', status: 'Verified', date: '2026-06-16', channel: 'Kuda Bank', ref: 'KUD-002111' },
      ],
      4: [
        { memberId: 'm1', status: 'Verified', date: '2026-07-28', channel: 'Moniepoint', ref: 'MNP-20260728-901' },
        { memberId: 'm2', status: 'Verified', date: '2026-07-29', channel: 'Zenith Transfer', ref: 'ZNT-995001' },
        { memberId: 'm3', status: 'Pending Verification', date: '2026-07-30', channel: 'FirstBank Mobile', ref: 'FB-409988', proofNote: 'Sent ₦100k via USSD *894#' },
        { memberId: 'm4', status: 'Verified', date: '2026-07-28', channel: 'OPay Transfer', ref: 'OPY-119000' },
        { memberId: 'm5', status: 'Overdue', date: null, channel: null, ref: null },
        { memberId: 'm6', status: 'Pending Verification', date: '2026-07-30', channel: 'Cash at Shop 14', ref: 'CASH-WATT-04', proofNote: 'Dropped cash with Mama Blessing' },
        { memberId: 'm7', status: 'Verified', date: '2026-07-29', channel: 'Palmpay', ref: 'PLM-993000' },
        { memberId: 'm8', status: 'Overdue', date: null, channel: null, ref: null },
      ]
    },
    payoutSchedule: [
      { cycle: 1, memberId: 'm1', amount: 800000, date: '2026-06-07', status: 'Disbursed', ref: 'PAY-WATT-01' },
      { cycle: 2, memberId: 'm2', amount: 800000, date: '2026-06-14', status: 'Disbursed', ref: 'PAY-WATT-02' },
      { cycle: 3, memberId: 'm3', amount: 800000, date: '2026-06-21', status: 'Disbursed', ref: 'PAY-WATT-03' },
      { cycle: 4, memberId: 'm4', amount: 800000, date: '2026-08-02', status: 'Current Target', ref: null },
      { cycle: 5, memberId: 'm5', amount: 800000, date: '2026-08-09', status: 'Upcoming', ref: null },
      { cycle: 6, memberId: 'm6', amount: 800000, date: '2026-08-16', status: 'Upcoming', ref: null },
      { cycle: 7, memberId: 'm7', amount: 800000, date: '2026-08-23', status: 'Upcoming', ref: null },
      { cycle: 8, memberId: 'm8', amount: 800000, date: '2026-08-30', status: 'Upcoming', ref: null },
    ]
  },
  {
    id: 'group-4',
    name: 'Balogun Market Fashion Merchants Ajo',
    hubLocation: 'Balogun Market, Lagos Island, Lagos',
    description: 'High-volume weekly Ajo pool for wholesale textile and footwear importers in Lagos Island.',
    contributionAmount: 150000, // ₦150,000 weekly
    frequency: 'Weekly',
    penaltyFee: 5000,
    startDate: '2026-07-05',
    currentCycleIndex: 3,
    totalCycles: 5,
    trustee: 'Alhaja Kudirat Folami (Iya Ajo)',
    trusteeContact: '+234 802 333 4455',
    members: [
      { id: 'm401', name: 'Alhaja Kudirat Folami', role: 'Iya Ajo (Trustee)', phone: '08023334455', bank: 'Moniepoint MFB', accountNumber: '5501928410', trustScore: 99, position: 1 },
      { id: 'm402', name: 'Babajide Adeleke', role: 'Member', phone: '08031112233', bank: 'Guaranty Trust Bank (GTBank)', accountNumber: '0192847102', trustScore: 96, position: 2 },
      { id: 'm403', name: 'Chinyere Nwosu', role: 'Member', phone: '08129994455', bank: 'Zenith Bank', accountNumber: '2019401928', trustScore: 94, position: 3 },
      { id: 'm404', name: 'Funke Ojo', role: 'Member', phone: '07038889900', bank: 'Access Bank', accountNumber: '0019284710', trustScore: 91, position: 4 },
      { id: 'm405', name: 'Tunde Shonibare', role: 'Member', phone: '08056667788', bank: 'First Bank Nigeria', accountNumber: '3019284710', trustScore: 89, position: 5 },
    ],
    contributions: {
      1: [
        { memberId: 'm401', status: 'Verified', date: '2026-07-05', channel: 'Moniepoint', ref: 'MNP-BAL-01' },
        { memberId: 'm402', status: 'Verified', date: '2026-07-06', channel: 'GTWorld App', ref: 'GTB-BAL-01' },
        { memberId: 'm403', status: 'Verified', date: '2026-07-05', channel: 'Zenith Mobile', ref: 'ZNT-BAL-01' },
        { memberId: 'm404', status: 'Verified', date: '2026-07-07', channel: 'Access Bank', ref: 'ACC-BAL-01' },
        { memberId: 'm405', status: 'Verified', date: '2026-07-06', channel: 'First Bank', ref: 'FB-BAL-01' },
      ],
      2: [
        { memberId: 'm401', status: 'Verified', date: '2026-07-12', channel: 'Moniepoint', ref: 'MNP-BAL-02' },
        { memberId: 'm402', status: 'Verified', date: '2026-07-13', channel: 'GTWorld App', ref: 'GTB-BAL-02' },
        { memberId: 'm403', status: 'Verified', date: '2026-07-12', channel: 'Zenith Mobile', ref: 'ZNT-BAL-02' },
        { memberId: 'm404', status: 'Verified', date: '2026-07-14', channel: 'Access Bank', ref: 'ACC-BAL-02' },
        { memberId: 'm405', status: 'Verified', date: '2026-07-13', channel: 'First Bank', ref: 'FB-BAL-02' },
      ],
      3: [
        { memberId: 'm401', status: 'Verified', date: '2026-07-26', channel: 'Moniepoint', ref: 'MNP-BAL-03' },
        { memberId: 'm402', status: 'Verified', date: '2026-07-27', channel: 'GTWorld App', ref: 'GTB-BAL-03' },
        { memberId: 'm403', status: 'Verified', date: '2026-07-28', channel: 'Zenith Mobile', ref: 'ZNT-BAL-03' },
        { memberId: 'm404', status: 'Pending Verification', date: '2026-07-30', channel: 'OPay', ref: 'OPY-BAL-03', proofNote: 'Sent ₦150k for Cycle 3' },
        { memberId: 'm405', status: 'Overdue', date: null, channel: null, ref: null },
      ]
    },
    payoutSchedule: [
      { cycle: 1, memberId: 'm401', amount: 750000, date: '2026-07-11', status: 'Disbursed', ref: 'PAY-LAGOS-01' },
      { cycle: 2, memberId: 'm402', amount: 750000, date: '2026-07-18', status: 'Disbursed', ref: 'PAY-LAGOS-02' },
      { cycle: 3, memberId: 'm403', amount: 750000, date: '2026-08-01', status: 'Current Target', ref: null },
      { cycle: 4, memberId: 'm404', amount: 750000, date: '2026-08-08', status: 'Upcoming', ref: null },
      { cycle: 5, memberId: 'm405', amount: 750000, date: '2026-08-15', status: 'Upcoming', ref: null },
    ]
  },
  {
    id: 'group-2',
    name: 'Marian (Ika Ika Oqua) Fresh Farmers Ajo',
    hubLocation: 'Marian Market, Calabar Municipal, Cross River',
    description: 'Bi-weekly cooperative pool for fresh fruit, plantain, and seafood distributors operating at Marian Market.',
    contributionAmount: 25000, // ₦25,000 bi-weekly
    frequency: 'Bi-Weekly',
    penaltyFee: 2000,
    startDate: '2026-07-01',
    currentCycleIndex: 2,
    totalCycles: 6,
    trustee: 'Madam Veronica Akpan',
    trusteeContact: '+234 814 112 2334',
    members: [
      { id: 'm201', name: 'Veronica Akpan', role: 'Group Leader', phone: '08141122334', bank: 'Moniepoint MFB', accountNumber: '5019284710', trustScore: 100, position: 1 },
      { id: 'm202', name: 'Sunday Nsa', role: 'Member', phone: '08029988776', bank: 'Fidelity Bank', accountNumber: '5091029381', trustScore: 92, position: 2 },
      { id: 'm203', name: 'Inyang Duke', role: 'Member', phone: '07011122444', bank: 'OPay Nigeria', accountNumber: '7011122444', trustScore: 89, position: 3 },
      { id: 'm204', name: 'Jane Ene-Obong', role: 'Member', phone: '08182233445', bank: 'First City Monument Bank (FCMB)', accountNumber: '3091029384', trustScore: 96, position: 4 },
      { id: 'm205', name: 'Okon Edem', role: 'Member', phone: '08031144556', bank: 'Zenith Bank', accountNumber: '2219401928', trustScore: 84, position: 5 },
      { id: 'm206', name: 'Arit Ntiero', role: 'Member', phone: '09087766554', bank: 'Access Bank', accountNumber: '0891029381', trustScore: 91, position: 6 },
    ],
    contributions: {
      1: [
        { memberId: 'm201', status: 'Verified', date: '2026-07-01', channel: 'Moniepoint', ref: 'MNP-MAR-01' },
        { memberId: 'm202', status: 'Verified', date: '2026-07-01', channel: 'Fidelity Transfer', ref: 'FID-90182' },
        { memberId: 'm203', status: 'Verified', date: '2026-07-02', channel: 'OPay', ref: 'OPY-00918' },
        { memberId: 'm204', status: 'Verified', date: '2026-07-01', channel: 'FCMB Mobile', ref: 'FCMB-8812' },
        { memberId: 'm205', status: 'Verified', date: '2026-07-03', channel: 'Zenith Bank', ref: 'ZNT-77182' },
        { memberId: 'm206', status: 'Verified', date: '2026-07-02', channel: 'Access Bank', ref: 'ACC-55102' },
      ],
      2: [
        { memberId: 'm201', status: 'Verified', date: '2026-07-15', channel: 'Moniepoint', ref: 'MNP-MAR-02' },
        { memberId: 'm202', status: 'Verified', date: '2026-07-16', channel: 'Fidelity Transfer', ref: 'FID-90999' },
        { memberId: 'm203', status: 'Pending Verification', date: '2026-07-30', channel: 'OPay', ref: 'OPY-00999', proofNote: 'Paid ₦25,000 for bi-weekly Ajo' },
        { memberId: 'm204', status: 'Verified', date: '2026-07-15', channel: 'FCMB Mobile', ref: 'FCMB-8899' },
        { memberId: 'm205', status: 'Overdue', date: null, channel: null, ref: null },
        { memberId: 'm206', status: 'Verified', date: '2026-07-16', channel: 'Access Bank', ref: 'ACC-55999' },
      ]
    },
    payoutSchedule: [
      { cycle: 1, memberId: 'm201', amount: 150000, date: '2026-07-14', status: 'Disbursed', ref: 'PAY-MAR-01' },
      { cycle: 2, memberId: 'm202', amount: 150000, date: '2026-08-01', status: 'Current Target', ref: null },
      { cycle: 3, memberId: 'm203', amount: 150000, date: '2026-08-15', status: 'Upcoming', ref: null },
      { cycle: 4, memberId: 'm204', amount: 150000, date: '2026-08-29', status: 'Upcoming', ref: null },
      { cycle: 5, memberId: 'm205', amount: 150000, date: '2026-09-12', status: 'Upcoming', ref: null },
      { cycle: 6, memberId: 'm206', amount: 150000, date: '2026-09-26', status: 'Upcoming', ref: null },
    ]
  },
  {
    id: 'group-3',
    name: 'Marian Road Tech & Business Guild',
    hubLocation: 'State Housing Estate / Marian Road, Calabar',
    description: 'Monthly high-yield thrift pool for tech startup founders, digital agency owners, and service providers in Calabar.',
    contributionAmount: 200000, // ₦200,000 monthly
    frequency: 'Monthly',
    penaltyFee: 10000,
    startDate: '2026-05-01',
    currentCycleIndex: 3,
    totalCycles: 5,
    trustee: 'Engr. Daniel Kufre',
    trusteeContact: '+234 802 888 9900',
    members: [
      { id: 'm301', name: 'Engr. Daniel Kufre', role: 'Guild Lead', phone: '08028889900', bank: 'Stanbic IBTC', accountNumber: '0029182749', trustScore: 99, position: 1 },
      { id: 'm302', name: 'Aniekan Udo', role: 'Member', phone: '08124445566', bank: 'Guaranty Trust Bank (GTBank)', accountNumber: '0129482910', trustScore: 96, position: 2 },
      { id: 'm303', name: 'Miracle Otu', role: 'Member', phone: '07065554433', bank: 'Zenith Bank', accountNumber: '2091029384', trustScore: 94, position: 3 },
      { id: 'm304', name: 'Kufre-Abasi King', role: 'Member', phone: '08037778899', bank: 'Standard Chartered', accountNumber: '5001928471', trustScore: 91, position: 4 },
      { id: 'm305', name: 'Ester Cobham', role: 'Member', phone: '08109990011', bank: 'Moniepoint MFB', accountNumber: '6102938471', trustScore: 97, position: 5 },
    ],
    contributions: {
      1: [
        { memberId: 'm301', status: 'Verified', date: '2026-05-02', channel: 'Stanbic App', ref: 'STB-55102' },
        { memberId: 'm302', status: 'Verified', date: '2026-05-03', channel: 'GTWorld App', ref: 'GTB-90182' },
        { memberId: 'm303', status: 'Verified', date: '2026-05-02', channel: 'Zenith Transfer', ref: 'ZNT-40192' },
        { memberId: 'm304', status: 'Verified', date: '2026-05-04', channel: 'Online Banking', ref: 'SCB-88192' },
        { memberId: 'm305', status: 'Verified', date: '2026-05-01', channel: 'Moniepoint', ref: 'MNP-10293' },
      ],
      2: [
        { memberId: 'm301', status: 'Verified', date: '2026-06-02', channel: 'Stanbic App', ref: 'STB-55200' },
        { memberId: 'm302', status: 'Verified', date: '2026-06-03', channel: 'GTWorld App', ref: 'GTB-90200' },
        { memberId: 'm303', status: 'Verified', date: '2026-06-02', channel: 'Zenith Transfer', ref: 'ZNT-40200' },
        { memberId: 'm304', status: 'Verified', date: '2026-06-04', channel: 'Online Banking', ref: 'SCB-88200' },
        { memberId: 'm305', status: 'Verified', date: '2026-06-01', channel: 'Moniepoint', ref: 'MNP-10300' },
      ],
      3: [
        { memberId: 'm301', status: 'Verified', date: '2026-07-02', channel: 'Stanbic App', ref: 'STB-55300' },
        { memberId: 'm302', status: 'Verified', date: '2026-07-03', channel: 'GTWorld App', ref: 'GTB-90300' },
        { memberId: 'm303', status: 'Verified', date: '2026-07-28', channel: 'Zenith Transfer', ref: 'ZNT-40300' },
        { memberId: 'm304', status: 'Verified', date: '2026-07-29', channel: 'Online Banking', ref: 'SCB-88300' },
        { memberId: 'm305', status: 'Verified', date: '2026-07-01', channel: 'Moniepoint', ref: 'MNP-10400' },
      ]
    },
    payoutSchedule: [
      { cycle: 1, memberId: 'm301', amount: 1000000, date: '2026-05-31', status: 'Disbursed', ref: 'PAY-TECH-01' },
      { cycle: 2, memberId: 'm302', amount: 1000000, date: '2026-06-30', status: 'Disbursed', ref: 'PAY-TECH-02' },
      { cycle: 3, memberId: 'm303', amount: 1000000, date: '2026-08-05', status: 'Current Target', ref: null },
      { cycle: 4, memberId: 'm304', amount: 1000000, date: '2026-08-31', status: 'Upcoming', ref: null },
      { cycle: 5, memberId: 'm305', amount: 1000000, date: '2026-09-30', status: 'Upcoming', ref: null },
    ]
  }
];

export const initialAuditLogs = [
  { id: 'log-1', timestamp: '2026-07-30T10:15:00Z', groupName: 'Watt Market Fabric & Textiles Ajo', action: 'Log Payment', detail: 'Ekaette Okon logged pending payment of ₦100,000 via FirstBank Mobile (FB-409988)' },
  { id: 'log-2', timestamp: '2026-07-29T14:30:00Z', groupName: 'Watt Market Fabric & Textiles Ajo', action: 'Verify Contribution', detail: 'Mama Blessing Edet verified Effiong Bassey ₦100,000 payment (ZNT-995001)' },
  { id: 'log-3', timestamp: '2026-07-29T11:00:00Z', groupName: 'Balogun Market Fashion Merchants Ajo', action: 'Verify Contribution', detail: 'Alhaja Kudirat Folami verified Chinyere Nwosu ₦150,000 payment (ZNT-BAL-03)' },
  { id: 'log-4', timestamp: '2026-07-28T09:00:00Z', groupName: 'Marian Road Tech & Business Guild', action: 'Payout Disbursed', detail: '₦1,000,000 payout cycle 2 disbursed to Aniekan Udo (GTBank)' },
];
