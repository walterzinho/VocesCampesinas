---
Task ID: 2
Agent: Main Agent
Task: Implement 5 UI/UX improvements requested by user

Work Log:
- Copied LogoVC.png to /public/logo.png for use as station logo
- Created /public/uploads/ directory for program background images
- Generated placeholder musicatierrita.png (default background when no program is on air)
- Created /api/upload/route.ts - File upload endpoint (admin only) for program images
- Updated /api/blog/route.ts - Now reads blogUrl from Settings table instead of hardcoded URL
- Updated prisma/seed.ts - Added blogUrl setting
- Ran prisma db seed to sync new setting
- Completely rewrote page.tsx with restructured layout:
  - Shared compact header with real logo (all non-admin views)
  - 4-tab bottom navigation: En Vivo, Noticias, Programación, Admin
  - En Vivo tab: "Ahora Suena" hero card with dynamic background image → "A continuación" next program card → Radio Player → Información → Song Requests → Social links
  - Noticias tab: Full blog articles view
  - Programación tab: Full schedule view
  - Background image changes based on current program (imageUrl) or defaults to musicatierrita.png
  - AnimatePresence for smooth tab transitions
- Updated admin-panel.tsx:
  - Added Program.imageUrl field to interface
  - Added AppSettings.blogUrl field
  - Added image upload handler with preview in program dialog
  - Added "Imagen de fondo" field with file picker, upload progress, preview, and remove button
  - Added "URL del Blog" field in settings section
  - Added ImageIcon import
- Updated blog-section.tsx:
  - Now receives blogUrl from API response
  - "Ver todas" link uses dynamic blogUrl
  - Improved article card layout with larger images
  - Better loading skeleton

Stage Summary:
- All 5 improvements implemented
- Build clean with zero errors (13 routes)
- Logo, musicatierrita.png, and upload system working
- Blog URL now configurable from admin panel
- Background image changes dynamically based on current program
