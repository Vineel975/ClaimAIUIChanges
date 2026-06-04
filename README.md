# Controller change — `LogClaimAIEvent` (MedicalScrutinyController.cs)

Two small changes to the existing `LogClaimAIEvent` action:
1. Add `tariffFileName` + `tariffAmount` to the method signature.
2. Pass them into the `USP_ClaimAI_IncrementSaveCount` call (the SAVE_CLICK branch).

Everything else stays the same.

## 1. Method signature — add the two parameters

**FROM:**
```csharp
public ActionResult LogClaimAIEvent(string claimId, string slNo,
    string eventType, string fieldName = null,
    string aiValue = null, string userValue = null,
    string claimType = null)
```

**TO:**
```csharp
public ActionResult LogClaimAIEvent(string claimId, string slNo,
    string eventType, string fieldName = null,
    string aiValue = null, string userValue = null,
    string claimType = null,
    string tariffFileName = null, string tariffAmount = null)   // NEW
```

## 2. The SAVE_CLICK branch — pass tariff data to the SP

**FROM:**
```csharp
if (string.Equals(eventType, "SAVE_CLICK", StringComparison.OrdinalIgnoreCase))
{
    using (var cmd2 = new System.Data.SqlClient.SqlCommand("USP_ClaimAI_IncrementSaveCount", conn))
    {
        cmd2.CommandType = System.Data.CommandType.StoredProcedure;
        cmd2.Parameters.AddWithValue("@ClaimID",   claimIdLong);
        cmd2.Parameters.AddWithValue("@SlNo",      slNoInt);
        cmd2.Parameters.AddWithValue("@ClaimType", (object)claimType ?? DBNull.Value);
        cmd2.Parameters.AddWithValue("@UserName",  (object)userName  ?? DBNull.Value);
        cmd2.ExecuteNonQuery();
    }
}
```

**TO:**
```csharp
if (string.Equals(eventType, "SAVE_CLICK", StringComparison.OrdinalIgnoreCase))
{
    // Parse tariff amount: accept "12,500.00" / "12500" / "" → null
    decimal? tariffAmtParsed = null;
    if (!string.IsNullOrWhiteSpace(tariffAmount))
    {
        decimal tmp;
        var cleaned = tariffAmount.Replace(",", "").Trim();
        if (decimal.TryParse(cleaned, System.Globalization.NumberStyles.Any,
                              System.Globalization.CultureInfo.InvariantCulture, out tmp))
            tariffAmtParsed = tmp;
    }

    using (var cmd2 = new System.Data.SqlClient.SqlCommand("USP_ClaimAI_IncrementSaveCount", conn))
    {
        cmd2.CommandType = System.Data.CommandType.StoredProcedure;
        cmd2.Parameters.AddWithValue("@ClaimID",        claimIdLong);
        cmd2.Parameters.AddWithValue("@SlNo",           slNoInt);
        cmd2.Parameters.AddWithValue("@ClaimType",      (object)claimType ?? DBNull.Value);
        cmd2.Parameters.AddWithValue("@UserName",       (object)userName  ?? DBNull.Value);
        cmd2.Parameters.AddWithValue("@TariffFileName", (object)(string.IsNullOrWhiteSpace(tariffFileName) ? null : tariffFileName) ?? DBNull.Value);   // NEW
        cmd2.Parameters.AddWithValue("@TariffAmount",   (object)tariffAmtParsed ?? DBNull.Value);   // NEW
        cmd2.ExecuteNonQuery();
    }
}
```

That's the entire controller change. The `USP_ClaimAI_LogEvent` call (the event-log insert) is untouched.
