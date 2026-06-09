        /// <summary>
        /// GET /MedicalScrutiny/GetCodingProcedureEligibleLimit
        /// Called by ClaimAI to get the exact DB-calculated benefit plan limit
        /// using USP_Codingprocedurelimits with the claim's current coding data.
        /// </summary>
        [HttpGet]
        [AllowAnonymous]
        [OverrideAuthorization]
        public ActionResult GetCodingProcedureEligibleLimit(
            string claimId, string slNo = "1",
            string providerID = "0", string policyID = "0", string memberPolicyID = "0",
            string issueID = "0", string corpID = "0", string payerID = "0",
            string brokerID = "0", string siTypeID = "0", string claimType = "cataract")
        {
            try
            {
                long claimIdLong;
                if (!long.TryParse((claimId ?? "").Trim(), out claimIdLong) || claimIdLong <= 0)
                    return Json(new { success = false, error = "Invalid claimId" }, JsonRequestBehavior.AllowGet);

                string connStr = System.Configuration.ConfigurationManager
                                       .ConnectionStrings["McarePlusEntities"]?.ConnectionString ?? "";
                if (connStr.StartsWith("metadata=", StringComparison.OrdinalIgnoreCase))
                {
                    var m = System.Text.RegularExpressions.Regex.Match(
                        connStr, @"provider connection string=""([^""]+)""",
                        System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                    if (m.Success) connStr = m.Groups[1].Value.Replace("&quot;", "\"");
                }

                using (var conn = new System.Data.SqlClient.SqlConnection(connStr))
                {
                    conn.Open();

                    // Parse parameters passed from Spectra hidden fields
                    long provId = long.TryParse(providerID, out long _p) ? _p : 0;
                    long polId = long.TryParse(policyID, out long _po) ? _po : 0;
                    long memPolId = long.TryParse(memberPolicyID, out long _mp) ? _mp : 0;
                    int issId = int.TryParse(issueID, out int _i) ? _i : 0;
                    long corpId = long.TryParse(corpID, out long _c) ? _c : 0;
                    long payId = long.TryParse(payerID, out long _pa) ? _pa : 0;
                    int brokId = int.TryParse(brokerID, out int _b) ? _b : 0;
                    int siTypId = int.TryParse(siTypeID, out int _s) ? _s : 0;
                    int slNoInt = int.TryParse(slNo, out int _sl) ? _sl : 1;
                    byte isPED = 0, isGIPSA = 0, isCI = 0;
                    // Maternity = inpatient (isDayCare=0). Cataract = daycare (isDayCare=1)
                    byte isDayCare = (claimType == "maternity") ? (byte)0 : (byte)1;
                    int procedureID = 0, level1 = 0;

                    // Get procedure ID from ClaimsCoding (most recent entry)
                    using (var cmd = new System.Data.SqlClient.SqlCommand(
                        @"SELECT TOP 1 TPAProcedureID, TPALevel1
                          FROM ClaimsCoding WITH(NOLOCK)
                          WHERE ClaimID = @ClaimID AND ISNULL(Deleted,0)=0
                          ORDER BY ID DESC", conn))
                    {
                        cmd.Parameters.AddWithValue("@ClaimID", claimIdLong);
                        using (var rdr = cmd.ExecuteReader())
                        {
                            if (rdr.Read())
                            {
                                procedureID = rdr["TPAProcedureID"] != DBNull.Value ? Convert.ToInt32(rdr["TPAProcedureID"]) : 0;
                                level1 = rdr["TPALevel1"] != DBNull.Value ? Convert.ToInt32(rdr["TPALevel1"]) : 0;
                            }
                        }
                    }

                    if (memPolId == 0)
                        return Json(new { success = false, error = "Member policy not found." }, JsonRequestBehavior.AllowGet);

                    // If coding not done yet — skip SP, go directly to BPSIConditions fallback
                    if (procedureID == 0)
                    {
                        long bpsiIdFallback = 0;
                        using (var bpCmd = new System.Data.SqlClient.SqlCommand(
                            @"SELECT TOP 1 BPSIID FROM MemberSI WITH(NOLOCK)
                              WHERE MemberPolicyID = @MemberPolicyID
                              AND ISNULL(Deleted,0)=0
                              ORDER BY ID DESC", conn))
                        {
                            bpCmd.Parameters.AddWithValue("@MemberPolicyID", memPolId);
                            var val = bpCmd.ExecuteScalar();
                            if (val != null && val != DBNull.Value)
                                bpsiIdFallback = Convert.ToInt64(val);
                        }

                        if (bpsiIdFallback > 0)
                        {
                            double? ailmentLimitFb = null;
                            string ailmentRuleFb = "", ailmentRemarkFb = "";
                            // Coding not done yet, so we cannot scope to a specific procedure.
                            // Read the limit from whichever column actually holds it — ailment
                            // caps store the amount in IndividualLimit (not ClaimLimit) — and
                            // return the smallest configured ailment cap as a pre-coding hint.
                            using (var bpCmd = new System.Data.SqlClient.SqlCommand(
                                @"SELECT TOP 1
                                      COALESCE(bsc.ClaimLimit, bsc.IndividualLimit, bsc.FamilyLimit, bsc.PolicyLimit) AS LimitAmt,
                                      c.Name AS ConditionName, bsc.Remarks
                                  FROM BPSIConditions bsc WITH(NOLOCK)
                                  LEFT JOIN Mst_BPConditions c   WITH(NOLOCK) ON c.ID   = bsc.BPConditionID
                                  LEFT JOIN Mst_BPConditions par WITH(NOLOCK) ON par.ID = c.ParentID
                                  WHERE bsc.BPSIID = @BPSIID
                                  AND ISNULL(bsc.Deleted,0) = 0
                                  AND par.Name = 'Ailment Conditions'
                                  AND ISNULL(bsc.isCovered,0) = 1
                                  AND COALESCE(bsc.ClaimLimit, bsc.IndividualLimit, bsc.FamilyLimit, bsc.PolicyLimit) IS NOT NULL
                                  ORDER BY COALESCE(bsc.ClaimLimit, bsc.IndividualLimit, bsc.FamilyLimit, bsc.PolicyLimit) ASC", conn))
                            {
                                bpCmd.Parameters.AddWithValue("@BPSIID", bpsiIdFallback);
                                using (var rdr = bpCmd.ExecuteReader())
                                {
                                    if (rdr.Read())
                                    {
                                        ailmentLimitFb = rdr["LimitAmt"] != DBNull.Value ? Convert.ToDouble(rdr["LimitAmt"]) : (double?)null;
                                        ailmentRuleFb = rdr["ConditionName"] != DBNull.Value ? rdr["ConditionName"].ToString() : "";
                                        ailmentRemarkFb = rdr["Remarks"] != DBNull.Value ? rdr["Remarks"].ToString() : "";
                                    }
                                }
                            }

                            if (ailmentLimitFb.HasValue)
                                return Json(new
                                {
                                    success = true,
                                    noLimit = false,
                                    eligibleAmount = ailmentLimitFb.Value,
                                    ruleName = ailmentRuleFb,
                                    remarks = ailmentRemarkFb,
                                    source = "BPSIConditions (Ailment Cappings)",
                                    warning = "Coding not completed. Showing Ailment Cappings limit — code the procedure for a more specific limit."
                                }, JsonRequestBehavior.AllowGet);
                        }

                        return Json(new
                        {
                            success = true,
                            noLimit = true,
                            ruleName = "Coding not completed. No benefit plan limit available.",
                            eligibleAmount = (double?)null
                        }, JsonRequestBehavior.AllowGet);
                    }

                    // Call USP_Codingprocedurelimits
                    var ds = new System.Data.DataSet();
                    using (var cmd = new System.Data.SqlClient.SqlCommand("USP_Codingprocedurelimits", conn))
                    {
                        cmd.CommandType = System.Data.CommandType.StoredProcedure;
                        cmd.CommandTimeout = 120;
                        cmd.Parameters.AddWithValue("@ProviderID", provId);
                        cmd.Parameters.AddWithValue("@ProcedureID", procedureID);
                        cmd.Parameters.AddWithValue("@TPAProcID", procedureID.ToString());
                        cmd.Parameters.AddWithValue("@TPAProcedureID", level1.ToString());
                        cmd.Parameters.AddWithValue("@IssueID", issId);
                        cmd.Parameters.AddWithValue("@CorpID", corpId);
                        cmd.Parameters.AddWithValue("@PayerID", payId);
                        cmd.Parameters.AddWithValue("@PolicyID", polId);
                        cmd.Parameters.AddWithValue("@ClaimID", claimIdLong);
                        cmd.Parameters.AddWithValue("@MemberPolicyID", memPolId);
                        cmd.Parameters.AddWithValue("@SITypeID", siTypId);
                        cmd.Parameters.AddWithValue("@isPED", isPED);
                        cmd.Parameters.AddWithValue("@isGIPSA", isGIPSA);
                        cmd.Parameters.AddWithValue("@isDaycare", isDayCare);
                        cmd.Parameters.AddWithValue("@isCI", isCI);
                        if (brokId != 0)
                            cmd.Parameters.AddWithValue("@BrokerID", brokId);
                        cmd.Parameters.AddWithValue("@Slno", slNoInt);

                        using (var adapter = new System.Data.SqlClient.SqlDataAdapter(cmd))
                            adapter.Fill(ds);
                    }

                    // Log to file
                    try
                    {
                        string logDir = System.Web.Hosting.HostingEnvironment.MapPath("~/App_Data/Logs");
                        if (!System.IO.Directory.Exists(logDir)) System.IO.Directory.CreateDirectory(logDir);
                        string logFile = System.IO.Path.Combine(logDir, "CodingLimit_" + DateTime.Now.ToString("yyyyMMdd") + ".log");
                        var sb = new System.Text.StringBuilder();
                        sb.AppendLine($"=== USP_Codingprocedurelimits ===");
                        sb.AppendLine($"  ClaimID={claimIdLong} ProcID={procedureID} Level1={level1} MemPolID={memPolId} IssID={issId}");
                        sb.AppendLine($"  Tables={ds.Tables.Count}");
                        for (int t = 0; t < ds.Tables.Count; t++)
                            sb.AppendLine($"  Table[{t}] rows={ds.Tables[t].Rows.Count}");
                        System.IO.File.AppendAllText(logFile, DateTime.Now.ToString("HH:mm:ss") + " " + sb.ToString());
                    }
                    catch { }

                    // Table2 = configured limits, Table3 = utilized amounts
                    System.Data.DataRow limitsRow = null;
                    bool spNoLimit = ds.Tables.Count < 2 || ds.Tables[1].Rows.Count == 0;
                    if (!spNoLimit)
                    {
                        limitsRow = ds.Tables[1].Rows[0];
                        spNoLimit = limitsRow["ClaimLimit"] == DBNull.Value
                                 && limitsRow["IndividualLimit"] == DBNull.Value
                                 && limitsRow["FamilyLimit"] == DBNull.Value
                                 && limitsRow["PolicyLimit"] == DBNull.Value
                                 && limitsRow["CorporateLimit"] == DBNull.Value;
                    }

                    if (spNoLimit)
                    {
                        // SP returned no limits — fall back to BPSIConditions Ailment Cappings
                        double? ailmentLimit = null;
                        string ailmentRule = "";
                        string ailmentRemark = "";

                        // Get BPSIID from MemberSI
                        long bpsiId = 0;
                        using (var bpCmd = new System.Data.SqlClient.SqlCommand(
                            @"SELECT TOP 1 BPSIID FROM MemberSI WITH(NOLOCK)
                              WHERE MemberPolicyID = @MemberPolicyID
                              AND ISNULL(Deleted,0)=0
                              ORDER BY ID DESC", conn))
                        {
                            bpCmd.Parameters.AddWithValue("@MemberPolicyID", memPolId);
                            var val = bpCmd.ExecuteScalar();
                            if (val != null && val != DBNull.Value)
                                bpsiId = Convert.ToInt64(val);
                        }

                        if (bpsiId > 0)
                        {
                            // Scope the ailment cap to THIS claim's coded procedure so we return the
                            // disease-specific cap (e.g. Cataract Rs.35,000) instead of the smallest
                            // ailment cap on the plan. Amount is read from whichever column holds it
                            // (ailment caps store it in IndividualLimit, not ClaimLimit). The procedure
                            // match is against the ailment row's TPAProcedureID CSV list.
                            using (var bpCmd = new System.Data.SqlClient.SqlCommand(
                                @"SELECT TOP 1
                                      COALESCE(bsc.ClaimLimit, bsc.IndividualLimit, bsc.FamilyLimit, bsc.PolicyLimit) AS LimitAmt,
                                      c.Name AS ConditionName, bsc.Remarks
                                  FROM BPSIConditions bsc WITH(NOLOCK)
                                  LEFT JOIN Mst_BPConditions c   WITH(NOLOCK) ON c.ID   = bsc.BPConditionID
                                  LEFT JOIN Mst_BPConditions par WITH(NOLOCK) ON par.ID = c.ParentID
                                  WHERE bsc.BPSIID = @BPSIID
                                  AND ISNULL(bsc.Deleted,0) = 0
                                  AND par.Name = 'Ailment Conditions'
                                  AND ISNULL(bsc.isCovered,0) = 1
                                  AND COALESCE(bsc.ClaimLimit, bsc.IndividualLimit, bsc.FamilyLimit, bsc.PolicyLimit) IS NOT NULL
                                  AND EXISTS (SELECT 1 FROM fn_Split(bsc.TPAProcedureID, ',')
                                              WHERE LTRIM(RTRIM(Stringvalue)) = @ProcedureID)
                                  ORDER BY COALESCE(bsc.ClaimLimit, bsc.IndividualLimit, bsc.FamilyLimit, bsc.PolicyLimit) ASC", conn))
                            {
                                bpCmd.Parameters.AddWithValue("@BPSIID", bpsiId);
                                bpCmd.Parameters.AddWithValue("@ProcedureID", procedureID.ToString());
                                using (var rdr = bpCmd.ExecuteReader())
                                {
                                    if (rdr.Read())
                                    {
                                        ailmentLimit = rdr["LimitAmt"] != DBNull.Value ? Convert.ToDouble(rdr["LimitAmt"]) : (double?)null;
                                        ailmentRule = rdr["ConditionName"] != DBNull.Value ? rdr["ConditionName"].ToString() : "";
                                        ailmentRemark = rdr["Remarks"] != DBNull.Value ? rdr["Remarks"].ToString() : "";
                                    }
                                }
                            }
                        }

                        if (ailmentLimit.HasValue)
                            return Json(new
                            {
                                success = true,
                                noLimit = false,
                                eligibleAmount = ailmentLimit.Value,
                                ruleName = ailmentRule,
                                remarks = ailmentRemark,
                                source = "BPSIConditions (Ailment Cappings)",
                                warning = "Procedure not linked in benefit plan. Amount shown is from Ailment Cappings — verify before approving."
                            }, JsonRequestBehavior.AllowGet);

                        return Json(new
                        {
                            success = true,
                            noLimit = true,
                            ruleName = "No ailment sub-limit configured — full sum insured applies",
                            eligibleAmount = (double?)null
                        }, JsonRequestBehavior.AllowGet);
                    }

                    string ruleName = limitsRow["RuleName"] != DBNull.Value ? limitsRow["RuleName"].ToString() : "";
                    double claimLim = limitsRow["ClaimLimit"] != DBNull.Value ? Convert.ToDouble(limitsRow["ClaimLimit"]) : double.MaxValue;
                    double indLim = limitsRow["IndividualLimit"] != DBNull.Value ? Convert.ToDouble(limitsRow["IndividualLimit"]) : double.MaxValue;
                    double famLim = limitsRow["FamilyLimit"] != DBNull.Value ? Convert.ToDouble(limitsRow["FamilyLimit"]) : double.MaxValue;
                    double polLim = limitsRow["PolicyLimit"] != DBNull.Value ? Convert.ToDouble(limitsRow["PolicyLimit"]) : double.MaxValue;
                    double corpLim = limitsRow["CorporateLimit"] != DBNull.Value ? Convert.ToDouble(limitsRow["CorporateLimit"]) : double.MaxValue;

                    double utilClaim = 0, utilInd = 0, utilFam = 0, utilPol = 0, utilCorp = 0;
                    if (ds.Tables.Count >= 3 && ds.Tables[2].Rows.Count > 0)
                    {
                        var u = ds.Tables[2].Rows[0];
                        utilClaim = u["ClaimLimit"] != DBNull.Value ? Convert.ToDouble(u["ClaimLimit"]) : 0;
                        utilInd = u["IndividualLimit"] != DBNull.Value ? Convert.ToDouble(u["IndividualLimit"]) : 0;
                        utilFam = u["FamilyLimit"] != DBNull.Value ? Convert.ToDouble(u["FamilyLimit"]) : 0;
                        utilPol = u["PolicyLimit"] != DBNull.Value ? Convert.ToDouble(u["PolicyLimit"]) : 0;
                        utilCorp = u["CorporateLimit"] != DBNull.Value ? Convert.ToDouble(u["CorporateLimit"]) : 0;
                    }

                    var candidates = new System.Collections.Generic.List<double>();
                    if (claimLim < double.MaxValue) candidates.Add(Math.Max(0, claimLim - utilClaim));
                    if (indLim < double.MaxValue) candidates.Add(Math.Max(0, indLim - utilInd));
                    if (famLim < double.MaxValue) candidates.Add(Math.Max(0, famLim - utilFam));
                    if (polLim < double.MaxValue) candidates.Add(Math.Max(0, polLim - utilPol));
                    if (corpLim < double.MaxValue) candidates.Add(Math.Max(0, corpLim - utilCorp));

                    double eligibleAmount = candidates.Count > 0 ? candidates.Min() : 0;

                    return Json(new
                    {
                        success = true,
                        noLimit = false,
                        eligibleAmount = eligibleAmount,
                        ruleName = ruleName,
                        limits = new
                        {
                            claimLimit = claimLim < double.MaxValue ? (object)claimLim : null,
                            individualLimit = indLim < double.MaxValue ? (object)indLim : null,
                            familyLimit = famLim < double.MaxValue ? (object)famLim : null,
                            policyLimit = polLim < double.MaxValue ? (object)polLim : null,
                            corporateLimit = corpLim < double.MaxValue ? (object)corpLim : null
                        },
                        utilized = new
                        {
                            claimLimit = utilClaim,
                            individualLimit = utilInd,
                            familyLimit = utilFam,
                            policyLimit = utilPol,
                            corporateLimit = utilCorp
                        }
                    }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }
