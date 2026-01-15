# Project State (Phase 0)

## Current Product Identity
This repository represents a **Radiology/Clinic RIMS (Radiology Information Management System)** focused on the workflow:
**Registration → Performance → Verification → PDF**.

The existing audit titled **“RIMS Repository Audit Report (Student Management Portal Goal)”** is the source of truth for scope.

## What Exists Today
- Patient records and demographics
- Service/catalog definitions
- Workflow visits/items
- USG reporting flows
- OPD components (some unrouted)
- Report templates
- PDF generation endpoints
- JWT authentication

## What Does NOT Exist
- Student/Faculty/Admin portal data models
- Student/Faculty/Admin routes or APIs
- Role-based UI for student management

## Canonical API Direction
- **Canonical future endpoints**: `/api/workflow/*`

## Legacy Endpoints (Tolerated Only)
- `/api/studies`
- `/api/reports`
- `/api/visits`

These legacy endpoints remain for compatibility but **must not be extended**.
