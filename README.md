# Show AI Summary only for adjudication-stage claims (StageID = 4)

**File:** `Enrollment/Views/MedicalScrutiny/Index.cshtml` (Spectra)
**Why here:** The AI Summary widget (`#divAiSummary`) and its iframe live in this view, and
the claim's stage is already on the page as `#hdnClaimStageID` (= `ViewData["ClaimStageID"]`).
ClaimAI (the iframe) does not load the *current* claim's stage, so gating there would still
leave Spectra showing the empty widget shell — the gate belongs in Spectra.

Apply by **anchor** (line numbers will differ from your deployed file). Two small inserts.

---

## Edit 1 — page-load entry (`$(document).ready`)

Find this block (inside the `$(document).ready(function () { ... })` that has
`GetInsurerRejectionMaster(...)` and `var _claimIdOnLoad = $('#hdnClaimID').val();`):

```js
            var _claimIdOnLoad = $('#hdnClaimID').val();

            if (!RestoreAiSummaryIfSaved(_claimIdOnLoad)) {
                InitAiSummary(_claimIdOnLoad, $('#hdnClaimSlNo').val());
            }
```

Replace with:

```js
            var _claimIdOnLoad = $('#hdnClaimID').val();

            // AI Summary is shown only for adjudication-stage claims (StageID = 4).
            if (($('#hdnClaimStageID').val() || '').toString().trim() === '4') {
                if (!RestoreAiSummaryIfSaved(_claimIdOnLoad)) {
                    InitAiSummary(_claimIdOnLoad, $('#hdnClaimSlNo').val());
                }
            } else {
                $('#divAiSummary').hide();
            }
```

---

## Edit 2 — guard the init itself (covers the Reload button → `ReloadAiSummary` → `InitAiSummary`)

Find:

```js
        function InitAiSummary(claimID, slNo) {
            console.log('[ClaimAI] STEP 1 START: InitAiSummary. claimID:', claimID, 'slNo:', slNo, 'ClaimAI URL:', _claimAiUrl);
```

Insert the guard as the first lines of the function body:

```js
        function InitAiSummary(claimID, slNo) {
            // AI Summary is shown only for adjudication-stage claims (StageID = 4).
            if (($('#hdnClaimStageID').val() || '').toString().trim() !== '4') {
                $('#divAiSummary').hide();
                return;
            }
            console.log('[ClaimAI] STEP 1 START: InitAiSummary. claimID:', claimID, 'slNo:', slNo, 'ClaimAI URL:', _claimAiUrl);
```

---

## Result
- **Stage 4 (adjudication):** widget renders and loads exactly as today (page load + Reload work).
- **Any other stage:** `#divAiSummary` is hidden and no documents/Convex/iframe work runs —
  nothing fires off in the background.

## Optional (also stop the markup from rendering at all)
If you'd rather the widget HTML never reach the page for non-stage-4 claims, also wrap the
`#divAiSummary` block (`<!-- AI Summary -->` … `<!-- END AI Summary -->`) in:

```cshtml
@if (Convert.ToString(ViewData["ClaimStageID"]) == "4")
{
    <!-- AI Summary ... entire #divAiSummary block ... END AI Summary -->
}
```

The JS guards above are still recommended even with this wrap, so the Reload path and any
restore-after-save path stay correct. The JS guard alone is sufficient and lower-risk; the
Razor wrap is just belt-and-suspenders.

## Verify before deploy
- Confirm **StageID 4 = Adjudication** in your `Claimstage` table (you stated it is). This view
  already uses stage-based gating elsewhere — e.g. an `@if` on `ViewData["ClaimStageID"]` for
  stages 5 / 24 — so the same `ClaimStageID` value is the right thing to compare.
- Build in Visual Studio and recycle the app pool as usual.
