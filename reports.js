const crypto = require('crypto');
const path = require('path');
const fs = require('fs/promises');
const { PDFDocument } = require('pdf-lib');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { waitUntil } = require('@vercel/functions');

function reportDownloadName(input) {
  const name = typeof input?.name === 'string' ? input.name.normalize('NFC')
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().replace(/[. ]+$/g, '').slice(0, 140) : '';
  return `${name ? name + ' - ' : ''}Numeroloji Yorum Raporu.pdf`;
}

function createReports(pool, options = {}) {
  const sample = process.env.NODE_ENV === 'development' && process.env.PDF_TEST_MODE === 'true';
  const source = process.env.PDF_TEST_SOURCE;
  const live = !sample && process.env.PDF_LIVE_MODE === 'true' && !!process.env.DEEPSEEK_API_KEY;
  const directory = path.resolve(process.env.PDF_ARCHIVE_DIR || path.join(__dirname, 'private-reports'));
  const archiveBackend=process.env.PDF_ARCHIVE_BACKEND || 'local';
  if(!['local','r2'].includes(archiveBackend))throw new Error('INVALID_PDF_ARCHIVE_BACKEND');
  const bucket=process.env.PDF_R2_BUCKET;
  let r2=options.r2Client;
  const r2Client=()=>{
    if(!bucket)throw new Error('PDF_R2_NOT_CONFIGURED');
    if(!r2){
      const endpoint=process.env.PDF_R2_ENDPOINT;
      if(!endpoint||!process.env.PDF_R2_ACCESS_KEY_ID||!process.env.PDF_R2_SECRET_ACCESS_KEY)throw new Error('PDF_R2_NOT_CONFIGURED');
      if(new URL(endpoint).protocol!=='https:')throw new Error('PDF_R2_INVALID_ENDPOINT');
      r2=new S3Client({region:'auto',endpoint,forcePathStyle:true,
        credentials:{accessKeyId:process.env.PDF_R2_ACCESS_KEY_ID,secretAccessKey:process.env.PDF_R2_SECRET_ACCESS_KEY}});
    }
    return r2;
  };
  async function removeArchive(key,backend){
    if(backend==='r2')await r2Client().send(new DeleteObjectCommand({Bucket:bucket,Key:key}));
    else await fs.unlink(path.join(directory,key));
  }
  const ttl = options.ttl || 5 * 60 * 1000;
  const onVercel=process.env.VERCEL==='1';
  // Leave time after the shared model budget for typesetting and archive writes.
  const configuredBudget=Number(process.env.PDF_MODEL_BUDGET_MS || 240000);
  const modelBudgetMs=Number.isFinite(configuredBudget)?Math.min(240000,Math.max(1000,configuredBudget)):240000;
  const error = (status, message) => Object.assign(new Error(message), { status });
  const publicReport = r => ({ id: r.id, analysisId: r.analysis_id, analysisName: r.analysis_name,
    status: r.status, isSample: r.is_sample, createdAt: r.created_at, completedAt: r.completed_at,
    downloadUrl: r.status === 'ready' ? `/api/reports/${r.id}/download` : null });

  async function expire(db = pool, subscriptionId = null) {
    await db.query(`UPDATE pdf_reports SET status='expired', error_code='TIMEOUT'
      WHERE status='pending' AND expires_at <= clock_timestamp()
      AND ($1::integer IS NULL OR subscription_id=$1)`, [subscriptionId]);
  }
  async function credits(userId) {
    await expire();
    const { rows } = await pool.query(`SELECT s.id, s.plan_id, s.pdf_credits,
      count(r.id) FILTER (WHERE r.status='ready')::int AS used,
      count(r.id) FILTER (WHERE r.status='pending' AND r.expires_at>clock_timestamp())::int AS reserved
      FROM subscriptions s LEFT JOIN pdf_reports r ON r.subscription_id=s.id
      WHERE s.user_id=$1 AND s.status='active' AND s.starts_at<=clock_timestamp()
        AND s.expires_at>clock_timestamp()
      GROUP BY s.id ORDER BY s.expires_at DESC LIMIT 1`, [userId]);
    const s = rows[0];
    return s ? { subscriptionId: s.id, total: s.pdf_credits, used: s.used, reserved: s.reserved,
      remaining: Math.max(0, s.pdf_credits-s.used-s.reserved),
      canGenerate: s.plan_id === 'full' && ((sample && !!source) || live) && s.pdf_credits > s.used+s.reserved,
      isSample: sample } : { total: 0, used: 0, reserved: 0, remaining: 0, canGenerate: false, isSample: sample };
  }
  async function reserve(userId, analysisId, activeUser = true) {
    const db = await pool.connect();
    try {
      await db.query('BEGIN');
      // Always lock period before ledger rows. This serializes the last credit.
      const subs = await db.query(`SELECT * FROM subscriptions WHERE user_id=$1 AND status='active'
        AND starts_at<=clock_timestamp() AND expires_at>clock_timestamp()
        ORDER BY expires_at DESC LIMIT 1 FOR UPDATE`, [userId]);
      const s = subs.rows[0];
      if (s) await expire(db, s.id);
      const analysis = (await db.query('SELECT * FROM analysis_history WHERE id=$1 AND user_id=$2 FOR SHARE', [analysisId, userId])).rows[0];
      if (!analysis) throw error(404, 'Kaydedilmiş analiz bulunamadı.');
      const existing = (await db.query(`SELECT * FROM pdf_reports WHERE user_id=$1 AND analysis_id=$2
        AND status IN ('pending','ready') ORDER BY created_at DESC LIMIT 1`, [userId, analysisId])).rows[0];
      if (existing) { await db.query('COMMIT'); return { report: publicReport(existing), started: false }; }
      if (!s || s.plan_id !== 'full' || !activeUser) throw error(403, 'Aktif Hesaplama + Yorum Raporu dönemi gereklidir.');
      if (!(sample && source) && !live) throw error(503, 'PDF üretimi kapalı.');
      if (live && analysis.module_id !== 'holistic') throw error(400, 'Gerçek yorum PDF’si için Bütünsel Numerolojik Analiz gereklidir.');
      const calculation = live ? require('./live-report').calculate(analysis.input_data) : null;
      const usage = (await db.query(`SELECT count(*)::int AS n FROM pdf_reports
        WHERE subscription_id=$1 AND status IN ('pending','ready')`, [s.id])).rows[0].n;
      if (usage >= s.pdf_credits) throw error(409, 'Bu dönemde kullanılabilir PDF krediniz kalmadı.');
      const id = crypto.randomUUID();
      const r = (await db.query(`INSERT INTO pdf_reports
        (id,user_id,subscription_id,analysis_id,analysis_name,input_snapshot,status,is_sample,expires_at,calculation_snapshot)
        VALUES ($1,$2,$3,$4,$5,$6,'pending',$8,clock_timestamp()+$7*interval '1 millisecond',$9) RETURNING *`,
      [id,userId,s.id,analysis.id,analysis.module_name,analysis.input_data,ttl,sample,calculation])).rows[0];
      await db.query('COMMIT');
      return { report: publicReport(r), started: true };
    } catch (e) { await db.query('ROLLBACK'); throw e; } finally { db.release(); }
  }
  async function produce(id) {
    const destination = path.join(directory, `${id}.pdf`);
    const temporary = path.join(directory, `${id}.tmp`);
    const started=Date.now();
    const telemetry={stage:'model_preparation',apiCallAttempts:0};
    const producer=require('./live-report');
    let archiveWritten=false;
    try {
      const row=(await pool.query("SELECT * FROM pdf_reports WHERE id=$1 AND status='pending' AND expires_at>clock_timestamp()",[id])).rows[0];
      if(!row) return;
      let bytes, interpretation=null, metrics=null;
      if(row.is_sample){bytes=options.readSource ? await options.readSource() : await fs.readFile(source);}
      else {
        const result=await producer.interpret(row.calculation_snapshot,telemetry,row.input_snapshot,
          onVercel?{deadlineMs:Date.now()+modelBudgetMs}:{});
        interpretation=result.content;
        telemetry.stage='typesetting';
        bytes=await producer.render(row.input_snapshot,row.calculation_snapshot,interpretation);
        metrics={model:result.model,usage:result.usage,apiCalls:result.apiCalls,repairSectionIds:result.repairSectionIds,modelDurationMs:result.durationMs,totalDurationMs:Date.now()-started};
      }
      telemetry.stage='pdf_validation';
      if (bytes.subarray(0,5).toString() !== '%PDF-') throw new Error('INVALID_PDF');
      const pdf = await PDFDocument.load(bytes);
      if (!pdf.getPageCount()) throw new Error('EMPTY_PDF');
      telemetry.stage='archive_write';
      if(archiveBackend==='r2'){
        await r2Client().send(new PutObjectCommand({Bucket:bucket,Key:`${id}.pdf`,Body:bytes,
          ContentType:'application/pdf',CacheControl:'private, no-store'}));
      }else{
        await fs.mkdir(directory, { recursive: true });
        await fs.writeFile(temporary, bytes, { flag: 'wx' });
        await fs.rename(temporary, destination);
      }
      archiveWritten=true;
      // Compare-and-set fences off timed-out workers, including after a retry.
      const result = await pool.query(`UPDATE pdf_reports SET status='ready', completed_at=clock_timestamp(),
        file_key=$2,file_sha256=$3,file_bytes=$4,interpretation_snapshot=$5,generation_metrics=$6 WHERE id=$1 AND status='pending'
        AND expires_at>clock_timestamp() RETURNING id`,
      [id, `${id}.pdf`, crypto.createHash('sha256').update(bytes).digest('hex'), bytes.length,interpretation,{...metrics,...telemetry,archiveBackend,totalDurationMs:Date.now()-started,pageCount:pdf.getPageCount()}]);
      if (!result.rowCount) await removeArchive(`${id}.pdf`,archiveBackend).catch(() => {});
    } catch (e) {
      await fs.unlink(temporary).catch(() => {});
      if(archiveWritten)await removeArchive(`${id}.pdf`,archiveBackend).catch(() => {});
      const code=producer.safeFailure(e,telemetry.stage);
      // Persist only bounded, structural diagnostics; never exception messages or prose.
      const diagnostics=(Array.isArray(e.diagnostics)?e.diagnostics:[]).slice(0,33).map(d=>({
        ...(/^section-(?:intro|\d{2})$/.test(d.sectionId)?{sectionId:d.sectionId}:{}),
        code:producer.safeFailure({message:d.code},telemetry.stage),
        ...Object.fromEntries(['requiredHeight','availableHeight'].filter(key=>Number.isFinite(d[key])&&d[key]>=0&&d[key]<=1000000).map(key=>[key,d[key]]))
      }));
      const failureMetrics={stage:telemetry.stage,apiCallAttempts:telemetry.apiCallAttempts,
        totalDurationMs:Date.now()-started,errorCode:code,diagnostics,
        ...Object.fromEntries(['initialOverflowSectionIds','repairSectionIds'].map(key=>[key,
          [...new Set((Array.isArray(telemetry[key])?telemetry[key]:[]).filter(id=>/^section-(?:intro|\d{2})$/.test(id)))].slice(0,33)])),
        ...(Number.isInteger(telemetry.httpStatus)&&telemetry.httpStatus>=100&&telemetry.httpStatus<=599?{httpStatus:telemetry.httpStatus}:{})};
      await pool.query(`UPDATE pdf_reports SET status='failed',error_code=$2,generation_metrics=$3
        WHERE id=$1 AND status='pending'`, [id,code,failureMetrics]);
      console.warn('[PDF] Yerel dosya arşivlenemedi:', code);
    }
  }
  function mount(app, auth) {
    const wrap = fn => async (req,res) => { try { await fn(req,res); } catch(e) {
       console.error('[PDF API]', e.status ? e.message : 'REPORT_OPERATION_FAILED');
      res.status(e.status || 500).json({ error: e.status ? e.message : 'Rapor işlemi tamamlanamadı.' });
    }};
    app.get('/api/reports/credits', auth, wrap(async(req,res) => res.json(await credits(req.user.id))));
    app.get('/api/reports', auth, wrap(async(req,res) => {
      await expire();
      res.json((await pool.query('SELECT * FROM pdf_reports WHERE user_id=$1 ORDER BY created_at DESC', [req.user.id])).rows.map(publicReport));
    }));
    app.post('/api/history/:id/report', auth, wrap(async(req,res) => {
      if (!/^[1-9]\d*$/.test(req.params.id)) throw error(400,'Geçersiz analiz kimliği.');
      const result = await reserve(req.user.id, req.params.id, req.user.status === 'active');
      if (result.started) {
        const production=produce(result.report.id).catch(() => console.error('[PDF worker]','REPORT_PRODUCTION_FAILED'));
        // Register synchronously, before sending 202; do not await production.
        if(onVercel)(options.waitUntil || waitUntil)(production);
      }
      res.status(result.started ? 202 : 200).json(result.report);
    }));
    app.get('/api/reports/:id/download', auth, wrap(async(req,res) => {
      if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) throw error(404,'Rapor bulunamadı.');
      const r = (await pool.query(`SELECT * FROM pdf_reports WHERE id=$1 AND user_id=$2 AND status='ready'`, [req.params.id,req.user.id])).rows[0];
      if (!r) throw error(404,'Rapor bulunamadı.');
      if (r.file_key !== `${r.id}.pdf`) throw error(404,'Dosya bulunamadı.');
      // Records predating backend selection always belong to the local archive.
      const backend=r.generation_metrics?.archiveBackend || 'local';
      let bytes;
      if(backend==='r2'){
        const object=await r2Client().send(new GetObjectCommand({Bucket:bucket,Key:r.file_key}));
        if(!object.Body)throw error(404,'Dosya bulunamadı.');
        bytes=Buffer.from(await object.Body.transformToByteArray());
      }else if(backend==='local')bytes=await fs.readFile(path.join(directory,r.file_key));
      else throw error(404,'Dosya bulunamadı.');
      if (crypto.createHash('sha256').update(bytes).digest('hex') !== r.file_sha256) throw error(409,'Arşiv dosyası doğrulanamadı.');
      res.set('Cache-Control','private, no-store');
      res.set('X-Content-Type-Options','nosniff');
      res.attachment(reportDownloadName(r.input_snapshot)).type('pdf').send(bytes);
    }));
  }
  return { mount, reserve, produce, expire, credits };
}
module.exports = { createReports, reportDownloadName };
