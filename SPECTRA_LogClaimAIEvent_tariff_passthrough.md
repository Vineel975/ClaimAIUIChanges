# Spectra change — pass TariffFileName / TariffAmount into ClaimAI_SaveCount

File: `MedicalScrutinyController.cs`
Method: `LogClaimAIEvent` (the `[HttpPost]` action, ~lines 11333-11409).

The SP `USP_ClaimAI_IncrementSaveCount` already accepts `@TariffFileName` and
`@TariffAmount` (NULL defaults), so no SP change is needed. These two edits make
the controller forward those values to the SP on every SAVE_CLICK.

IMPORTANT: this is half the wiring. The controller can only forward what the
client posts. The client save-click AJAX that calls `MedicalScrutiny/LogClaimAIEvent`
must also add `tariffFileName` and `tariffAmount` to its `data` object (see
"Client side" below). Until that's done, both columns stay NULL — but applying
this controller change first is safe and harmless.

---

## EDIT 1 — add two parameters to the action signature

### FIND
```csharp
        public ActionResult LogClaimAIEvent(string claimId, string slNo,
            string eventType, string fieldName = null,
            string aiValue = null, string userValue = null,
            string claimType = null)
```

### REPLACE WITH
```csharp
        public ActionResult LogClaimAIEvent(string claimId, string slNo,
            string eventType, string fieldName = null,
            string aiValue = null, string userValue = null,
            string claimType = null,
            string tariffFileName = null, string tariffAmount = null)
```

---

## EDIT 2 — pass the two values to the IncrementSaveCount SP

### FIND
```csharp
                        using (var cmd2 = new System.Data.SqlClient.SqlCommand("USP_ClaimAI_IncrementSaveCount", conn))
                        {
                            cmd2.CommandType = System.Data.CommandType.StoredProcedure;
                            cmd2.Parameters.AddWithValue("@ClaimID", claimIdLong);
                            cmd2.Parameters.AddWithValue("@SlNo", slNoInt);
                            cmd2.Parameters.AddWithValue("@ClaimType", (object)claimType ?? DBNull.Value);
                            cmd2.Parameters.AddWithValue("@UserName", (object)userName ?? DBNull.Value);
                            cmd2.ExecuteNonQuery();
                        }
```

### REPLACE WITH
```csharp
                        using (var cmd2 = new System.Data.SqlClient.SqlCommand("USP_ClaimAI_IncrementSaveCount", conn))
                        {
                            cmd2.CommandType = System.Data.CommandType.StoredProcedure;
                            cmd2.Parameters.AddWithValue("@ClaimID", claimIdLong);
                            cmd2.Parameters.AddWithValue("@SlNo", slNoInt);
                            cmd2.Parameters.AddWithValue("@ClaimType", (object)claimType ?? DBNull.Value);
                            cmd2.Parameters.AddWithValue("@UserName", (object)userName ?? DBNull.Value);

                            // NEW: tariff snapshot for this save (sent from the client save-click).
                            cmd2.Parameters.AddWithValue("@TariffFileName", (object)tariffFileName ?? DBNull.Value);
                            decimal _tariffAmt;
                            string _amtClean = (tariffAmount ?? "").Replace(",", "").Replace("\u20B9", "").Trim();
                            bool _hasTariffAmt = decimal.TryParse(_amtClean, out _tariffAmt);
                            cmd2.Parameters.AddWithValue("@TariffAmount", _hasTariffAmt ? (object)_tariffAmt : DBNull.Value);

                            cmd2.ExecuteNonQuery();
                        }
```

Notes:
- `tariffAmount` arrives as a string from the form post; it's cleaned of commas
  and the ₹ symbol, then `decimal.TryParse`d. If it's empty or non-numeric, the
  SP gets NULL (no error).
- Balance verified on the new block: braces 1/1, parens 19/19, brackets 0/0.

---

## Client side (the missing half)
The save-click AJAX that posts to `MedicalScrutiny/LogClaimAIEvent` needs the two
values added to its `data`. I couldn't find that call in the cshtml you uploaded
(`index_-_2026-06-08...cshtml`) — it predates the metrics caller — so paste me
that `$.ajax({ url: '.../LogClaimAIEvent', data: { ... } })` block and tell me
which field holds the on-screen tariff amount (candidates I see: the hidden
`#hdnTatalSeriveTariffAmount`, or `#hdnTotalTariffDBAmt`) and where the tariff
file name lives at save time. Then the addition is simply:

```javascript
data: {
    claimId:        ...,
    slNo:           ...,
    eventType:      'SAVE_CLICK',
    claimType:      ...,
    tariffFileName: <the tariff file name shown/used>,   // e.g. window._claimAI_tariffFileName
    tariffAmount:   $('#hdnTatalSeriveTariffAmount').val()  // confirm which field
}
```

## Deploy
Apply both controller edits, build in Visual Studio, recycle the app pool. No SP
or table change needed (the SP/columns already exist). Once the client posts the
two values, they'll land in `ClaimAI_SaveCount.TariffFileName` / `TariffAmount`
on each save.
