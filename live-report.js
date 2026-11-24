const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const engine = require('./astro_sushu_engine');
const outline = require('./report-outline.json');
const BODY_FONT_SIZE = 13.5;
const BODY_LINE_GAP = 2;
const CONTENT_HEIGHT = 506;
const MAX_UNUSED_CONTENT_HEIGHT = 74;
const ROOMY_BODY_FONT_SIZES = [14.5, 15.5];
const ADVICE_TITLE = 'Sana önerim';
const sectionId = p => `section-${String(p.page).padStart(2,'0')}`;
const intro = {page:0,title:'Bu analiz sana ne anlatıyor?',section:'Kişisel giriş'};
const interpretationPages = [intro,...outline.slice(3)];
const interpretationId = p => p === intro ? 'section-intro' : sectionId(p);
const introAdvice='İçindekiler’den merak ettiğin bölümü aç. Sana en tanıdık gelen örnekle başla ve o bölümdeki öneriyi nerede deneyeceğine karar ver.';
const editorialStyle='ORTAK ÜSLUP KURALI — ilk üretimde ve tüm düzeltme adaylarında aynı kurallar geçerlidir. Danışana sen diye seslen; kısa ve net cümleler kur. Yalnız gönderilen motor temasının sana nerede güç verdiğini ve aşırısının nerede zorladığını gündelik bir durumla bağla. Varsayımsal durum için eğer yapısını kullan; yaşanmamış olayı olmuş gibi yazma. Olabilir, gelebilir, güçlendirebilir, isteyebilirsin gibi ihtimal ekleriyle cümleyi yumuşatma. Bu netlik bilimsel tanı, kesin kader, sağlık iddiası veya gelecek garantisi değildir; sembolik yorum sınırında kal. Tavsiyeyi ilgili gözlemden çıkar ve açık bir eylemle bitir. Bölümler arasında sahneleri, açılışları ve cümle yapılarını çeşitlendir; hiçbir tavsiyeyi başka bölümde birebir tekrarlama. section-intro iki veya üç motor temasını bağlasın; adla hitap yerelde eklenir, model ad yazmaz. Sayılar, yaşlar, dönem eşleşmeleri ve karmik göstergeleri motor tablosu gösterir; rakam, yeni hesap, yaş, sıra, eşleşme veya sonuç üretme. section-26 ve section-30 yalnız gönderilen motor temalarını yorumlasın, kronolojiyi tabloya bırak; ilk yıllar, sonra, ardından, son olarak gibi dönem sıralaması kurma. İstem örneklerinin cümlelerini veya kişisel ayrıntılarını kopyalama. MODEL_DUPLICATE_ADVICE hatasında başka bölümde kullanılmayan yeni ve yoruma bağlı bir eylem yaz. MODEL_PROMPT_EXAMPLE_COPY hatasında gözlemi kendi cümlelerinle ve farklı gündelik durumla yeniden kur.';
// Historical prompt examples are forbidden verbatim, not used as writing templates.
const promptExampleSentences=[
  'Bir işi hep aynı masada yapmak hevesini azaltıyorsa, başka bir yerde küçük bir başlangıç yapmak daha kolay gelebilir.',
  'Beşin değişiklik arayışı böyle küçük tercihlerde de yer bulabilir.'
];
const normalizeProse=text=>text.normalize('NFKC').toLocaleLowerCase('tr-TR').replace(/\s+/gu,' ').trim();
function registerFonts(doc) {
  doc.registerFont('body',path.join(__dirname,'assets/fonts/Carlito-Regular.ttf'));
  doc.registerFont('bold',path.join(__dirname,'assets/fonts/Carlito-Bold.ttf'));
  doc.registerFont('title',path.join(__dirname,'assets/fonts/Lora-Variable.ttf'));
  return doc;
}
const valueLabels={no:'Dönem',deger:'Sayı',yas:'Yaş aralığı',value:'Sayı',startAge:'Başlangıç yaşı',endAge:'Bitiş yaşı'};
const flattenValues=o=>Object.entries(o).map(([k,val])=>[
  valueLabels[k]||k, Array.isArray(val)?val.map(t=>typeof t==='object'?Object.entries(t).map(([a,b])=>`${valueLabels[a]||a}: ${b}`).join(' / '):t).join('; ')||'Yok':val&&typeof val==='object'?Object.entries(val).map(([a,b])=>`${valueLabels[a]||a}: ${b}`).join(' · '):String(val)
]);
function pageMeasurements(doc,p,snapshot) {
  const height=(text,font,size,width=304)=>doc.font(font).fontSize(size).heightOfString(text,{width,lineGap:BODY_LINE_GAP});
  const titleHeight=height(p.section.toLocaleUpperCase('tr-TR'),'bold',8)+12+height(p.title,'title',23)+17;
  let tableHeight=0;
  if(p.page===30) tableHeight=(snapshot.values.transitions.length+1)*17+8;
  else if(p.page===26) tableHeight=(periodMatches(snapshot.values).length+1)*20+10;
  else if(p!==intro){
    const entries=flattenValues(sectionValues(p.page,snapshot.values));
    const rows=entries.every(([k])=>/^\d+$/.test(k))?[['Sayı / tekrar',entries.map(([k,v])=>`${k}: ${v}`).join(' · ')]]:entries;
    tableHeight=rows.reduce((sum,[k,v])=>sum+height(`${k}: ${v}`,'bold',10)+4,0)+8;
  }
  return {height,titleHeight,tableHeight};
}
// Both preflight and rendering use the very same PDFKit operations for headings
// and calculation areas (including mixed-font, continued value labels).
function drawHeading(doc,text,group) {
  doc.fillColor('#52324f').font('bold').fontSize(8).text(group.toLocaleUpperCase('tr-TR'));
  doc.moveDown();
  doc.font('title').fontSize(23).fillColor('#2f2530').text(text);
  doc.moveDown(.6);
}
function drawValues(doc,object) {
  const entries=flattenValues(object);
  const rows=entries.every(([k])=>/^\d+$/.test(k))?[['Sayı / tekrar',entries.map(([k,v])=>`${k}: ${v}`).join(' · ')]]:entries;
  for(const [label,value] of rows){
    doc.font('bold').fontSize(10).fillColor('#52324f').text(`${label}: `,{continued:true});
    doc.font('body').fillColor('#302b35').text(value);doc.moveDown(.15);
  }
  doc.moveDown(.4);
}
function drawCalculation(doc,p,snapshot) {
  if(p.page===30||p.page===26){
    const transition=p.page===30;
    const rows=transition?
      [['Dönem','Sayı','Yaş aralığı'],...snapshot.values.transitions.map((t,i)=>[String(i+1),String(t.value),`${t.startAge}–${t.endAge}`])]:
      [['Yaş aralığı','Zirve','Meydan okuma'],...periodMatches(snapshot.values).map(t=>[t.ages,String(t.pinnacle),String(t.challenge)])];
    for(const [index,row] of rows.entries()){
      const y=doc.y;
      if(index%2===0)doc.rect(28,y-2,304,transition?16:19).fill('#f1e8f0');
      row.forEach((text,j)=>doc.font(index===0?'bold':'body').fontSize(10.5).fillColor('#52324f').text(text,28+j*101,y,{width:transition?98:100,lineBreak:false}));
      doc.x=28;doc.y=y+(transition?17:20);
    }
    doc.moveDown(transition?.4:.5);
  }else if(p!==intro)drawValues(doc,sectionValues(p.page,snapshot.values));
}
function measureSectionLayout(doc,p,input,snapshot,section,fontSize=BODY_FONT_SIZE) {
  doc.x=28;doc.y=78;
  drawHeading(doc,p.title,p.section);
  const titleHeight=doc.y-78;
  drawCalculation(doc,p,snapshot);
  const tableHeight=doc.y-78-titleHeight;
  const height=text=>{
    doc.font('body').fontSize(fontSize);
    return doc.heightOfString(text,{width:304,lineGap:BODY_LINE_GAP})+doc.currentLineHeight(true)*.65;
  };
  const greetingHeight=p===intro?height(`${input.name},`):0;
  let bodyHeight=section.paragraphs.reduce((sum,text)=>sum+height(text),0);
  doc.font('body').fontSize(fontSize);
  const normalParagraphGap=doc.currentLineHeight(true)*.65;
  doc.font('bold').fontSize(11);
  const adviceTitleHeight=doc.heightOfString(ADVICE_TITLE,{width:280});
  doc.font('body').fontSize(fontSize);
  // Top padding, title, inter-text gap, body, bottom padding.
  const adviceMissing=typeof section.advice!=='string'||!section.advice.trim();
  const adviceHeight=adviceMissing?initialWritingBudgets(snapshot).get(interpretationId(p)).adviceHeight:
    10+adviceTitleHeight+5+doc.heightOfString(section.advice,{width:280,lineGap:BODY_LINE_GAP})+17;
  const unadjustedTotalHeight=titleHeight+tableHeight+greetingHeight+bodyHeight+adviceHeight;
  const introGapReduction=p===intro?Math.min(Math.max(0,unadjustedTotalHeight-CONTENT_HEIGHT),Math.max(0,normalParagraphGap-6)):0;
  bodyHeight-=introGapReduction;
  const bodyAvailableHeight=Math.max(0,CONTENT_HEIGHT-titleHeight-tableHeight-greetingHeight-adviceHeight);
  return {fontSize,titleHeight,tableHeight,greetingHeight,bodyHeight,adviceHeight,bodyAvailableHeight,
    unadjustedTotalHeight,introGapReduction,finalParagraphGap:normalParagraphGap-introGapReduction,
    totalHeight:titleHeight+tableHeight+greetingHeight+bodyHeight+adviceHeight};
}
function measureReportLayout(input,snapshot,content) {
  // A tall scratch page avoids PDFKit auto-pagination while measuring bad prose.
  const doc=registerFonts(new PDFDocument({size:[360,100000],margins:{top:78,bottom:56,left:28,right:28}}));
  const issues=[];
  const measurements=new Map();
  try{
    for(const p of interpretationPages){
      const id=interpretationId(p),section=content.sections.find(s=>s.id===id);
      let measured=measureSectionLayout(doc,p,input,snapshot,section);
      // The two period tables keep their compact typography.
      if(p.page!==26 && p.page!==30){
        for(const fontSize of ROOMY_BODY_FONT_SIZES){
          if(CONTENT_HEIGHT-measured.totalHeight<=MAX_UNUSED_CONTENT_HEIGHT) break;
          const larger=measureSectionLayout(doc,p,input,snapshot,section,fontSize);
          if(larger.totalHeight>CONTENT_HEIGHT) break;
          measured=larger;
        }
      }
      measurements.set(id,measured);
      if(measured.totalHeight>CONTENT_HEIGHT){
        const code=p.page===26?'MODEL_SHARED_LAYOUT_OVERFLOW':p.page===30?'MODEL_TRANSITION_LAYOUT_OVERFLOW':'MODEL_SECTION_LAYOUT_OVERFLOW';
        issues.push({sectionId:id,code,requiredHeight:Math.ceil(measured.totalHeight),availableHeight:CONTENT_HEIGHT,measuredHeight:Math.ceil(measured.totalHeight),limitHeight:Math.floor(measured.bodyAvailableHeight),
          targetTotalCharacters:Math.max(0,Math.floor(section.paragraphs.join(' ').length*measured.bodyAvailableHeight/measured.bodyHeight*.85))});
      }
    }
    return {issues,measurements};
  }finally{doc.destroy();}
}
function initialWritingBudgets(snapshot) {
  const doc=registerFonts(new PDFDocument({size:[360,640],autoFirstPage:false}));
  // Conservative prose density estimate; actual returned prose is still measured by render.
  const sample='Yeni bir düzen denerken ayrıntıları anlamak ve kendi hızına uygun küçük bir adım seçmek sana yardımcı olabilir. ';
  const text=n=>sample.repeat(Math.ceil(n/sample.length)).slice(0,n);
  const budgets=new Map();
  for(const p of interpretationPages){
    const {height,titleHeight,tableHeight}=pageMeasurements(doc,p,snapshot);
    const adviceCharacters=120;
    const adviceHeight=height(ADVICE_TITLE,'bold',11,280)+height(text(adviceCharacters),'body',BODY_FONT_SIZE,280)+32;
    const greetingHeight=p===intro?height('Sevgili danışan,','body',BODY_FONT_SIZE)+11:0;
    const bodyHeight=Math.max(0,CONTENT_HEIGHT-titleHeight-tableHeight-adviceHeight-greetingHeight-12);
    let low=0,high=855;
    while(low<high){
      const mid=Math.ceil((low+high)/2);
      // Reserve two paragraph gaps in addition to the estimated line heights.
      if(height(text(mid),'body',BODY_FONT_SIZE)+22<=bodyHeight) low=mid; else high=mid-1;
    }
    const maxCharacters=Math.min(975,Math.floor(low*.95)+adviceCharacters);
    const minCharacters=maxCharacters>=750?750:Math.floor(maxCharacters*.78);
    budgets.set(interpretationId(p),{pageHeight:CONTENT_HEIGHT,titleHeight:Math.ceil(titleHeight),calculationHeight:Math.ceil(tableHeight),adviceHeight:Math.ceil(adviceHeight),bodyHeight:Math.floor(bodyHeight),adviceCharacters,minCharacters,maxCharacters,
      bodyMinCharacters:Math.max(0,minCharacters-adviceCharacters),bodyMaxCharacters:Math.max(0,maxCharacters-adviceCharacters)});
  }
  doc.destroy();
  return budgets;
}

