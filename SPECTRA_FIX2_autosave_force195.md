# Spectra FIX #2 — stop the auto-save from forcing Day-care (195)

File: `Views/MedicalScrutiny/Index.cshtml`
Location: the iframe-save handler, "Step 1" timeout — currently lines **9575-9580**.

## Why the manual change still saved as Day Care
There are two writes to the approved facility on an iframe save:

1. `SaveClinicalDetailsForClaimAI` (line ~9281) already uses
   `window._claimAI_approvedFacilityId || $('#ddlApprovedFacility').val()` — correct.
2. **The native Save** — Step 1 (this block) runs ~1s after the save, FORCES
   `#ddlApprovedFacility = 195` whenever `window._claimAI_needsDayCare` is true
   (set for every cataract claim at line 9552-9554), then clicks
   `#btnHospDetailsSave` (line 9583). The native save reads the dropdown, so
   **195 (Day-care) gets persisted**, overwriting whatever the iframe sent.

So even with the `setApprovedAccommodation` handler fix in place, this block
overrides the dropdown back to Day-care for cataract right before saving.

## Fix
Use the value the iframe sent (`window._claimAI_approvedFacilityId`, set by the
`setApprovedAccommodation` postMessage = the dropdown's `selectedApprovedId`).
For a cataract claim with no manual change the iframe already sends 195, so the
default is preserved; a manual change now survives. Fall back to forcing 195 only
if the iframe sent nothing.

Timing is safe: this runs 1s after save, and the postMessage that sets
`window._claimAI_approvedFacilityId` fires immediately on save (and again the
moment the doctor changes the dropdown) — the same assumption the 500ms
`SaveClinicalDetailsForClaimAI` block at line 9273-9274 already relies on.

---

## FIND (exact — lines 9575-9580)
```javascript
                        // Set Day-care (ID=195) for cataract cases
                        if (window._claimAI_needsDayCare) {
                            $('#ddlApprovedFacility').removeAttr('disabled').val(195);
                            window._claimAI_needsDayCare = false;
                            console.log('[ClaimAI] Approved Accommodation set to Day-care (195)');
                        }
```

## REPLACE WITH
```javascript
                        // Approved Accommodation: honour the value chosen in the ClaimAI iframe
                        // (the prepopulated default OR the doctor's manual change). For cataract
                        // with no manual change the iframe already sends Day-care (195); a manual
                        // change overrides it. Only fall back to the Day-care default if the
                        // iframe sent nothing at all.
                        if (window._claimAI_approvedFacilityId) {
                            $('#ddlApprovedFacility').removeAttr('disabled').val(window._claimAI_approvedFacilityId);
                            console.log('[ClaimAI] Approved Accommodation set from iframe:', window._claimAI_approvedFacilityId);
                        } else if (window._claimAI_needsDayCare) {
                            $('#ddlApprovedFacility').removeAttr('disabled').val(195);
                            console.log('[ClaimAI] Approved Accommodation set to Day-care (195)');
                        }
                        window._claimAI_needsDayCare = false;
```

---

## REQUIRED: apply together with FIX #1
This fix depends on `window._claimAI_approvedFacilityId` holding the iframe's
chosen value. That is set by the `setApprovedAccommodation` handler from
`SPECTRA_setApprovedAccommodation_CHANGES.md` (line ~9076) — which must read
`event.data.facilityId` (not the availed value). Make sure BOTH are applied:
  • FIX #1: handler at 9076 sets `#ddlApprovedFacility` + `window._claimAI_approvedFacilityId` = `event.data.facilityId`.
  • FIX #2: this block (9575-9580) stops forcing 195.
Plus the ClaimAI `result-view.tsx` change (Save sends `selectedApprovedId`).

## How to verify (cataract claim)
1. Open the claim; iframe shows Approved = Day Care (default).
2. Manually change Approved Accommodation to e.g. a Private Room in the iframe.
3. Save in the iframe.
4. Spectra → Hospitalization Details → Approved Facility should now show the
   Private Room, not Day Care. Check the console: "[ClaimAI] Approved
   Accommodation set from iframe: <id>" should log the chosen id, not 195.

## Deploy
Apply FIND/REPLACE, build in Visual Studio, recycle app pool.
