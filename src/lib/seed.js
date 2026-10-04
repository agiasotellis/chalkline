import { DAY, uid } from './format.js';

// Example data for demo mode, one set per version. Clearly fictional.
const TEXT = {
  en: {
    customers: [
      ['Helen Carter', 'helen.carter@example.com', '(555) 010-0101', '22 Mill Lane, Austin, TX'],
      ['Northgate Café', 'owner@northgate.example', '(555) 010-0102', '1 Northgate Ave, Austin, TX'],
      ['Tom & Ana Ruiz', 'ruiz.home@example.com', '(555) 010-0103', '48 Elm Street, Round Rock, TX'],
      ['Priya Shah', 'priya@example.com', '(555) 010-0104', 'Apt 3, 9 Station Rd, Austin, TX'],
      ['Marcus Lee', 'marcus.lee@example.com', '(555) 010-0105', '3 Quarry Close, Cedar Park, TX'],
      ['Grace Okafor', 'grace.o@example.com', '(555) 010-0106', '12 Riverside Dr, Austin, TX'],
      ['Daniel Moss', 'dan.moss@example.com', '(555) 010-0107', '7 Orchard Way, Pflugerville, TX']
    ],
    work: {
      1044: ['Outdoor hose bib with shutoff', [['Supply & install frost-free hose bib', 1, 'ea', 68], ['Labor', 1.5, 'hr', 75]]],
      1043: ['Bathroom: replace sink and supply lines', [['Service call and first hour', 1, 'ea', 95], ['Remove old sink and trap', 1, 'ea', 60], ['1/2" copper supply line, install', 18, 'ft', 9], ['Install new sink and faucet', 1, 'ea', 240]]],
      1042: ['Replace leaking water heater valve', [['Temperature & pressure relief valve', 1, 'ea', 42], ['Labor', 2, 'hr', 75]]],
      1041: ['Commercial kitchen: new sink and grease trap', [['Stainless double sink', 1, 'ea', 390], ['Grease trap, 25 gal', 1, 'ea', 310], ['1-1/2" drain pipe', 24, 'ft', 6], ['Labor', 6, 'hr', 75]]],
      1040: ['Water heater flush and service', [['Annual water heater service', 1, 'ea', 129], ['Flush and descale', 1, 'ea', 180], ['Anode rod', 1, 'ea', 45]]],
      1039: ['Emergency leak under kitchen sink', [['Emergency service call', 1, 'ea', 150], ['Compression fittings', 3, 'ea', 6.5]]],
      1038: ['Replace toilet fill valve and flapper', [['Fill valve and flapper kit', 1, 'ea', 38], ['Labor', 1, 'hr', 75]]],
      1037: ['Replace hand-wash sink faucets', [['Commercial lever faucets', 1, 'ea', 64], ['Labor', 2, 'hr', 75]]],
      1036: ['Shut-off valve replacement x4', [['Quarter-turn shut-off valves', 4, 'ea', 22], ['Labor', 3, 'hr', 75]]],
      1035: ['New outdoor drain', [['Catch basin and grate', 1, 'ea', 75], ['Labor', 5, 'hr', 75]]],
      1034: ['Kitchen drain unclog', [['Service call and first hour', 1, 'ea', 95]]]
    },
    approvers: { 1041: 'Sam Patel', 1040: 'Ana Ruiz', 1037: 'Sam Patel', 1035: 'Tom Ruiz' },
    prices: [['Service call and first hour', 'ea', 95], ['Labor', 'hr', 75], ['1/2" copper pipe, install', 'ft', 9], ['3/4" copper pipe, install', 'ft', 12],
      ['Install faucet', 'ea', 120], ['Annual water heater service', 'ea', 129], ['Drain cleaning', 'ea', 180], ['Shut-off valve, install', 'ea', 22]],
    settings: {
      businessName: 'Reed Plumbing & Heating', ownerName: 'Alex Reed', email: 'hello@reedplumbing.example', phone: '(555) 010-0100',
      address: '5 Harbor Road, Austin, TX', vatNumber: '12-3456789', vatRate: 8.25,
      bankDetails: 'Zelle: pay@reedplumbing.example · or check payable to Reed Plumbing LLC'
    }
  },
  el: {
    customers: [
      ['Ελένη Καραγιάννη', 'eleni.k@example.com', '690 000 0001', 'Μιλτιάδου 22, Αθήνα'],
      ['Καφέ Βόρεια Πύλη', 'info@voreiapyli.example', '690 000 0002', 'Ερμού 1, Θεσσαλονίκη'],
      ['Τάσος & Άννα Ρήγα', 'riga.home@example.com', '690 000 0003', 'Πλατάνων 48, Μαρούσι'],
      ['Μαρία Σταθοπούλου', 'maria.s@example.com', '690 000 0004', 'Σταδίου 9, διαμ. 3, Αθήνα'],
      ['Μάρκος Λιάκος', 'markos.l@example.com', '690 000 0005', 'Λατομείων 3, Περιστέρι'],
      ['Γεωργία Οικονόμου', 'georgia.o@example.com', '690 000 0006', 'Παραλίας 12, Βούλα'],
      ['Δανιήλ Μόσχος', 'danos@example.com', '690 000 0007', 'Οπωρώνων 7, Χαλάνδρι']
    ],
    work: {
      1044: ['Εξωτερική βρύση κήπου με διακόπτη', [['Προμήθεια & τοποθέτηση βρύσης κήπου', 1, 'ea', 68], ['Εργασία', 1.5, 'hr', 35]]],
      1043: ['Μπάνιο: αλλαγή νιπτήρα και σωληνώσεων', [['Επίσκεψη και πρώτη ώρα', 1, 'ea', 60], ['Αποξήλωση παλιού νιπτήρα και σιφωνιού', 1, 'ea', 50], ['Χαλκοσωλήνας 15mm, προμήθεια & τοποθέτηση', 6, 'm', 28], ['Τοποθέτηση νιπτήρα και μπαταρίας', 1, 'ea', 220]]],
      1042: ['Αλλαγή βαλβίδας ασφαλείας θερμοσίφωνα', [['Βαλβίδα ασφαλείας', 1, 'ea', 38], ['Εργασία', 2, 'hr', 35]]],
      1041: ['Επαγγελματική κουζίνα: νέος νεροχύτης και λιποσυλλέκτης', [['Ανοξείδωτος διπλός νεροχύτης', 1, 'ea', 360], ['Λιποσυλλέκτης 100 λίτρων', 1, 'ea', 290], ['Σωλήνας αποχέτευσης 40mm', 8, 'm', 12], ['Εργασία', 6, 'hr', 35]]],
      1040: ['Συντήρηση λέβητα και καθαρισμός καλοριφέρ', [['Ετήσια συντήρηση λέβητα', 1, 'ea', 80], ['Χημικός καθαρισμός, 9 σώματα', 1, 'ea', 360], ['Αντιδιαβρωτικό υγρό', 1, 'ea', 18]]],
      1039: ['Επείγουσα διαρροή κάτω από τον νεροχύτη', [['Επείγουσα επίσκεψη', 1, 'ea', 90], ['Ρακόρ σύσφιξης', 3, 'ea', 6]]],
      1038: ['Αλλαγή μηχανισμού καζανακίου', [['Μηχανισμός διπλής ροής', 1, 'ea', 34], ['Εργασία', 1, 'hr', 35]]],
      1037: ['Αλλαγή μπαταριών στους νιπτήρες', [['Μπαταρίες με λεβιέ, ζεύγος', 1, 'ea', 58], ['Εργασία', 2, 'hr', 35]]],
      1036: ['Αλλαγή 4 διακοπτών καλοριφέρ', [['Θερμοστατικοί διακόπτες', 4, 'ea', 20], ['Εργασία', 3, 'hr', 35]]],
      1035: ['Νέο φρεάτιο αυλής', [['Φρεάτιο με σχάρα', 1, 'ea', 70], ['Εργασία', 5, 'hr', 35]]],
      1034: ['Απόφραξη αποχέτευσης κουζίνας', [['Επίσκεψη και πρώτη ώρα', 1, 'ea', 60]]]
    },
    approvers: { 1041: 'Σάκης Πάτσης', 1040: 'Άννα Ρήγα', 1037: 'Σάκης Πάτσης', 1035: 'Τάσος Ρήγας' },
    prices: [['Επίσκεψη και πρώτη ώρα', 'ea', 60], ['Εργασία', 'hr', 35], ['Χαλκοσωλήνας 15mm, τοποθέτηση', 'm', 28], ['Χαλκοσωλήνας 22mm, τοποθέτηση', 'm', 34],
      ['Τοποθέτηση μπαταρίας', 'ea', 45], ['Ετήσια συντήρηση λέβητα', 'ea', 80], ['Απόφραξη αποχέτευσης', 'ea', 70], ['Θερμοστατικός διακόπτης, τοποθέτηση', 'ea', 20]],
    settings: {
      businessName: 'Ρήγας Υδραυλικά & Θέρμανση', ownerName: 'Αλέξης Ρήγας', email: 'info@rigas-ydravlika.example', phone: '210 000 0100',
      address: 'Λιμένος 5, Πειραιάς', vatNumber: '123456789', vatRate: 24,
      bankDetails: 'Πειραιώς · IBAN GR00 0000 0000 0000 0000 0000 000 · Αλέξης Ρήγας'
    }
  }
};

