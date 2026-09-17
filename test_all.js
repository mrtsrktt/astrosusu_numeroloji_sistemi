// Tum motor fonksiyonlarini ornek veriyle calistir, hata var mi bak
const E = require('./astro_sushu_engine.js');

const ad = 'Ornek Kisi';
const d = 15, m = 3, y = 1990;

const tests = {
  lifePath: () => E.lifePath(d, m, y),
  birthdayNumber: () => E.birthdayNumber(d),
  expressionNumber: () => E.expressionNumber(ad),
  soulUrgeNumber: () => E.soulUrgeNumber(ad),
  personalityNumber: () => E.personalityNumber(ad),
  maturityNumber: () => E.maturityNumber(ad, d, m, y),
  attitudeNumber: () => E.attitudeNumber(d, m),
  balanceNumber: () => E.balanceNumber(ad),
  cornerstone: () => E.cornerstone(ad),
  capstone: () => E.capstone(ad),
  firstVowelValue: () => E.firstVowelValue(ad),
  keyNumber: () => E.keyNumber(ad),
  spine: () => E.spine(ad),
  bridgeNumber: () => E.bridgeNumber(ad, d, m, y),
  masterLetters: () => E.masterLetters(ad),
  subconsciousAndKarma: () => E.subconsciousAndKarma(ad),
  expressionPlanes: () => E.expressionPlanes(ad),
  letterGroups: () => E.letterGroups(ad),
  personalYear: () => E.personalYear(d, m, 2026),
  personalMonth: () => E.personalMonth(d, m, 2026, 9),
  personalDay: () => E.personalDay(d, m, 2026, 9, 17),
  personalWeek: () => E.personalWeek(d, m, 2026, 9, 17),
  universalYear: () => E.universalYear(2026),
  universalMonth: () => E.universalMonth(2026, 9),
  universalDay: () => E.universalDay(2026, 9, 17),
  universalWeek: () => E.universalWeek(2026, 9, 17),
  fibonacciSequence: () => E.fibonacciSequence(10),
  fibonacciAnalysis: () => E.fibonacciAnalysis(2026),
  pinnaclesAndChallenges: () => E.pinnaclesAndChallenges(d, m, y),
  lifeCycles: () => E.lifeCycles(d, m, y),
  numberMatrix: () => E.numberMatrix(ad, false),
  transitionCycles: () => E.transitionCycles(ad, y),
  tirolWheel: () => E.tirolWheel(ad, d, m, y),
  karmaAnalysis: () => E.karmaAnalysis(ad, d, m, y),
  destinyMatrix: () => E.destinyMatrix(ad, d, m, y),
  personalCycles: () => E.personalCycles(d, m, y, 2026),
  transformationYears: () => E.transformationYears(d, m, 2026),
  universalDate: () => E.universalDate(2026, 9, 17),
  universalWheel: () => E.universalWheel(2026),
  personalWeekTable: () => E.personalWeekTable(d, m, y, 2026),
  nameCompatibility: () => E.nameCompatibility(ad, 'Ayse Yilmaz'),
  plateAnalysis: () => E.plateAnalysis('34 ABC 123'),
  identityNumberAnalysis: () => E.identityNumberAnalysis('12345678901')
};

let ok = 0, fail = 0;
for (const [name, fn] of Object.entries(tests)) {
  try {
    const r = fn();
    if (r === undefined || r === null) {
      console.log('BOS  ' + name);
      fail++;
    } else {
      ok++;
    }
  } catch (e) {
    console.log('HATA ' + name + ' -> ' + e.message);
    fail++;
  }
}
console.log('\nSONUC: ' + ok + ' calisti, ' + fail + ' sorunlu');

// Astro Şuşu referans karsilastirmalari
console.log('\n--- ASTRO SUSHU KARSILASTIRMA (15.3.1990 / Ornek Kisi) ---');
console.log('Yasam Yolu:', JSON.stringify(E.lifePath(d, m, y)));
console.log('Ifade:', E.expressionNumber(ad), '(Astro Şuşu: 3)');
console.log('Kalp:', E.soulUrgeNumber(ad), '(Astro Şuşu: 11)');
console.log('Ustat harfler:', JSON.stringify(E.masterLetters(ad)));
const ka = E.karmaAnalysis(ad, d, m, y);
console.log('Karma:', JSON.stringify(ka).slice(0, 500));
const dm = E.destinyMatrix(ad, d, m, y);
console.log('Kader Matrisi:', JSON.stringify(dm).slice(0, 400));
