# Spectra cshtml — forward tariff file name + amount into the save-count metrics POST

File: deployed `MedicalScrutiny/Index.cshtml`
Location: the `claimAISaveComplete` postMessage handler → the `// METRICS` IIFE
(in your uploaded copy this is ~lines 9480-9516).

## Context (the full chain, so it's clear what each side does)
- **ClaimAI iframe** — already done. On Save it posts `claimAISaveComplete` with
  `tariffFileName` (the Tariff Extraction column file) and `tariffAmount` (the
  Approvals tariff amount). See `components/result-view.tsx` lines 1638-1639.
- **Spectra cshtml** — THIS edit. The metrics IIFE reads those off `event.data`
  and includes them in the `LogClaimAIEvent` POST.
- **Controller `LogClaimAIEvent`** — covered by the separate change-doc
  `SPECTRA_LogClaimAIEvent_tariff_passthrough.md`; forwards them to
  `USP_ClaimAI_IncrementSaveCount` on SAVE_CLICK.

All three must be in place for the columns to populate. ClaimAI is already built
with lines 1638-1639 — just confirm the running iframe is on that build.

---

## EDIT — add the two values to the metrics POST

### FIND
```javascript
                    (function() {
                        var _cid          = $('#hdnClaimID').val()  || '';
                        var _slno         = $('#hdnClaimSlNo').val() || '1';
                        var _ct           = window._claimAI_claimType || 'other';
                        var _changedFields = event.data.changedFields || []; // from ClaimAI iframe

                        function _logEvent(eventType, fieldName, aiVal, userVal) {
                            $.ajax({
                                url:  '/MedicalScrutiny/LogClaimAIEvent',
                                type: 'POST',
                                data: {
                                    claimId:   _cid,
                                    slNo:      _slno,
                                    eventType: eventType,
                                    fieldName: fieldName || '',
                                    aiValue:   aiVal     || '',
                                    userValue: userVal   || '',
                                    claimType: _ct
                                },
                                error: function() { /* non-critical — silent */ }
                            });
                        }
```

### REPLACE WITH
```javascript
                    (function() {
                        var _cid          = $('#hdnClaimID').val()  || '';
                        var _slno         = $('#hdnClaimSlNo').val() || '1';
                        var _ct           = window._claimAI_claimType || 'other';
                        var _changedFields = event.data.changedFields || []; // from ClaimAI iframe
                        var _tariffFileName = event.data.tariffFileName || ''; // NEW: Tariff Extraction column file name
                        var _tariffAmount   = event.data.tariffAmount   || ''; // NEW: tariff amount shown in Approvals

                        function _logEvent(eventType, fieldName, aiVal, userVal) {
                            $.ajax({
                                url:  '/MedicalScrutiny/LogClaimAIEvent',
                                type: 'POST',
                                data: {
                                    claimId:   _cid,
                                    slNo:      _slno,
                                    eventType: eventType,
                                    fieldName: fieldName || '',
                                    aiValue:   aiVal     || '',
                                    userValue: userVal   || '',
                                    claimType: _ct,
                                    tariffFileName: _tariffFileName, // NEW
                                    tariffAmount:   _tariffAmount    // NEW
                                },
                                error: function() { /* non-critical — silent */ }
                            });
                        }
```

Notes:
- The two values are added to the shared `_logEvent` POST, so they go out on both
  the `SAVE_CLICK` and `FIELD_CHANGE` calls. That's harmless — the controller only
  uses them on `SAVE_CLICK` (it calls `USP_ClaimAI_IncrementSaveCount` only then);
  on `FIELD_CHANGE` they're simply ignored.
- `tariffAmount` arrives as a string; the controller strips commas/₹ and
  `decimal.TryParse`s it, so a blank/non-numeric value just stores NULL.

## Deploy order
1. Apply the controller change (`SPECTRA_LogClaimAIEvent_tariff_passthrough.md`),
   build in Visual Studio, recycle the app pool.
2. Apply this cshtml edit and deploy the view (bump any `?v=` cache-buster on the
   view's scripts or hard-refresh so the browser picks up the new handler).
3. Confirm the ClaimAI iframe build includes result-view.tsx lines 1638-1639.

## Verify
Open a claim, change something in the iframe, click Save. Then:
```sql
SELECT ClaimID, SlNo, SaveCount, TariffFileName, TariffAmount, LastSavedAt
FROM ClaimAI_SaveCount WHERE ClaimID = <claimId> AND SlNo = <slNo>;
```
`TariffFileName` should show the extraction file name and `TariffAmount` the
approvals tariff value from the last save.
