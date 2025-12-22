
# Data Model Reference

This document provides a detailed breakdown of the core data structures used in the AccrediFy application. These models are defined in `types.ts` for the frontend and are mirrored in `backend/api/models.py` for the backend database.

## Enums

### `ComplianceStatus`
Represents the state of a compliance indicator.

| Value | Description |
|---|---|
| `Not Started` | The task has not yet been addressed. |
| `In Progress` | The task is currently being worked on. |
| `Compliant` | The task is complete and meets requirements. |
| `Non-Compliant` | The task was attempted but failed to meet requirements. |
| `Not Applicable`| The task does not apply to this specific context. |

---

### `Frequency`
Describes how often a recurring compliance task needs to be performed.

| Value | Description |
|---|---|
| `One-time` | A task that only needs to be completed once. |
| `Daily` | A task that must be performed every day. |
| `Weekly` | A task that must be performed every week. |
| `Monthly`| A task that must be performed every month. |
| `Quarterly`| A task that must be performed every four months. |
| `Annually` | A task that must be performed every year. |

---

## Interfaces

### `Project`
The top-level object representing a single compliance project or accreditation effort.

| Property | Type | Description |
|---|---|---|
| `id` | `string` | A unique identifier for the project (e.g., UUID). |
| `name` | `string` | The user-defined name of the project (e.g., "ISO 15189 Accreditation 2024"). |
| `description`| `string` | A brief description of the project's scope or purpose. |
| `indicators` | `Indicator[]` | An array of all compliance indicators belonging to this project. |
| `createdAt` | `string` | An ISO 8601 formatted date string of when the project was created. |
| `driveConfig`| `DriveConfig` | (Optional) Configuration object for Google Drive integration. |

---

### `Indicator`
A specific, actionable compliance requirement or task within a project.

| Property | Type | Description |
|---|---|---|
| `id` | `string` | A unique identifier for the indicator. |
| `section` | `string` | The category or section the indicator belongs to (e.g., "Safety"). |
| `standard` | `string` | The specific regulation or standard code (e.g., "PHC-SAF-05"). |
| `indicator` | `string` | The title or brief description of the requirement itself. |
| `description`| `string` | A detailed explanation of what is required to be compliant. |
| `score` | `number` | A point value assigned to the indicator, used for calculating compliance scores. |
| `responsiblePerson` | `string` | (Optional) The name or role of the person ultimately responsible. |
| `frequency` | `Frequency` | (Optional) How often this indicator needs to be reviewed or performed. |
| `assignee` | `string` | (Optional) The person or team assigned to complete the task. |
| `status` | `ComplianceStatus` | The current compliance status of the indicator. |
| `evidence` | `Evidence[]` | An array of all evidence items associated with this indicator. |
| `notes` | `string` | (Optional) User-added notes or comments. |
| `lastUpdated`| `string` | (Optional) An ISO 8601 date string of the last compliance update. |
| `formSchema` | `FormField[]` | (Optional) A schema for building a dynamic digital form for this task. |
| `aiAnalysis` | `object` | (Optional) Stores the content and timestamp of an AI-generated analysis or guide. |
| `aiCategorization`| `string` | (Optional) The category assigned by the AI ('ai_fully_manageable', 'ai_assisted', 'manual'). |
| `isAICompleted` | `boolean` | (Optional) Flag indicating if an AI action (e.g., document generation) has been completed. |
| `isHumanVerified` | `boolean`| (Optional) Flag indicating if a human has reviewed and approved an AI-completed action. |

---

### `Evidence`
A piece of proof linked to an `Indicator` to demonstrate compliance.

| Property | Type | Description |
|---|---|---|
| `id` | `string` | A unique identifier for the evidence item. |
| `dateUploaded` | `string` | An ISO 8601 date string of when the evidence was added. |
| `type` | `'document' \| 'image' \| 'certificate' \| 'note' \| 'link'` | The type of evidence. |
| `fileName` | `string` | (Optional) The name of the uploaded file or the display text for a link. |
| `fileUrl` | `string` | (Optional) The URL to access the uploaded file or the target of a link. |
| `content` | `string` | (Optional) The text content for evidence of type 'note'. |
| `driveFileId` | `string` | (Optional) The unique ID of the file if stored in Google Drive. |
| `driveViewLink` | `string`| (Optional) A direct link to view the file in Google Drive. |
| `syncStatus` | `'synced' \| 'pending' \| 'error'` | (Optional) The synchronization status with Google Drive. |
| `fileSize` | `string` | (Optional) The size of the file (e.g., "1.2 MB"). |

---

### `FormField`
Defines a single field within a dynamic digital form.

| Property | Type | Description |
|---|---|---|
| `name` | `string` | The unique machine-readable name for the field (e.g., "waste_weight_kg"). |
| `label` | `string` | The human-readable label displayed to the user (e.g., "Waste Weight (kg)"). |
| `type` | `'text' \| 'number' \| 'date' \| 'textarea'` | The input type for the form field. |
| `required` | `boolean` | (Optional) Whether the field must be filled out to submit the form. |

---

### `DriveConfig`
Stores configuration details for Google Drive integration for a specific `Project`.

| Property | Type | Description |
|---|---|---|
| `isConnected` | `boolean` | Whether Google Drive is currently connected for this project. |
| `accountName` | `string` | (Optional) The email address of the connected Google account. |
| `rootFolderId` | `string` | (Optional) The ID of the root folder in Google Drive where this project's files are stored. |
| `lastSync` | `string` | (Optional) An ISO 8601 date string of the last successful sync. |