export function seedData(lang = 'en') {
  const T = TEXT[lang] || TEXT.en;
  const now = Date.now();
  const iso = d => new Date(now + d * DAY).toISOString();
  const customers = T.customers.map(([name, email, phone, address]) => ({ id: uid(), name, email, phone, address, notes: '', createdAt: iso(-60) }));
  const C = i => customers[i].id;
  const it = rows => rows.map(([desc, qty, unit, rate]) => ({ desc, qty, unit, rate }));
  const cust = { 1044: 6, 1043: 0, 1042: 3, 1041: 1, 1040: 2, 1039: 4, 1038: 5, 1037: 1, 1036: 0, 1035: 2, 1034: 3 };
  const by = no => T.approvers[no] || customers[cust[no]].name;
  const w = (no, stage, extra = {}) => ({
    id: uid(), no, title: T.work[no][0], stage, customerId: C(cust[no]), items: it(T.work[no][1]), vat: T.settings.vatRate, notes: '',
    tasks: [], token: uid(), changeRequest: null, createdAt: iso(-(1050 - no)), ...extra
  });
  const work = [
    w(1044, 'draft'),
    w(1043, 'sent', { sentAt: iso(-1) }),
    w(1042, 'approved', { sentAt: iso(-3), approvedAt: iso(-1), approvedBy: by(1042) }),
    w(1041, 'job', { sentAt: iso(-8), approvedAt: iso(-6), approvedBy: by(1041), startedAt: iso(-2) }),
    w(1040, 'invoiced', { sentAt: iso(-25), approvedAt: iso(-24), approvedBy: by(1040), startedAt: iso(-12), doneAt: iso(-9), invoicedAt: iso(-9), dueAt: iso(5) }),
    w(1039, 'invoiced', { sentAt: iso(-27), approvedAt: iso(-27), approvedBy: by(1039), startedAt: iso(-26), doneAt: iso(-19), invoicedAt: iso(-19), dueAt: iso(-5) }),
    w(1038, 'paid', { sentAt: iso(-33), approvedAt: iso(-32), approvedBy: by(1038), doneAt: iso(-24), invoicedAt: iso(-24), dueAt: iso(-10), paidAt: iso(-21) }),
    w(1037, 'paid', { sentAt: iso(-60), approvedAt: iso(-59), approvedBy: by(1037), doneAt: iso(-55), invoicedAt: iso(-55), dueAt: iso(-41), paidAt: iso(-48) }),
    w(1036, 'paid', { sentAt: iso(-95), approvedAt: iso(-94), approvedBy: by(1036), doneAt: iso(-90), invoicedAt: iso(-90), dueAt: iso(-76), paidAt: iso(-80) }),
    w(1035, 'paid', { sentAt: iso(-130), approvedAt: iso(-128), approvedBy: by(1035), doneAt: iso(-120), invoicedAt: iso(-120), dueAt: iso(-106), paidAt: iso(-110) }),
    w(1034, 'paid', { sentAt: iso(-150), approvedAt: iso(-150), approvedBy: by(1034), doneAt: iso(-149), invoicedAt: iso(-149), dueAt: iso(-135), paidAt: iso(-140) })
  ];
  const finalTask = lang === 'el' ? 'Δοκιμή, καθάρισμα και φωτογραφίες' : 'Test, tidy up and photos';
  const job = work.find(x => x.no === 1041);
  job.tasks = [...job.items.map((i, k) => ({ t: i.desc, done: k < 2 })), { t: finalTask, done: false }];
  work.filter(x => ['invoiced', 'paid'].includes(x.stage)).forEach(x => (x.tasks = x.items.map(i => ({ t: i.desc, done: true }))));
  const prices = T.prices.map(([description, unit, rate]) => ({ id: uid(), description, unit, rate, createdAt: iso(-90) }));
  const settings = { ...T.settings, paymentTermsDays: 14, quoteValidDays: 30, tourDone: false, logoUrl: '', locale: lang };
  return { customers, work, prices, settings, lang };
}
