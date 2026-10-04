import { DAY, uid } from './format.js';

// Example data for demo mode. Clearly fictional.
export function seedData() {
  const now = Date.now();
  const iso = d => new Date(now + d * DAY).toISOString();
  const c = (name, email, phone, address) => ({ id: uid(), name, email, phone, address, notes: '', createdAt: iso(-60) });
  const customers = [
    c('Helen Carter', 'helen.carter@example.com', '+30 690 000 0001', '22 Mill Lane'),
    c('Northgate Café', 'owner@northgate.example', '+30 690 000 0002', '1 Northgate'),
    c('Tom & Ana Ruiz', 'ruiz.home@example.com', '+30 690 000 0003', '48 Elm Street'),
    c('Priya Shah', 'priya@example.com', '+30 690 000 0004', 'Flat 3, 9 Station Rd'),
    c('Marcus Lee', 'marcus.lee@example.com', '+30 690 000 0005', '3 Quarry Close'),
    c('Grace Okafor', 'grace.o@example.com', '+30 690 000 0006', '12 Riverside'),
    c('Daniel Moss', 'dan.moss@example.com', '+30 690 000 0007', '7 Orchard Way')
  ];
  const C = n => customers.find(x => x.name === n).id;
  const it = rows => rows.map(([desc, qty, unit, rate]) => ({ desc, qty, unit, rate }));
  const w = (no, cust, title, stage, items, extra = {}) => ({
    id: uid(), no, title, stage, customerId: C(cust), items: it(items), vat: 24, notes: '',
    tasks: [], token: uid(), changeRequest: null, createdAt: iso(-(1050 - no)), ...extra
  });
  const work = [
    w(1044, 'Daniel Moss', 'Outside garden tap with isolator', 'draft', [['Supply & fit outdoor tap kit', 1, 'ea', 68], ['Labour', 1.5, 'hr', 45]]),
    w(1043, 'Helen Carter', 'Bathroom: replace basin and copper run', 'sent',
      [['Call-out and first hour', 1, 'ea', 85], ['Remove old basin and trap', 1, 'ea', 60], ['15mm copper pipe, supply & fit', 6, 'm', 31], ['Fit new basin and mixer tap', 1, 'ea', 240]],
      { sentAt: iso(-1) }),
    w(1042, 'Priya Shah', 'Replace leaking cylinder valve', 'approved', [['Pressure relief valve', 1, 'ea', 42], ['Labour', 2, 'hr', 45]],
      { sentAt: iso(-3), approvedAt: iso(-1), approvedBy: 'Priya Shah' }),
    w(1041, 'Northgate Café', 'Commercial kitchen: new sink and grease trap', 'job',
      [['Stainless double sink', 1, 'ea', 390], ['Grease trap, 25 L', 1, 'ea', 310], ['Waste pipework 40mm', 8, 'm', 14], ['Labour', 6, 'hr', 45]],
      { sentAt: iso(-8), approvedAt: iso(-6), approvedBy: 'Sam Patel', startedAt: iso(-2) }),
    w(1040, 'Tom & Ana Ruiz', 'Boiler service and radiator flush', 'invoiced',
      [['Annual boiler service', 1, 'ea', 95], ['Power flush, 9 radiators', 1, 'ea', 420], ['Inhibitor', 1, 'ea', 18]],
      { sentAt: iso(-25), approvedAt: iso(-24), approvedBy: 'Ana Ruiz', startedAt: iso(-12), doneAt: iso(-9), invoicedAt: iso(-9), dueAt: iso(5) }),
    w(1039, 'Marcus Lee', 'Emergency leak under kitchen sink', 'invoiced',
      [['Emergency call-out', 1, 'ea', 120], ['Compression fittings', 3, 'ea', 6.5]],
      { sentAt: iso(-27), approvedAt: iso(-27), approvedBy: 'Marcus Lee', startedAt: iso(-26), doneAt: iso(-19), invoicedAt: iso(-19), dueAt: iso(-5) }),
    w(1038, 'Grace Okafor', 'Replace toilet cistern internals', 'paid', [['Dual-flush valve kit', 1, 'ea', 38], ['Labour', 1, 'hr', 45]],
      { sentAt: iso(-33), approvedAt: iso(-32), approvedBy: 'Grace Okafor', doneAt: iso(-24), invoicedAt: iso(-24), dueAt: iso(-10), paidAt: iso(-21) }),
    w(1037, 'Northgate Café', 'Replace hand-wash basin taps', 'paid', [['Lever taps pair', 1, 'ea', 64], ['Labour', 2, 'hr', 45]],
      { sentAt: iso(-60), approvedAt: iso(-59), approvedBy: 'Sam Patel', doneAt: iso(-55), invoicedAt: iso(-55), dueAt: iso(-41), paidAt: iso(-48) }),
    w(1036, 'Helen Carter', 'Radiator valve replacement x4', 'paid', [['TRV valves', 4, 'ea', 22], ['Labour', 3, 'hr', 45]],
      { sentAt: iso(-95), approvedAt: iso(-94), approvedBy: 'Helen Carter', doneAt: iso(-90), invoicedAt: iso(-90), dueAt: iso(-76), paidAt: iso(-80) }),
    w(1035, 'Tom & Ana Ruiz', 'New outside drain gully', 'paid', [['Drain gully & grid', 1, 'ea', 75], ['Labour', 5, 'hr', 45]],
      { sentAt: iso(-130), approvedAt: iso(-128), approvedBy: 'Tom Ruiz', doneAt: iso(-120), invoicedAt: iso(-120), dueAt: iso(-106), paidAt: iso(-110) }),
    w(1034, 'Priya Shah', 'Kitchen sink waste unblock', 'paid', [['Call-out and first hour', 1, 'ea', 85]],
      { sentAt: iso(-150), approvedAt: iso(-150), approvedBy: 'Priya Shah', doneAt: iso(-149), invoicedAt: iso(-149), dueAt: iso(-135), paidAt: iso(-140) })
  ];
  const job = work.find(x => x.no === 1041);
  job.tasks = [...job.items.map((i, k) => ({ t: i.desc, done: k < 2 })), { t: 'Test, tidy up and photos', done: false }];
  work.filter(x => ['invoiced', 'paid'].includes(x.stage)).forEach(x => (x.tasks = x.items.map(i => ({ t: i.desc, done: true }))));
  const prices = [
    ['Call-out and first hour', 'ea', 85], ['Labour', 'hr', 45], ['15mm copper pipe, supply & fit', 'm', 31],
    ['22mm copper pipe, supply & fit', 'm', 38], ['Fit mixer tap', 'ea', 95], ['Annual boiler service', 'ea', 95],
    ['Power flush (up to 10 radiators)', 'ea', 420], ['TRV valve, supply & fit', 'ea', 22]
  ].map(([description, unit, rate]) => ({ id: uid(), description, unit, rate, createdAt: iso(-90) }));
  const settings = {
    businessName: 'Reed Plumbing & Heating', ownerName: 'Alex Reed', email: 'hello@reedplumbing.example', phone: '+30 690 000 0100',
    address: '5 Harbour Road', vatNumber: 'EL123456789', vatRate: 24, paymentTermsDays: 14, quoteValidDays: 30,
    bankDetails: 'IBAN GR00 0000 0000 0000 0000 0000 000 · Reed Plumbing'
  };
  return { customers, work, prices, settings };
}
