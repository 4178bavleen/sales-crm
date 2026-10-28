# Activity module starter

Copy `activities/` into `backend/src/modules/activities/`.

Routes included:
- POST `/` — log an activity
- GET `/` — paginated activity list; supports `page`, `limit`, `type`, `leadId`, `taskId`
- GET `/:id` — activity detail

Before mounting the router, ensure these permission codes exist and are granted to the relevant roles:
- `activities.create`
- `activities.view`

Mount the router in the main app/router using your project's existing versioned route convention, for example `/api/v1/activities`.

This is a starter based on the supplied task-module conventions. Check generated Prisma client imports and role naming against your full backend before deployment. The schema's database-level CHECK constraints are not visible here; application validation should be backed by DB constraints where required.
