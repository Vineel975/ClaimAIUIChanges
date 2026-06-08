# AI Summary → only for adjudication-stage claims (StageID = 4)

**File:** `Enrollment/Views/MedicalScrutiny/Index.cshtml`

Two find-and-replace edits in the `<script>` block. Both gate on `#hdnClaimStageID`
(which already holds `@ViewData["ClaimStageID"]`). Edit 1 covers normal page load;
Edit 2 covers the Reload button (and any other call into `InitAiSummary`).

---

## EDIT 1 — page-load entry (inside the first `$(document).ready`)

### FIND
```js
            if (!RestoreAiSummaryIfSaved(_claimIdOnLoad)) {
                // STAGING — Step 6: if this claim was pre-processed by the staging
                // pipeline (ProcessingStatus='done' with a jobId), render the AI
                // summary instantly from that stored jobId instead of running the
                // on-demand InitAiSummary flow. Falls back to InitAiSummary if there
                // is no pre-processed result.
                LoadAiSummaryFromStagingOrInit(_claimIdOnLoad, $('#hdnClaimSlNo').val());
            }
```

### REPLACE WITH
```js
            // AI Summary is shown only for adjudication-stage claims (StageID = 4).
            if (($('#hdnClaimStageID').val() || '').toString().trim() === '4') {
                if (!RestoreAiSummaryIfSaved(_claimIdOnLoad)) {
                    // STAGING — Step 6: if this claim was pre-processed by the staging
                    // pipeline (ProcessingStatus='done' with a jobId), render the AI
                    // summary instantly from that stored jobId instead of running the
                    // on-demand InitAiSummary flow. Falls back to InitAiSummary if there
                    // is no pre-processed result.
                    LoadAiSummaryFromStagingOrInit(_claimIdOnLoad, $('#hdnClaimSlNo').val());
                }
            } else {
                $('#divAiSummary').hide();
            }
```

---

## EDIT 2 — guard `InitAiSummary` (covers the Reload button → `ReloadAiSummary`)

### FIND
```js
        function InitAiSummary(claimID, slNo) {
            // Check Claimsdetails directly before starting
            $.ajax({
                url:  '/MedicalScrutiny/IsClaimAISummaryAllowed',
```

### REPLACE WITH
```js
        function InitAiSummary(claimID, slNo) {
            // AI Summary is shown only for adjudication-stage claims (StageID = 4).
            if (($('#hdnClaimStageID').val() || '').toString().trim() !== '4') {
                $('#divAiSummary').hide();
                return;
            }
            // Check Claimsdetails directly before starting
            $.ajax({
                url:  '/MedicalScrutiny/IsClaimAISummaryAllowed',
```

---

## Result
- **StageID = 4 (adjudication):** unchanged — page load + Reload work exactly as today
  (staging pre-load, restore-after-save, on-demand init, claim-type/cataract gate, etc.).
- **Any other stage:** `#divAiSummary` is hidden and none of the PDF-load / Convex /
  iframe work starts. `LoadAiSummaryFromStagingOrInit`, `RestoreAiSummaryIfSaved` and
  `InitAiSummary` are all skipped.

## Notes
- These two edits are enough on their own. They don't touch the existing
  `IsClaimAISummaryAllowed` / cataract-maternity restrictions — those still apply on top
  for stage-4 claims.
- This is a string comparison against `'4'`; confirm StageID 4 = Adjudication in your
  `Claimstage` table (this view already gates other things on `ViewData["ClaimStageID"]`,
  so the value source is correct).
- After editing: build in Visual Studio and recycle the app pool.

### Optional — also stop the markup from rendering for non-stage-4
If you'd rather the widget HTML never reach the page, you can additionally wrap the
`#divAiSummary` block (from `<!-- AI Summary ... -->` to `<!-- END AI Summary -->`) in:

```cshtml
@if (Convert.ToString(ViewData["ClaimStageID"]) == "4")
{
    <!-- the entire #divAiSummary widget -->
}
```

The two JS guards above are still recommended even with this wrap (Reload + restore paths).
The JS guards alone are sufficient and lower-risk; the Razor wrap is optional.
