# Pending Tasks - Raport Dashboard Refinement

## 1. Step 2 Toolbar Mobile Optimization (CRITICAL)
- [ ] **Search Input**: Fix full-width implementation on mobile. In the current screenshot, it's still being constricted by the "Navigasi" hint.
- [ ] **Navigasi Hint**: Shorten or hide on mobile view (`hidden xs:block` or similar). It takes up too much horizontal space.
- [ ] **Action Grouping**: 
    - Row 1: Ganti Kelas + Draft Alert + Progress.
    - Row 2: Full-width Search.
    - Row 3: Utility buttons (Filter, WA Warning, Shortcut) + Export container.
- [ ] **Button Standard 10**: Ensure ALL utility buttons are `h-10` with consistent padding.
- [ ] **WA Warning Badge**: Center or align properly in its row.

## 2. Navigation Improvements
- [ ] **Riwayat Button Logic**: When clicking "Riwayat" while already in the Archive/History menu, it should return the user to Step 0 (Home/Class List).

## 4. Visual Polish (Sultan Mode)
- [ ] **Transition Effects**: Add subtle slide-up/down animations for the toolbar rows when switching steps.
- [ ] **Skeleton States**: Refine list loading state to match the high-fidelity design of the main dashboard.

---
---
*Last updated: 12 Mei 2026*

## 5. Student Registration Form (Enterprise Polish)
- [ ] **Step 3 Structural Fix**: Separate "Dokumen & EMIS" card from "Alamat & Domisili" card. They are currently nested improperly (Dokumen nested inside Alamat).
- [ ] **Standardize Headers**: Apply 'Modern Iconic Accent' style to "Dokumen & EMIS" header (use `faFileAlt` and Amber accent) to match other sections.
- [ ] **Review Card Verification**: Final check on the glassmorphism summary card to ensure all fields are displaying correctly and responsive.
- [ ] **Tag Balance Audit**: Final run of `check_balance.py` diagnostic script to ensure no stray tags exist after structural changes.