function calculate(input, now = new Date()) {
  const { name } = input; const d=Number(input.d), m=Number(input.m), y=Number(input.y);
  const dt=new Date(Date.UTC(y,m-1,d));
  if (!name || dt.getUTCDate()!==d || dt.getUTCMonth()+1!==m || dt.getUTCFullYear()!==y) throw Error('INVALID_ANALYSIS_DATE');
  const cy=now.getFullYear(), cm=now.getMonth()+1, cd=now.getDate();
  const nm=engine.numberMatrix(name,false).counts, dm=engine.numberMatrix(`${d}${m}${y}`,true).counts;
  const synthesis=Object.fromEntries(Object.keys(nm).map(k=>[k,nm[k]+dm[k]]));
  const groups=Object.fromEntries(Object.entries(engine.letterGroups(name)).map(([k,v])=>[k,v.length]));
  const planes=Object.fromEntries(Object.entries(engine.expressionPlanes(name)).map(([k,v])=>[k,Object.fromEntries(Object.entries(v).map(([a,b])=>[a,b.length]))]));
  const cycles=engine.pinnaclesAndChallenges(d,m,y);
  // Explicit allowlist. Never send name, birth components, letters, email or payment data.
  const values={expression:engine.expressionNumber(name),soulUrge:engine.soulUrgeNumber(name),personality:engine.personalityNumber(name),
    cornerstone:engine.cornerstone(name),capstone:engine.capstone(name),firstVowel:engine.firstVowelValue(name),balance:engine.balanceNumber(name),
    lifePath:engine.lifePath(d,m,y),birthday:engine.birthdayNumber(d),attitude:engine.attitudeNumber(d,m),maturity:engine.maturityNumber(name,d,m,y),
    nameMatrix:nm,dateMatrix:dm,synthesisMatrix:synthesis,letterGroups:groups,planes,
    pinnacles:cycles.zirveler,challenges:cycles.zorluklar,
    personalYear:engine.personalYear(d,m,y,cy),personalMonth:engine.personalMonth(d,m,y,cy,cm),personalDay:engine.personalDay(d,m,y,cy,cm,cd),
    reportYear:cy,transitions:engine.transitionCycles(name,y).map(v=>({value:v.sayi,startAge:v.baslangic-y,endAge:v.bitis-y})),
    spine:engine.spine(name),karmicDebt:engine.karmicDebtCheck(d,m,y,name).map(({code,title,source})=>({code,title,source}))};
  // These engine functions expose letters: replace with their numeric values before egress.
  for (const k of ['cornerstone','capstone','firstVowel']) {
    const value=values[k]; values[k]=typeof value==='number'?value:engine.LETTER_VALUES[value] || 0;
  }
  values.spine={firstValue:engine.LETTER_VALUES[values.spine.first]||0,lastValue:engine.LETTER_VALUES[values.spine.last]||0};
  return {schemaVersion:1,engineSha256:crypto.createHash('sha256').update(fs.readFileSync(require.resolve('./astro_sushu_engine'))).digest('hex'),calculatedAt:now.toISOString(),values};
}
function sectionRules(id) {
  return {minCharacters:450,maxCharacters:['section-26','section-30'].includes(id)?520:975,
    minParagraphs:2,maxParagraphs:id==='section-intro'?3:4,minParagraphCharacters:70,maxParagraphCharacters:1100};
}
function periodMatches(values) {
  // Join by the engine's period identity, never by a model-supplied age/value.
  return values.pinnacles.map(p => {
    const challenge=values.challenges.find(c=>c.no===p.no);
    if(!challenge) throw Error('CALCULATION_PERIOD_MISMATCH');
    return {period:p.no,ages:p.yas.replace(/\s*-\s*/g,'–'),pinnacle:p.deger,challenge:challenge.deger};
  });
}
function modelResults(page, values) {
  const theme=number=>engine.NUMBER_MEANINGS[number] || 'Deneyimden öğrenme ve denge';
  if(page===0) return {themes:[theme(values.lifePath),theme(values.expression),theme(values.soulUrge)],
    focus:'İki veya üç temayı gündelik hayatta bir araya getir; gösterge listesi yapma. Ad ve hitap yerelde eklenecek.'};
  if(page===26) return {themes:[...new Set(periodMatches(values).map(p=>`${theme(p.pinnacle)} ile ${theme(p.challenge)}`))],
    focus:'Bu temalardan yalnız ikisini tek bir gündelik durumla ilişkilendir. Yaş, dönem sırası veya sayı eşleşmesi anlatma.'};
  if(page===30) {
    // Select recurring engine themes, not a chronology. No ages or numeric pairings leave here.
    const counts=new Map();
    for(const t of values.transitions) counts.set(t.value,(counts.get(t.value)||0)+1);
    return {themes:[...new Set([...counts].sort((a,b)=>b[1]-a[1]||a[0]-b[0]).map(([value])=>theme(value)))].slice(0,2)};
  }
  if(page===35) return {lifePathTheme:theme(values.lifePath),expressionTheme:theme(values.expression),maturityTheme:theme(values.maturity),
    scene:'Evde bir alanı yeniden düzenlemek: farklı bir yerleşimi denemek, işe yarayıp yaramadığına bakmak ve kullanışlı bir düzene karar vermek.',
    focus:'Tek sahnede üç temayı birleştir. Tanışma, davet, sohbet, hobi, yazma veya yıllık dönem anlatma.'};
  return sectionValues(page,values);
}
function diagnose(data) {
  if (!data || !Array.isArray(data.sections) || data.sections.length!==interpretationPages.length) throw Error('MODEL_SECTION_COUNT');
  const seen=new Set();
  const issues=[];
  const adviceOwners=new Map();
  for(const s of data.sections){
    if(!interpretationPages.some(p=>interpretationId(p)===s.id) || seen.has(s.id)) throw Error('MODEL_SECTION_ID');
    seen.add(s.id);
    if(!Array.isArray(s.paragraphs)||!s.paragraphs.length||s.paragraphs.some(t=>typeof t!=='string'||!t.trim())) {
      const diagnostics=[{sectionId:s.id,code:'MODEL_EMPTY_TEXT'}];
      throw Object.assign(new Error('MODEL_EMPTY_TEXT'),{diagnostics});
    }
    const rules=sectionRules(s.id);
    const measured=s.paragraphs.join(' ').length;
    const rejectSection=code=>{
      const diagnostics=[{sectionId:s.id,code}];
      console.warn('[PDF validation]',JSON.stringify(diagnostics[0]));
      throw Object.assign(new Error(code),{diagnostics});
    };
    // Reject process/prompt leakage before typesetting. Never silently repair model prose.
    const adviceMissing=typeof s.advice!=='string'||!s.advice.trim();
    if(adviceMissing)issues.push({sectionId:s.id,code:'MODEL_EMPTY_ADVICE'});
    const texts=[...s.paragraphs,...(adviceMissing?[]:[s.advice])];
    const prose=texts.join(' ').normalize('NFKC').toLocaleLowerCase('tr-TR');
    if (/(?:liste (?:dolu|boş) olduğu için|başlık ve kaynağı yorumlanır|kişiye belirli bir borç atfedilmez|(?:sistem|üretim|model|prompt) talimat|istenen (?:json|biçim|bölüm)|(?:json|markdown|html) (?:çıktı|format|şema)|(?:paragraf|kelime|karakter) (?:sayısı|sınırı)|yerelde eklen|pdf.{0,25}(?:dizgi|üretim|oluştur)|talimata (?:göre|uygun)|bu bölümde.{0,30}(?:yazılmalı|yazılacak|yorumlanmalı))/u.test(prose)) rejectSection('MODEL_INSTRUCTION_LEAK');
    if(/farkındalık daveti|içindeki sesi dinle|kendi hikâyeni yaz/iu.test(s.paragraphs.join(' '))) rejectSection('MODEL_BANNED_PHRASE');
    // Model prose must not introduce numeric figures. Numeric labels are rendered from snapshot only.
    if(texts.some(t=>/[<>]/.test(t))) rejectSection('MODEL_UNTRUSTED_HTML');
    const add=code=>issues.push({sectionId:s.id,code});
    if(!adviceMissing){
      const key=normalizeProse(s.advice);
      if(!adviceOwners.has(key))adviceOwners.set(key,[]);
      adviceOwners.get(key).push(s.id);
    }
    if(promptExampleSentences.some(example=>normalizeProse(texts.join(' ')).includes(normalizeProse(example))))add('MODEL_PROMPT_EXAMPLE_COPY');
    if(texts.some(t=>/\p{Nd}/u.test(t))) add('MODEL_NUMERIC_TEXT');
    if(s.id==='section-26' && /(?:yaş|dönem|zirve|meydan okuma|(?:bir|iki|üç|dört|beş|altı|yedi|sekiz|dokuz|on bir) (?:değeri|sayısı|zirvesi))/iu.test(prose)) add('MODEL_SHARED_REPETITION');
    if(s.id==='section-35' && /(?:kişisel yıl|rapor yılı|bu yıl|yılın|yeni yıl|sohbet|tanış|davet|hobi|yazma|yazmak)/iu.test(prose)) add('MODEL_CLOSING_REPETITION');
    // Length and paragraph counts are editorial targets, not validity constraints.
  }
  for(const owners of adviceOwners.values())if(owners.length>1)for(const id of owners)issues.push({sectionId:id,code:'MODEL_DUPLICATE_ADVICE'});
  return issues;
}
function validate(data) {
  const issues=diagnose(data);
  if(issues.length){
    for(const issue of issues) console.warn('[PDF validation]',JSON.stringify(issue));
    throw Object.assign(new Error(issues.some(i=>i.code==='MODEL_EMPTY_ADVICE')?'MODEL_EMPTY_ADVICE':'MODEL_SECTION_VALIDATION'),{diagnostics:issues});
  }
  return data;
}
function safeFailure(error, stage) {
  const message=typeof error?.message==='string'?error.message:'';
  if(['TimeoutError','AbortError'].includes(error?.name)||['ETIMEDOUT','UND_ERR_CONNECT_TIMEOUT','UND_ERR_HEADERS_TIMEOUT'].includes(error?.cause?.code)) return 'MODEL_REQUEST_TIMEOUT';
  if(/^DEEPSEEK_HTTP_[1-5]\d{2}$/.test(message)) return 'MODEL_HTTP_ERROR';
  if(['MODEL_INCOMPLETE','MODEL_INVALID_JSON'].includes(message)) return 'MODEL_INCOMPLETE_RESPONSE';
  if(/^MODEL_.*LAYOUT_OVERFLOW$/.test(message)) return 'MODEL_LAYOUT_OVERFLOW';
  if(stage==='archive_write') return 'ARCHIVE_WRITE_FAILED';
  if(stage==='pdf_validation') return 'PDF_VALIDATION_FAILED';
  if(stage==='model_request') return 'MODEL_CONNECTION_FAILED';
  if(new Set(['MODEL_SECTION_COUNT','MODEL_SECTION_ID','MODEL_EMPTY_TEXT','MODEL_EMPTY_ADVICE',
    'MODEL_INSTRUCTION_LEAK','MODEL_BANNED_PHRASE','MODEL_UNTRUSTED_HTML','MODEL_NUMERIC_TEXT',
    'MODEL_SHARED_REPETITION','MODEL_CLOSING_REPETITION','MODEL_SECTION_VALIDATION',
    'MODEL_DUPLICATE_ADVICE','MODEL_PROMPT_EXAMPLE_COPY',
    'MODEL_REPAIR_SECTION_IDS']).has(message)) return message;
  if(message==='DEEPSEEK_NOT_CONFIGURED') return message;
  return 'PDF_FAILED';
}
async function interpret(snapshot, telemetry = {}, input = {name:'Sevgili danışan'}, execution = {}) {
  telemetry.stage='model_preparation';
  telemetry.apiCallAttempts ||= 0;
  telemetry.initialOverflowSectionIds=[];
  telemetry.repairSectionIds=[];
  const key=process.env.DEEPSEEK_API_KEY;
  if(!key) throw Error('DEEPSEEK_NOT_CONFIGURED');
  const started=Date.now();
  const writingBudgets=initialWritingBudgets(snapshot);
  const request=async(ids,repairIssues=[],layoutContexts=null)=>{
    telemetry.stage='model_request';
    const remainingMs=execution.deadlineMs===undefined?240000:Math.min(240000,Math.floor(execution.deadlineMs-Date.now()));
    if(remainingMs<=0)throw Object.assign(new Error('MODEL_BUDGET_EXHAUSTED'),{name:'TimeoutError'});
   telemetry.apiCallAttempts++;
   delete telemetry.httpStatus;
   const response=await fetch('https://api.deepseek.com/chat/completions',{
    method:'POST',signal:AbortSignal.timeout(remainingMs),headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
    body:JSON.stringify({model:process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',thinking:{type:'disabled'},temperature:0.75,max_tokens:16000,
      response_format:{type:'json_object'},messages:(layoutContexts ? [
        {role:'system',content:'Türkçe numeroloji yorumundaki errors nedenlerini düzelt ve bodyBudget içine sığdır. Aynı temayı ve sen dilini koru; yeni hesap veya yaşanmış olay ekleme, rakam kullanma. preserveAdvice true ise existingAdvice doğrulanmıştır ve yerelde aynen korunacaktır; onu değiştirme veya gövdeye tekrar yazma. Yanıtı geçerli bir json nesnesi olarak döndür. preserveAdvice true bölümlerde yalnız istenen bölüm kimliği ve kısaltılmış paragraphs döndür: {"sections":[{"id":"section-30","paragraphs":["..."]}]}. Bu bölümlerde advice alanı döndürme. preserveAdvice false bölümlerde id, paragraphs ve düzeltilmiş advice döndür. bodyBudget yalnız gövdeye ayrılmıştır; öneri kutusu yüksekliği zaten çıkarılmıştır. İçerik hatalı bölümlerde adviceBudget önerinin sınırıdır; errors içindeki tüm nedenleri gider.'},
        {role:'user',content:JSON.stringify({sections:layoutContexts})}
      ] : [
        {role:'system',content:'Türkçe numeroloji yorum editörüsün. Numerolojiyi bilimsel tanı veya kesin gelecek olarak sunma. Yalnız verilen bölüm sonuçlarını sembolik olarak yorumla; yeni hesap yapma. İstenen her kimliği tam bir kez döndür. JSON: {"sections":[{"id":"section-04","paragraphs":["...","..."]}]}. Bölümleri ihtiyacına göre iki, üç veya dört paragraf yaz; tek bir ritmi hepsine uygulama. Toplam 65-85 kelime, yaklaşık 450-650 karakter hedefle. section-30 yalnız en anlamlı iki örüntüyü iki kısa paragrafta anlatsın, toplam 300-500 karakter; satırları veya yaşları tek tek tekrar etmesin. Her bölümde en az bir gözlem bölüm sonucundan türesin, fakat göstergeyi yeniden okuyan "Yedi olarak beliriyor", "İfade sayın yedi", "Tabloda ... görülüyor" gibi hesap özeti açılışları yapma. Sayının gündelik hangi durumda anlam kazanabileceğini göster. Örneğin isim matrisinde birin üç tekrarını, bir işe başlama veya söz alma isteğiyle ilişkilendir; tekrarı araya doğal biçimde yerleştir. Rakam yazma; gerekli sayıları Türkçe sözcüklerle kullan. Doğal sen dili: resmî anlatıcı gibi "sezdirir", "yorumlanır", "işlendiğini düşündürür" kalıplarını tekrarlama. Yaşanmamış olayı olmuş gibi anlatma; olabilir, bazen, eğer dili kullan. Açılışları ve bitişleri çeşitlendir. Farkındalık daveti, içindeki sesi dinle, kendi hikâyeni yaz yasak. Eksik frekans kusur değildir. Karmik borç suçlama değildir. Boş listede gösterge olmadığını söyle, borç atfetme. Dolu listede gerçek başlık ve kaynağın temasını gündelik dille anlat. Üretim kurallarını, liste doluluğu nedeniyle ne yazıldığını, JSON, PDF, model, paragraf veya talimatları okura açıklayan hiçbir cümle yazma. Aşağıdaki üslup örnekleri onaylı kısa raporun somut anlatım yaklaşımını gösterir; kopyalanacak metinler değildir, kendi sahneni kur: Yaşam yolu beş için: "Bir işi hep aynı masada yapmak hevesini azaltıyorsa, başka bir yerde küçük bir başlangıç yapmak daha kolay gelebilir. Beşin değişiklik arayışı böyle küçük tercihlerde de yer bulabilir." İfade yedi için: "Bir toplantıda hemen cevap vermek yerine söyleneni biraz tartmak isteyebilirsin. Yedinin ayrıntıya bakma isteği, aklına takılan tek bir soruya zaman ayırırken işe yarayabilir." Kalp arzusu için: "Günün sonunda seni asıl yoran şey işin miktarı değil, ona kendi istediğin biçimde yaklaşamamak olabilir." Bu örnekleri tekrar etme ve tüm bölümleri masa/toplantı sahnesiyle başlatma.'},
        {role:'system',content:'Gönderilen writingTarget yalnız yazım hedefidir; hedefi doldurmak için metni uzatma. Olgunluk Sayısı, Kişisel Ay ve Kişisel Gün bölümünde hesaba bağlı tek gündelik gözlem yeterli olabilir. Geçişlerde tabloyu tekrar saymadan iki örüntüyü kısa anlat. Yalnız istenen kimlikleri döndür.'},
        {role:'system',content:'section-26 ortak yorumunda yaş aralıklarını, zirve ve meydan okuma sayılarını veya dönem eşleşmelerini metinde yeniden sayma. Bunlar motorun aynı dönem kimliğiyle eşleştirdiği tabloda zaten gösterilir. Yalnız eşleşmelerin temalarını gündelik durumlarla yorumla; bağımsızlık, ortak karar veya ifade gibi temaların nasıl birlikte çalışabileceğini anlat. section-35 Kapanış, section-27 Kişisel Yıl yorumunu veya onun hobi, yazma, sohbet örneklerini tekrarlamasın. Kişisel yıl özeti yapma. Raporun yaşam yolu, ifade ve iletişim gibi ana temalarını tek yeni gündelik sahnede birleştir; olasılık dili kullan.'},
        {role:'system',content:'Yeniden istenen bölümde MODEL_NUMERIC_TEXT hatası varsa sayıyı Türkçe sözcükle yaz veya cümleyi yeniden kur. Yorum metninde rakam kullanma. Uzunluk hatalarını da aynı yanıtta düzelt. Kod tarafından sözcük dönüşümü yapılmayacak; yalnız senin yazdığın yeni bölüm kullanılacak.'},
        {role:'system',content:'section-26 için sadece gönderilen temalardan ikisini tek gündelik durumla bağla. Yaş, dönem, zirve veya meydan okuma sözcükleriyle tabloyu yeniden anlatma. Sayı adlarını veya sıralı eşleşmeleri yazma. section-35 için yalnız gönderilen evde alan düzenleme sahnesini kullan. Yıl, hobi, yazma, tanışma, davet veya sohbet bağlamına geçme. MODEL_SHARED_REPETITION ve MODEL_CLOSING_REPETITION hatalarında bu yasaklara göre yalnız ilgili bölümü yeniden kur. Dizgi hatalarında düşünceyi koruyarak kısalt.'},
        {role:'system',content:'Yeri olan normal sayfalarda ana yorumu yeni gözlem ve örneklerle genişlet: ilk paragraf verilen hesaplamadan türeyen somut bir gözlem sunsun, gösterge listesini tekrar etmesin. Sonraki paragraf bu gözlemin günlük bir durumda nasıl ortaya çıkabileceğini anlatsın; yalnız aynı düşünceyi başka sözcüklerle tekrarlama. Gerekirse farklı bir yönü ele alan kısa bir paragraf daha ekle. writingTarget ana yorum ile advice alanını ayrı belirtir; tavsiye ana yorumun yerine geçmesin. Karakter hedefi yazım rehberidir, kabulü gerçek dizgi ölçümü belirler. JSON bölüm nesnesine advice ekle: yorumdaki gözlemden çıkan, bir veya iki cümlelik uygulanabilir öneri. Önerilerde aynı kapanış, cümle kalıbı, tek cümle not alma veya küçük adım senaryosunu sürekli kullanma. Bölümler arasında gündelik durumları çeşitlendir. Kesin kişilik iddiaları yerine olabilir, bazen, eğer gibi doğal olasılık dili kullan; kişinin yaşamadığı bir olayı olmuş gibi anlatma. section-intro kısa ve doğal cümlelerle doğrudan sen diye seslensin, verilen temaları iki veya üç kısa paragrafta bağlasın; kişi adı ve adla hitap yerelde ekleneceği için ad uydurma. Gövde ve öneri tek sayfaya sığmalı.'},
        {role:'system',content:'section-30 yalnız results.themes içindeki iki motor temasının gündelik karşılığını anlatsın. Yaşları, sayı eşleşmelerini ve sıralamayı PDF tablosu gösterir. Yorumda ilk yıllar, sonra, ardından, son olarak gibi kronolojik sıralamalar veya dönemlere sayı/tema atamaları kurma. İki temayı aynı gündelik durum içinde bağla; advice bu durumdan türesin.'},
        {role:'system',content:'Her bölümün writingTarget ve layoutBudget alanları genel uzunluk hedeflerinden önceliklidir. Yalnız yeterli alanı olan sayfalarda yaklaşık yüzde elli artış hedefini koru. Yoğun hesaplama alanlarında ilk yanıttan itibaren daha kısa yaz. advice için ayrılan karakter bütçesini kullan; toplam hedef gövde ve advice birlikte içindir.'},
        {role:'user',content:JSON.stringify({sections:interpretationPages.filter(p=>!ids||ids.includes(interpretationId(p))).map(p=>{
          const budget=writingBudgets.get(interpretationId(p));
          const repair=repairIssues.find(i=>i.sectionId===interpretationId(p)&&i.limitHeight);
          const max=repair?.targetTotalCharacters?Math.min(budget.maxCharacters,repair.targetTotalCharacters):budget.maxCharacters;
          const bodyMax=Math.max(0,max-budget.adviceCharacters);
          const bodyMin=Math.min(budget.bodyMinCharacters,bodyMax);
          return {id:interpretationId(p),title:p.title,group:p.section,results:modelResults(p.page,snapshot.values),writingTarget:{body:`Ana yorum yaklaşık ${bodyMin}–${bodyMax} karakter; ${budget.bodyHeight} punto yükseklik ayrıldı.`,advice:`Yorumdan türeyen ayrı öneri yaklaşık ${budget.adviceCharacters} karakter; kutu için ${budget.adviceHeight} punto yükseklik ayrıldı.`,acceptance:'Karakter sayısı editoryal rehberdir; gerçek dizgi ölçümü belirleyicidir.'},layoutBudget:{...budget,...repair,bodyMinCharacters:bodyMin,bodyMaxCharacters:bodyMax},errors:repairIssues.filter(i=>i.sectionId===interpretationId(p)).map(i=>i.code)};
        })})}
      ]).map(message=>message.role==='system'?{...message,content:(message.content+(layoutContexts?' Dizgi taşması errors içinde bulunan her bölüm için aynı nesnede iki tamamlanmış ana yorum yaz: ayrıntılı paragraphs ve daha kısa compactParagraphs. compactParagraphs bir metin dizisidir; hesaplamaya bağlı bir gözlemi ve gündelik karşılığını korusun, yarım cümle veya kesilmiş metin olmasın. Her iki aday aynı advice kutusuyla ölçülecek. preserveAdvice true ise advice döndürme. compactParagraphs için bodyBudget.maxCharacters sınırının yaklaşık yarısını hedefle. Çıktı örneği: {"sections":[{"id":"section-30","paragraphs":["Ayrıntılı tamamlanmış yorum."],"compactParagraphs":["Kısa tamamlanmış yorum."]}]}':''))
        .concat(' section-intro için yalnız ana metni paragraphs alanında yaz; advice yazma. Girişin okuma notu sunucuda eklenir ve değiştirilmez. Bu kural genel advice isteminden önceliklidir.')
        .concat(layoutContexts?' preserveBody true ise önceki gövde doğrulanmış ve ayrılmış tavsiye bütçesiyle sayfaya sığmıştır; yalnız id ve bu yoruma bağlı kısa advice döndür. paragraphs veya compactParagraphs döndürme, gövde yerelde aynen korunacaktır. preserveBody true kuralı diğer çıktı örneklerinden önceliklidir. MODEL_EMPTY_ADVICE ile dizgi taşması birlikteyse advice ve iki tamamlanmış gövde adayını birlikte döndür.':'')
        .replace('Bölümleri ihtiyacına göre iki, üç veya dört paragraf yaz; tek bir ritmi hepsine uygulama. Toplam 65-85 kelime, yaklaşık 450-650 karakter hedefle. section-30 yalnız en anlamlı iki örüntüyü iki kısa paragrafta anlatsın, toplam 300-500 karakter; satırları veya yaşları tek tek tekrar etmesin.','')
        .replace('Uzunluk hatalarını da aynı yanıtta düzelt.','Dizgi taşması varsa aynı bölümün düşüncesini kısaltarak yeniden kur.')
        .replace(/Aşağıdaki üslup örnekleri[\s\S]*$/u,'')
        .replace('Yaşanmamış olayı olmuş gibi anlatma; olabilir, bazen, eğer dili kullan.','Yaşanmamış olayı olmuş gibi anlatma; varsayımsal durumu eğer ile kur.')
        .replace('Kesin kişilik iddiaları yerine olabilir, bazen, eğer gibi doğal olasılık dili kullan; kişinin yaşamadığı bir olayı olmuş gibi anlatma.','Kişinin yaşamadığı bir olayı olmuş gibi anlatma; sembolik temayı varsayımsal gündelik durumla anlat.')}:message).concat([{role:'system',content:editorialStyle}])})});
   telemetry.httpStatus=response.status;
   telemetry.stage='model_response_validation';
   if(!response.ok) throw Error(`DEEPSEEK_HTTP_${response.status}`);
   let result;
   try { result=await response.json(); }
   catch(e) {
     if(e instanceof SyntaxError) throw Error('MODEL_INVALID_JSON');
     // Network errors while consuming the response body remain request failures.
     telemetry.stage='model_request'; throw e;
   }
  if(result.choices?.[0]?.finish_reason!=='stop') throw Error('MODEL_INCOMPLETE');
   let content;try{content=JSON.parse(result.choices[0].message.content);}catch{throw Error('MODEL_INVALID_JSON');}
   // Only the intro reading note is server-owned, before any validation/measurement.
   if(Array.isArray(content?.sections))content.sections=content.sections.map(s=>s?.id==='section-intro'?{...s,advice:introAdvice}:s);
  return {content,usage:result.usage || null,model:result.model};
  };
  const first=await request();
  const layoutIssues=async content=>{
    telemetry.stage='typesetting';
    return measureReportLayout(input,snapshot,content).issues;
  };
   telemetry.stage='model_response_validation';
   const issues=[...diagnose(first.content)];
   const firstLayout=await layoutIssues(first.content);
   telemetry.initialOverflowSectionIds=[...new Set(firstLayout.map(i=>i.sectionId))];
   issues.push(...firstLayout);
  for(const issue of issues) console.warn('[PDF validation]',JSON.stringify(issue));
  let content=first.content;
  const calls=[{model:first.model,usage:first.usage}];
  if(issues.length){
    const ids=[...new Set(issues.map(i=>i.sectionId))];
    const preservedAdviceIds=new Set(ids.filter(id=>issues.filter(i=>i.sectionId===id).every(i=>/^MODEL_.*LAYOUT_OVERFLOW$/.test(i.code))));
    const preservedBodyIds=new Set(ids.filter(id=>issues.filter(i=>i.sectionId===id).every(i=>i.code==='MODEL_EMPTY_ADVICE')));
    telemetry.repairSectionIds=ids;
    let layoutContexts=null;
    {
      const measureDoc=registerFonts(new PDFDocument({size:[360,100000],margins:{top:78,bottom:56,left:28,right:28}}));
      layoutContexts=ids.map(id=>{
        const p=interpretationPages.find(p=>interpretationId(p)===id);
        const original=first.content.sections.find(s=>s.id===id);
        const measured=measureSectionLayout(measureDoc,p,input,snapshot,original);
        const adviceHeight=measured.adviceHeight;
        const availableHeight=measured.bodyAvailableHeight;
        const measuredBody=measured.bodyHeight;
        const maxCharacters=Math.max(0,Math.floor(original.paragraphs.join(' ').length*availableHeight/measuredBody*.85));
        return {id,title:p.title,results:modelResults(p.page,snapshot.values),paragraphs:original.paragraphs,existingAdvice:original.advice,
          preserveBody:preservedBodyIds.has(id),preserveAdvice:preservedAdviceIds.has(id),errors:issues.filter(i=>i.sectionId===id).map(i=>i.code),
          adviceBudget:{maxCharacters:typeof original.advice==='string'&&original.advice.trim()?original.advice.length:writingBudgets.get(id).adviceCharacters,availableHeight:Math.ceil(adviceHeight)},
          bodyBudget:{availableHeight:Math.floor(availableHeight),reservedAdviceHeight:Math.ceil(adviceHeight),maxCharacters,fontSize:BODY_FONT_SIZE}};
      });
      measureDoc.destroy();
    }
    const correction=await request(ids,issues,layoutContexts);
    const sections=correction.content?.sections;
    if(!Array.isArray(sections)||sections.length!==ids.length||new Set(sections.map(s=>s.id)).size!==ids.length||sections.some(s=>!ids.includes(s.id))) throw Error('MODEL_REPAIR_SECTION_IDS');
    const replacements=new Map();
    telemetry.compactSectionIds=[];
    for(const s of sections){
      const advice=preservedAdviceIds.has(s.id)?first.content.sections.find(original=>original.id===s.id).advice:s.advice;
      const detailed={id:s.id,paragraphs:preservedBodyIds.has(s.id)?first.content.sections.find(original=>original.id===s.id).paragraphs:s.paragraphs,advice};
      const compact={id:s.id,paragraphs:s.compactParagraphs,advice};
      const evaluate=candidate=>{
        const report={sections:first.content.sections.map(original=>original.id===s.id?candidate:original)};
        try{
          if(diagnose(report).some(issue=>issue.sectionId===s.id))return false;
          return !measureReportLayout(input,snapshot,report).issues.some(issue=>issue.sectionId===s.id);
        }catch(error){
          if(/^MODEL_/.test(error.message))return false;
          throw error;
        }
      };
      // Validate both complete candidates; never truncate model prose locally.
      const detailedFits=evaluate(detailed);
      const compactFits=!preservedBodyIds.has(s.id)&&s.compactParagraphs!==undefined&&evaluate(compact);
      if(!detailedFits&&compactFits){replacements.set(s.id,compact);telemetry.compactSectionIds.push(s.id);}
      else replacements.set(s.id,detailed);
    }
    content={sections:first.content.sections.map(s=>replacements.get(s.id)||s)};
    calls.push({model:correction.model,usage:correction.usage});
  }
   telemetry.stage='model_response_validation';
   validate(content);
  const remainingLayout=await layoutIssues(content);
  if(remainingLayout.length)throw Object.assign(new Error(remainingLayout[0].code),{diagnostics:remainingLayout});
  const usage=Object.fromEntries(['prompt_tokens','completion_tokens','total_tokens'].map(k=>[k,calls.reduce((sum,c)=>sum+(c.usage?.[k]||0),0)]));
  return {content,usage,model:first.model,durationMs:Date.now()-started,apiCalls:calls.length,repairSectionIds:[...new Set(issues.map(i=>i.sectionId))],calls};
}
function sectionValues(page,v) {
  const map={4:{İfade:v.expression},5:{'Kalp arzusu':v.soulUrge},6:{Kişilik:v.personality},7:{'Kalp arzusu':v.soulUrge,Kişilik:v.personality},
    8:{'Başlangıç harfi değeri':v.cornerstone},9:{'Bitiş harfi değeri':v.capstone},10:{'İlk sesli değeri':v.firstVowel},11:{Denge:v.balance},
    12:v.nameMatrix,13:{'Düz çizgili':v.letterGroups.duz,'Eğri çizgili':v.letterGroups.egri,'Kavisli ve düz':v.letterGroups.kavisli},14:v.planes,15:{'Yaşam yolu':v.lifePath},16:{'Doğum günü sayısı':v.birthday},17:{Tutum:v.attitude},18:{Olgunluk:v.maturity},
    19:v.dateMatrix,20:v.synthesisMatrix,21:{'İlk harfin değeri':v.spine.firstValue,'Son harfin değeri':v.spine.lastValue},22:{'Sentez tekrarları':v.synthesisMatrix},23:{'Karmik borç göstergeleri':v.karmicDebt.map(x=>`${x.code} · ${x.title} · ${x.source}`).join('\n')||'Belirli bir karmik borç göstergesi bulunmadı.'},
    24:{Zirveler:v.pinnacles},25:{'Meydan okumalar':v.challenges},26:{'Ortak dönemler':periodMatches(v)},
    27:{'Rapor yılı':v.reportYear,'Kişisel yıl':v.personalYear},28:{'Kişisel ay':v.personalMonth},29:{'Kişisel gün':v.personalDay},30:{'Geçişler (yaş)':v.transitions},
    31:{İfade:v.expression,'Yaşam yolu':v.lifePath},32:{'Kalp arzusu':v.soulUrge,Kişilik:v.personality},33:{Denge:v.balance,'Kişisel yıl':v.personalYear},
    34:{'Yaşam yolu':v.lifePath,İfade:v.expression,Olgunluk:v.maturity},35:{'Rapor yılı':v.reportYear}};
  return map[page] || {};
}
function render(input,snapshot,interpretation) {
  validate(interpretation);
  const layout=measureReportLayout(input,snapshot,interpretation);
  if(layout.issues.length)return Promise.reject(Object.assign(new Error(layout.issues[0].code),{diagnostics:layout.issues}));
  return new Promise((resolve,reject)=>{
    const doc=new PDFDocument({size:[360,640],margins:{top:78,bottom:56,left:28,right:28},bufferPages:true,autoFirstPage:false,
      info:{Title:'Astro Şuşu · Numerolojik Yorum Raporu',Author:'Gizem Şule Mert'}});
    const chunks=[];doc.on('data',c=>chunks.push(c));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);
    registerFonts(doc);
    let decorating=false;
    doc.on('pageAdded',()=>{if(decorating)return;decorating=true;doc.rect(0,0,360,640).fill('#fffcf7');
      if(doc.bufferedPageRange().count===1){doc.x=28;doc.y=78;decorating=false;return;}
      doc.fillColor('#52324f').font('title').fontSize(11).text('Astro Şuşu',28,24,{lineBreak:false});
      doc.font('bold').fontSize(8).text('Gizem Şule Mert',240,26,{lineBreak:false});doc.moveTo(28,52).lineTo(332,52).strokeColor('#e9e0e8').stroke();doc.x=28;doc.y=78;decorating=false;});
    const heading=(text,group)=>{doc.fillColor('#52324f').font('bold').fontSize(8).text(group.toLocaleUpperCase('tr-TR'));doc.moveDown();doc.font('title').fontSize(23).fillColor('#2f2530').text(text);doc.moveDown(.6);};
    const labels={no:'Dönem',deger:'Sayı',yas:'Yaş aralığı',value:'Sayı',startAge:'Başlangıç yaşı',endAge:'Bitiş yaşı'};
    const flatten=(o,prefix='')=>Object.entries(o).flatMap(([k,val])=>val&&typeof val==='object'&&!Array.isArray(val)?[[`${prefix}${labels[k]||k}`,Object.entries(val).map(([a,b])=>`${labels[a]||a}: ${b}`).join(' · ')]]:[[
      `${prefix}${labels[k]||k}`,Array.isArray(val)?val.map(t=>typeof t==='object'?Object.entries(t).map(([a,b])=>`${labels[a]||a}: ${b}`).join(' / '):t).join('; ')||'Yok':String(val)]]);
    const values=o=>{const entries=flatten(o);const compact=entries.every(([k])=>/^\d+$/.test(k));
      const rows=compact?[['Sayı / tekrar',entries.map(([k,v])=>`${k}: ${v}`).join(' · ')]]:entries;
      for(const [label,value] of rows){doc.font('bold').fontSize(10).fillColor('#52324f').text(`${label}: `,{continued:true});doc.font('body').fillColor('#302b35').text(value);doc.moveDown(.15);}doc.moveDown(.4);};
    doc.addPage();doc.addNamedDestination('section-01');
    doc.moveTo(28,30).lineTo(332,30).strokeColor('#bd987d').stroke();
    doc.font('title').fontSize(30).fillColor('#432c43').text('Astro Şuşu',28,40);
    doc.font('bold').fontSize(13).text('Gizem Şule Mert',28,79);
    doc.moveTo(28,110).lineTo(332,110).strokeColor('#e4d9d0').stroke();
    doc.font('bold').fontSize(9).text('KİŞİYE ÖZEL YORUM RAPORU',28,140);
    doc.font('title').fontSize(39).text('Numeroloji\nAnalizi',28,166,{lineGap:0});
    doc.font('body').fontSize(12).fillColor('#655363').text('İsim, doğum tarihi ve kişisel döngüler',28,268);
    doc.rect(28,309,304,149).fill('#432c43');
    doc.font('bold').fontSize(9).fillColor('#f4edf1').text('YAŞAM YOLU',43,325);
    doc.font('title').fontSize(76).text(String(snapshot.values.lifePath),43,365,{lineBreak:false});
    doc.moveTo(144,325).lineTo(144,442).strokeColor('#72566e').stroke();
    doc.font('bold').fontSize(10).text('İfade Sayısı',160,343,{lineBreak:false});doc.font('title').fontSize(29).text(String(snapshot.values.expression),290,337,{lineBreak:false});
    doc.moveTo(160,385).lineTo(316,385).stroke();
    doc.font('bold').fontSize(10).text(`Kişisel Yıl · ${snapshot.values.reportYear}`,160,412,{lineBreak:false});doc.font('title').fontSize(29).text(String(snapshot.values.personalYear),290,405,{lineBreak:false});
    doc.font('bold').fontSize(9).fillColor('#52324f').text('DANIŞAN',28,486);
    // Cover names must not push the birth date or create an implicit extra page.
    let coverNameSize=24;
    doc.font('title').fontSize(coverNameSize);
    while(doc.heightOfString(input.name,{width:304})>40&&coverNameSize>10){
      coverNameSize-=.5;doc.fontSize(coverNameSize);
    }
    doc.text(input.name,28,500,{width:304});
    const birth=new Date(Date.UTC(Number(input.y),Number(input.m)-1,Number(input.d)));
    doc.font('body').fontSize(12).fillColor('#655363').text(birth.toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}),28,548);
    doc.addPage();doc.addNamedDestination('section-02');heading('Okuma rehberi','İçindekiler');
    doc.font('body').fontSize(BODY_FONT_SIZE).text('Bu raporu baştan sona ya da ilgini çeken bölümden okuyabilirsin. Yorumlar sembolik bir bakış sunar; yaşantının yerine geçmez. Sana uymayan bir düşünceyi kendine zorla uyarlaman gerekmez.');doc.moveDown();
    const groups=[['Hesaplama özeti','section-03','Temel sayılar ve kişisel döngüler'],['Bu analiz sana ne anlatıyor?','section-intro','Temalarının gündelik hayatta buluşması'],['İsim','section-04','İfade, kalp arzusu, kişilik ve isim matrisi'],['Doğum tarihi','section-15','Yaşam yolu, matrisler ve karmik göstergeler'],['Döngüler','section-24','Zirveler, kişisel dönemler ve geçişler'],['Bütünsel yorum','section-31','Çalışma, iletişim ve karar anları']];
    for(const [label,id,desc] of groups){doc.font('bold').fontSize(13).fillColor('#52324f').text(label,{goTo:id});doc.font('body').fontSize(11).fillColor('#655363').text(desc,{goTo:id});doc.moveDown(.8);}
    doc.addPage();doc.addNamedDestination('section-03');heading('Hesaplama özeti','Temel göstergelerin');
    values({'Yaşam yolu':snapshot.values.lifePath,'İfade':snapshot.values.expression,'Kalp arzusu':snapshot.values.soulUrge,'Kişilik':snapshot.values.personality,'Denge':snapshot.values.balance,'Tutum':snapshot.values.attitude,'Olgunluk':snapshot.values.maturity,'Kişisel yıl':snapshot.values.personalYear,'Kişisel ay':snapshot.values.personalMonth,'Kişisel gün':snapshot.values.personalDay});
    doc.font('body').fontSize(BODY_FONT_SIZE).text('Bu sayfadaki göstergeler sonraki bölümlerde birlikte ele alınıyor. Numeroloji bilimsel bir değerlendirme, tanı veya geleceğe ilişkin garanti değildir.');
    for(const p of interpretationPages){
      const id=interpretationId(p);
      const section=interpretation.sections.find(s=>s.id===id);
      const paragraphs=p===intro?[`${input.name},`,...section.paragraphs]:section.paragraphs;
      const {fontSize,adviceHeight,introGapReduction}=layout.measurements.get(id);
      doc.addPage();doc.addNamedDestination(id);doc.outline.addItem(p.title);drawHeading(doc,p.title,p.section);
      drawCalculation(doc,p,snapshot);
      for(const text of paragraphs){
        doc.font('body').fontSize(fontSize).fillColor('#302b35').text(text,28,doc.y,{width:304,lineGap:BODY_LINE_GAP});doc.moveDown(.65);
      }
      // Use the exact local spacing adjustment chosen by preflight, never reflow text.
      doc.y-=introGapReduction;
      const adviceY=doc.y;
      doc.roundedRect(28,adviceY,304,adviceHeight,5).fill('#f7f0e4');
      doc.moveTo(28,adviceY+5).lineTo(28,adviceY+adviceHeight-5).lineWidth(1.5).strokeColor('#72516b').stroke();
      doc.font('bold').fontSize(11).fillColor('#52324f').text(ADVICE_TITLE,40,adviceY+10,{width:280});
      doc.font('body').fontSize(fontSize).fillColor('#302b35').text(section.advice,40,doc.y+5,{width:280,lineGap:BODY_LINE_GAP});
    }
    const range=doc.bufferedPageRange();for(let i=0;i<range.count;i++){doc.switchToPage(i);const bottom=doc.page.margins.bottom;doc.page.margins.bottom=0;
      doc.moveTo(28,594).lineTo(332,594).strokeColor('#e9e0e8').stroke();doc.font('body').fontSize(7).fillColor('#655363').text('Kişiye özel yorum raporu',28,608,{lineBreak:false,goTo:'section-02'});doc.text(`${i+1} / ${range.count}`,300,608,{lineBreak:false});doc.page.margins.bottom=bottom;}
    doc.end();
  });
}
module.exports={calculate,interpret,validate,diagnose,sectionRules,periodMatches,modelResults,render,safeFailure,measureReportLayout};
