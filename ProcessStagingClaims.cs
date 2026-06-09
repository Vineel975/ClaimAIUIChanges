// STAGING — STEP 4: the batch worker.
        //
        // GET /MedicalScrutiny/ProcessStagingClaims
        //
        // Triggered every 5 min by Windows Task Scheduler (Modified Option A).
        // For each claim held at StageID 52 that has not yet been processed
        // (the ONLY selection condition is StageID = 52 — upstream pushes only
        //  cataract/maternity claims here, so there is no disease gate):
        //   1. classify disease (GetStagingClaimType — from Claimsdetails.Diagnosis via
        //      ClaimAI's keyword classifier, same as on-demand; works before coding) —
        //      used only to set the claimType sent to ClaimAI and stored with the result, NOT to skip.
        //   2. fetch docs (env-based, reuses GetMedicalBillDocument /
        //      GetTariffDocument internally), submit to ClaimAI /api/audit/start
        //      (which processes synchronously and returns a jobId), then pull the
        //      result from /api/staging/result, store it in ClaimAI_Results, and
        //      flip the claim to stage 5.
        //   3. on ANY failure -> mark 'failed', flip to stage 5 (fail-open: the
        //      doctor processes on-demand when they open the claim, as today).
        //
        // AllowAnonymous/OverrideAuthorization: the scheduler calls this with no
        // user session. Optional shared-secret check via StagingApiKey header.
        // ════════════════════════════════════════════════════════════════════
        [HttpGet]
        [AllowAnonymous]
        [OverrideAuthorization]
        public ActionResult ProcessStagingClaims(int batchSize = 10)
        {
            int processed = 0, skipped = 0, failed = 0;
            var details = new System.Collections.Generic.List<object>();

            try
            {
                // Optional auth: if StagingApiKey is configured, require the header.
                string stagingKey = System.Configuration.ConfigurationManager.AppSettings["StagingApiKey"] ?? "";
                if (!string.IsNullOrEmpty(stagingKey))
                {
                    string reqKey = Request.Headers["x-staging-key"] ?? Request.QueryString["key"] ?? "";
                    if (reqKey != stagingKey)
                        return Json(new { Success = false, Message = "Unauthorized" }, JsonRequestBehavior.AllowGet);
                }

                string connStr = GetStagingConnString();
                if (string.IsNullOrWhiteSpace(connStr))
                    return Json(new { Success = false, Message = "No connection string." }, JsonRequestBehavior.AllowGet);

                if (batchSize <= 0 || batchSize > 50) batchSize = 10;

                // ── Find claims to process: StageID 52, no ClaimAI_Results row yet
                //    (or status NULL). 'processing'/'done'/'failed'/'skipped' are
                //    excluded so we never double-pick. ───────────────────────────
                var claimIds = new System.Collections.Generic.List<long>();
                using (var conn = new System.Data.SqlClient.SqlConnection(connStr))
                {
                    conn.Open();
                    var cmd = conn.CreateCommand();
                    cmd.CommandText = @"
                        SELECT TOP (@bs) c.ID
                        FROM Claims c WITH (NOLOCK)
                        LEFT JOIN dbo.ClaimAI_Results r WITH (NOLOCK) ON r.ClaimID = c.ID
                        WHERE c.StageID = 52
                          AND ISNULL(c.Deleted, 0) = 0
                          AND (r.ID IS NULL OR r.ProcessingStatus IS NULL)
                        ORDER BY c.ID DESC";
                    cmd.Parameters.AddWithValue("@bs", batchSize);
                    using (var rdr = cmd.ExecuteReader())
                        while (rdr.Read()) claimIds.Add(Convert.ToInt64(rdr["ID"]));
                }

                foreach (long claimId in claimIds)
                {
                    try
                    {
                        // Latest Slno for this claim.
                        int slNo = 1;
                        using (var conn = new System.Data.SqlClient.SqlConnection(connStr))
                        {
                            conn.Open();
                            var cmd = conn.CreateCommand();
                            cmd.CommandText = "SELECT TOP 1 Slno FROM Claimsdetails WHERE ClaimID=@cid AND ISNULL(Deleted,0)=0 ORDER BY Slno";
                            cmd.Parameters.AddWithValue("@cid", claimId);
                            var v = cmd.ExecuteScalar();
                            if (v != null && v != DBNull.Value) slNo = Convert.ToInt32(v);
                        }

                        // 1. Resolve disease/claimType from the claim's Diagnosis text via ClaimAI's
                        //    keyword classifier (/api/classify-claim-type) — the SAME path the
                        //    on-demand browser flow (GetClaimType) uses. Works BEFORE coding is done
                        //    (the diagnosis text is present at claim entry). Passed to ClaimAI as the
                        //    claimType and stored with the result. Falls back to "other" (generic
                        //    prompts) only when there is no usable diagnosis text — same as on-demand.
                        string disease = GetStagingClaimType(claimId, connStr);

                        // 2. Disease gate removed. Upstream pushes only cataract/maternity to
                        //    StageID=52, so the single selection condition is stage=52 (see the query
                        //    above) and we no longer skip by disease. The claimType above is now
                        //    diagnosis-based (GetStagingClaimType), so it is reliable before coding;
                        //    an "other" result is processed via ClaimAI's generic prompts, not skipped.

                        // 3. Lock: mark 'processing' so a concurrent run won't re-pick.
                        UpsertStagingResult(connStr, claimId, slNo, disease, "processing",
                            null, null, null, null, null);

                        // 4. Fetch docs internally (no session) — reuse existing
                        //    env-based GetMedicalBillDocument / GetTariffDocument.
                        string billB64 = null, billName = null, tarB64 = null, tarName = null;
                        _stagingInternalCall = true;
                        try
                        {
                            ExtractDocBase64(GetMedicalBillDocument(claimId.ToString(), slNo.ToString()),
                                out billB64, out billName);
                            try
                            {
                                ExtractDocBase64(GetTariffDocument(claimId.ToString(), slNo.ToString()),
                                    out tarB64, out tarName);
                            }
                            catch { /* tariff optional */ }
                        }
                        finally
                        {
                            _stagingInternalCall = false;
                        }

                        if (string.IsNullOrEmpty(billB64))
                            throw new Exception("Medical bill not found for claimId=" + claimId);

                        // 5. Submit to ClaimAI (synchronous: returns jobId once done).
                        string jobId = SubmitClaimToClaimAI(claimId.ToString(), billName, billB64,
                            tarName, tarB64, disease);
                        if (string.IsNullOrWhiteSpace(jobId))
                            throw new Exception("ClaimAI did not return a jobId.");

                        // 6. Pull the stored result.
                        string analysisJson, benefitPlan, pdfUrl, aiStatus;
                        GetStagingResultFromClaimAI(jobId, out aiStatus, out analysisJson,
                            out benefitPlan, out pdfUrl);

                        if (aiStatus == "error")
                            throw new Exception("ClaimAI reported processing error for jobId=" + jobId);

                        // 7. Fetch processed PDF bytes from the URL (best-effort).
                        byte[] pdfBytes = null;
                        if (!string.IsNullOrWhiteSpace(pdfUrl))
                        {
                            try { pdfBytes = DownloadBytes(pdfUrl); }
                            catch (Exception pdfEx)
                            { System.Diagnostics.Debug.WriteLine("[Staging] PDF download failed: " + pdfEx.Message); }
                        }

                        // 8. Store results + flip to stage 5.
                        UpsertStagingResult(connStr, claimId, slNo, disease, "done",
                            jobId, analysisJson, benefitPlan, pdfBytes, null);
                        SetClaimStage(connStr, claimId, 5);
                        processed++;
                        details.Add(new { claimId, disease, status = "done", jobId });
                    }
                    catch (Exception claimEx)
                    {
                        // Fail-open: mark failed, send to stage 5 for on-demand processing.
                        try
                        {
                            UpsertStagingResult(connStr, claimId, slNo: 1, diseaseType: null,
                                status: "failed", jobId: null, analysisJson: null,
                                benefitPlan: null, pdfBytes: null, lastError: claimEx.Message);
                            SetClaimStage(connStr, claimId, 5);
                        }
                        catch { /* swallow — never let one claim break the batch */ }
                        failed++;
                        details.Add(new { claimId, status = "failed", error = claimEx.Message });
                        TariffLog("[Staging] Claim " + claimId + " failed: " + claimEx.Message);
                    }
                }

                return Json(new
                {
                    Success = true,
                    Processed = processed,
                    Skipped = skipped,
                    Failed = failed,
                    Total = claimIds.Count,
                    Details = details
                }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(new { Success = false, Message = ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }
