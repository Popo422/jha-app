# Submissions API Setup

## Installation Required

First, install the Vercel Blob package:
```bash
npm install @vercel/blob
```

## Environment Variables

Add to your `.env.local`:
```
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
```

## Database Migration

Run the database migration to create the submissions table:
```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

## API Endpoints

### POST /api/submissions
Submit a new form with file uploads.

**Request Format:**
- Content-Type: `multipart/form-data`
- Fields:
  - `submissionType`: 'end-of-day' | 'job-hazard-analysis' | 'start-of-day'
  - `supervisorDateClockedIn`: ISO date string (optional)
  - `supervisorDateClockedOut`: ISO date string (optional)
  - `jobSite`: string (required)
  - `formData`: JSON string with form fields
  - `files`: File uploads (optional, multiple files supported)

**Authentication:** JWT token via cookie or Authorization header

### GET /api/submissions
Retrieve submissions with optional filtering.

**Query Parameters:**
- `type`: Filter by submission type
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset (default: 0)

**Authentication:** JWT token via cookie or Authorization header

## Form Data Structure

The `formData` JSON should contain all form fields. Files will be uploaded to Vercel Blob and their URLs will be added to the `formData.uploadedFiles` array automatically.

## Usage Example

```javascript
const formData = new FormData()
formData.append('submissionType', 'end-of-day')
formData.append('jobSite', 'Main Construction Site')
formData.append('formData', JSON.stringify({
  workCompleted: 'Foundation work',
  issuesEncountered: 'None',
  // ... other form fields
}))

// Add files
formData.append('files', fileInput.files[0])
formData.append('files', fileInput.files[1])

fetch('/api/submissions', {
  method: 'POST',
  body: formData
})
```