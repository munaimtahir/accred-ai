
# Key Application Workflows

This document outlines several key user workflows within the AccrediFy application. These stories describe how a user interacts with the system to achieve a specific goal and can be used to guide development and testing.

---

### Workflow 1: Onboarding a New Project via CSV Upload

**User Role**: Lab Director or Quality Manager

**Goal**: To quickly set up a new compliance project by importing an existing checklist from a CSV file.

1.  **Start**: The user lands on the **Project Hub**, which displays a list of existing projects.
2.  **Initiate**: The user clicks the "**New Project**" button.
3.  **Modal Opens**: The **Add Project Modal** appears.
4.  **Enter Details**: The user provides a **Project Name** (e.g., "Annual Safety Audit 2024") and an optional **Description**.
5.  **Upload File**: The user clicks the upload area and selects a `.csv` file containing their compliance checklist. The file must match the template format.
6.  **Submit**: The user clicks "**Create Project**".
7.  **Frontend Action**: The frontend reads the CSV file and sends its contents along with the project details to the backend via `api.createProject`. A loading state is displayed.
8.  **Backend Processing**:
    - The Django backend receives the request.
    - It passes the raw indicator data to the **AI Service** (`/api/analyze-checklist/`).
    - The AI Service calls the **Gemini API** to analyze the data, potentially adding suggestions or standardizing fields.
    - The backend creates the new `Project` and associated `Indicator` records in the database.
9.  **Response**: The backend returns the newly created project object, complete with AI-enriched indicators, to the frontend.
10. **UI Update**: The modal closes, the project list on the Project Hub is updated, and the application automatically navigates the user to the **Dashboard** for the new project.

---

### Workflow 2: Completing a Recurring Daily Task

**User Role**: Lab Technician

**Goal**: To perform a daily temperature check, log it as evidence, and mark the task as compliant for the day.

1.  **Start**: The user navigates to the **Upcoming Tasks** view (or the "Frequency Log" tab in the Checklist).
2.  **Identify Task**: The user locates a daily task, such as "Record Refrigerator Temperature," which may be flagged as "Action Required."
3.  **Log Evidence**: The user clicks the "**Log Evidence**" button for that task, which opens the **Evidence Modal**.
4.  **Choose Log Type**: The user selects the "**Digital Log**" tab.
    - If a digital form exists for this task, the form fields are displayed (e.g., "Temperature (°C)", "Time").
    - If no form exists, a simple "note" textarea is shown.
5.  **Enter Data**: The user enters the temperature reading (e.g., "4.5") and any observations.
6.  **Save Log**: The user clicks "**Save Log**".
7.  **Backend Action**: The frontend sends the data to the backend. The backend creates a new `Evidence` record (as a note or by generating a PDF from the form data) and associates it with the indicator.
8.  **Mark Compliant**: Back in the Upcoming Tasks view, the "**Mark Compliant**" button for the task is now enabled (because recent evidence exists). The user clicks it.
9.  **Backend Action**: The frontend calls the `api.quickLogIndicator` endpoint. The backend updates the `Indicator`'s `status` to `Compliant` and sets its `lastUpdated` timestamp to the current date.
10. **UI Update**: The task card in the UI updates to show a "Complete" status for the day, and it is no longer flagged as requiring action.

---

### Workflow 3: Using AI to Generate a Standard Operating Procedure (SOP)

**User Role**: Quality Manager

**Goal**: To create a required SOP document for a compliance item that is currently "Not Started."

1.  **Start**: The user navigates to the **AI Analysis** view.
2.  **Run Analysis**: The user clicks "**Categorize Indicators**". The AI processes all non-compliant items.
3.  **Identify Actionable Item**: The AI categorizes an indicator like "Procedure for chemical spill response" under "**Fully AI Manageable**."
4.  **Bulk Action**: The user clicks the "**Auto-Write SOPs**" button for that category.
5.  **Backend Processing**:
    - The frontend iterates through the list of manageable indicator IDs.
    - For each one, it calls the backend's `api.generateComplianceGuide` endpoint.
    - The backend's AI Service sends a detailed prompt to the **Gemini API** to write an SOP for that specific indicator.
    - The backend receives the generated text, creates a PDF document from it, and saves it as a new `Evidence` item.
    - The backend then updates the `Indicator`'s status to `Compliant`, sets `isAICompleted` to `true`, and `isHumanVerified` to `false`.
6.  **UI Feedback**: A progress bar shows the bulk operation's status. When complete, an alert informs the user that the generated documents are ready for review.
7.  **Human Review**: The user navigates to the **Compliance Checklist** view and clicks the "**AI Review**" tab. The newly generated SOP appears in this queue.
8.  **Verification**: The user can view the AI-generated PDF. If it's satisfactory, they click "**Final Approve**".
9.  **Finalize**: The `isHumanVerified` flag is set to `true`. The item now moves from the "AI Review" queue to the "Compliant" list, completing the workflow.
