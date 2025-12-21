# Shiplog API Documentation

Base URL: `http://localhost:3000` (Default)

## Drafts Management

### List All Drafts
Retrieves all drafts stored in the system.

- **Endpoint**: `GET /drafts`
- **Response**:
  ```json
  {
    "success": true,
    "drafts": {
      "uuid-1": {
        "id": "uuid-1",
        "content": "Draft content...",
        "platform": "twitter",
        "status": "draft",
        "createdAt": "2023-10-27T10:00:00Z",
        "updatedAt": "2023-10-27T10:00:00Z"
      }
    }
  }
  ```

### Get Single Draft
Retrieves a specific draft by ID.

- **Endpoint**: `GET /draft/:id`
- **Path Parameters**:
  - `id`: UUID of the draft
- **Response**:
  ```json
  {
    "success": true,
    "draft": {
      "id": "uuid-1",
      "content": "Draft content...",
      "platform": "twitter",
      "status": "draft",
      ...
    }
  }
  ```

### Create Draft
Creates a new manual draft.

- **Endpoint**: `POST /draft/create`
- **Body**:
  ```json
  {
    "content": "My new post content",
    "platform": "twitter" // "twitter" | "linkedin" | "discord"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "draft": {
      "id": "new-uuid",
      "content": "My new post content",
      "platform": "twitter",
      "status": "draft",
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
  ```

### Update Draft
Updates an existing draft.

- **Endpoint**: `PATCH /draft/:id`
- **Path Parameters**:
  - `id`: UUID of the draft
- **Body** (all fields optional):
  ```json
  {
    "content": "Updated content",
    "platform": "linkedin",
    "scheduledFor": "2023-12-25T10:00:00Z"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "draft": { ...updatedDraftObject }
  }
  ```

### Delete Draft
Deletes a draft.

- **Endpoint**: `DELETE /draft/:id`
- **Path Parameters**:
  - `id`: UUID of the draft
- **Response**:
  ```json
  {
    "success": true,
    "draft": { ...deletedDraftObject }
  }
  ```

## Scheduling

### Schedule Post
Schedules a draft for future publication.

- **Endpoint**: `POST /schedule`
- **Body**:
  ```json
  {
    "draftId": "uuid-of-draft",
    "scheduledFor": "2023-12-25T12:00:00Z" // ISO 8601 Date String (must be in future)
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "draft": {
      "id": "uuid-of-draft",
      "status": "scheduled",
      "scheduledFor": "2023-12-25T12:00:00Z",
      ...
    }
  }
  ```

## Analytics & Dashboard

### Get Dashboard Stats
Returns counts for dashboard cards.

- **Endpoint**: `GET /stats`
- **Response**:
  ```json
  {
    "activeDrafts": 5,
    "scheduled": 2,
    "published": 10,
    "analyzedEvents": 42
  }
  ```

### Get Recent Events
Returns a list of GitHub events analyzed by the AI.

- **Endpoint**: `GET /events`
- **Response**:
  ```json
  {
    "success": true,
    "events": [
      {
        "id": "event-uuid",
        "title": "feat: Add login",
        "type": "pr", // "pr" | "issue" | "release" | "milestone"
        "hypeScore": 8,
        "createdAt": "2023-10-27T10:00:00Z",
        "sourceUrl": "https://github.com/..."
      }
    ]
  }
  ```

## Integrations

### GitHub Webhook
Endpoint for GitHub Webhooks.

- **Endpoint**: `POST /webhooks/github`
- **Supported Events**: `pull_request` (closed/merged), `release`, `issues`, `milestone`.
- **Setup**: Add this URL to your GitHub Repository Webhooks settings. Content type: `application/json`.

## System

### Health Check
Simple endpoint to check if the API is running.

- **Endpoint**: `GET /hello`
- **Response**:
  ```json
  {
    "message": "Hello request received! Check logs for processing.",
    "status": "processing",
    "appName": "Motia App"
  }
  ```
