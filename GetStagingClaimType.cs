        /// <summary>
        /// Resolves a claim's disease/claimType the SAME way the on-demand (browser) path does:
        /// read Claimsdetails.Diagnosis and classify it through ClaimAI's keyword classifier
        /// (POST /api/classify-claim-type). Unlike the coding-based GetClaimDiseaseTypeForStaging,
        /// this works BEFORE coding is done because the diagnosis text exists at claim entry.
        /// Mirrors the classify logic in GetClaimType so staging and on-demand agree on the disease.
        /// Returns "cataract", "maternity", or "other"; never throws.
        /// </summary>
        private string GetStagingClaimType(long claimId, string connStr)
        {
            try
            {
                // 1. Diagnosis text from Claimsdetails (latest SlNo) — same source as GetClaimType.
                string diagnosisText = "";
                using (var conn = new System.Data.SqlClient.SqlConnection(connStr))
                {
                    conn.Open();
                    using (var diagCmd = new System.Data.SqlClient.SqlCommand(
                        "SELECT TOP 1 Diagnosis FROM Claimsdetails WITH(NOLOCK) WHERE ClaimID=@ClaimID AND ISNULL(Deleted,0)=0 ORDER BY SlNo DESC", conn))
                    {
                        diagCmd.Parameters.AddWithValue("@ClaimID", claimId);
                        var diagVal = diagCmd.ExecuteScalar();
                        diagnosisText = diagVal != null && diagVal != DBNull.Value ? diagVal.ToString().Trim() : "";
                    }
                }

                if (string.IsNullOrWhiteSpace(diagnosisText))
                    return "other";

                // 2. Classify via ClaimAI's keyword classifier — same endpoint the browser uses.
                string claimAiUrl = (System.Configuration.ConfigurationManager.AppSettings["ClaimAIUrl"] ?? "").TrimEnd('/');
                if (string.IsNullOrEmpty(claimAiUrl))
                    return "other";

                // Match the TLS / cert settings GetClaimType + audit/start use.
                System.Net.ServicePointManager.SecurityProtocol =
                    System.Net.SecurityProtocolType.Tls12 |
                    System.Net.SecurityProtocolType.Tls11 |
                    System.Net.SecurityProtocolType.Tls;
                System.Net.ServicePointManager.ServerCertificateValidationCallback =
                    (sender, cert, chain, errors) => true;

                using (var http = new System.Net.Http.HttpClient())
                {
                    http.Timeout = TimeSpan.FromSeconds(15);
                    var payload = Newtonsoft.Json.JsonConvert.SerializeObject(new { diagnosis = diagnosisText });
                    var body = new System.Net.Http.StringContent(payload, System.Text.Encoding.UTF8, "application/json");
                    var res = http.PostAsync(claimAiUrl + "/api/classify-claim-type", body).GetAwaiter().GetResult();
                    if (!res.IsSuccessStatusCode)
                        return "other";

                    string respBody = res.Content.ReadAsStringAsync().GetAwaiter().GetResult();
                    dynamic result = Newtonsoft.Json.JsonConvert.DeserializeObject(respBody);
                    string ct = result?.claimType?.ToString() ?? "other";
                    return string.IsNullOrWhiteSpace(ct) ? "other" : ct.Trim().ToLowerInvariant();
                }
            }
            catch
            {
                // Never break the worker over classification — default to generic.
                return "other";
            }
        }
