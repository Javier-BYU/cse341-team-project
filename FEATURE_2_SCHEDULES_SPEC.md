# Feature 2: Schedules

## Status and purpose

This is a retrospective implementation spec for the Schedules feature. The
feature has already been implemented; therefore, this document cannot satisfy
the course requirement to write the spec before coding. It records the
intended behavior, data contract, and remaining verification work.

The feature exposes schedules for a trip through a JSON API and hydrates the
schedule section of the trip details page in the browser. Users can select an
operating month to request schedules without reloading the page.

## Scope

### In scope

- Define the Mongoose schedule schema and query model.
- Return all schedules for a trip or filter by a month from 1 through 12.
- Provide JSON controllers and a documented API endpoint.
- Load schedules asynchronously on the trip details page and when the month
  selection changes.
- Keep schedule retrieval out of the server-rendered trip details controller.

### Out of scope

- Creating or editing schedules.
- Changing booking behavior, trip operating months, or the trip API.
- Changing the shared MongoDB connection strategy beyond supporting the
  Mongoose schedule model.

## Data model

The Mongoose model is `Schedule`, which uses the `schedules` collection.

| Field | Type | Constraints and meaning |
| --- | --- | --- |
| `id` | Number | Required, unique schedule identifier. |
| `tripId` | String | Required, indexed trip identifier matching `trips.id`. |
| `departureTime` | String | Required departure time, represented as `HH:mm`. |
| `arrivalTime` | String | Required arrival time, represented as `HH:mm`. |
| `daysOfWeek` | String array | Required weekdays when the schedule operates. |
| `months` | Number array | Required operating months; each value is between 1 and 12. |
| `status` | Boolean | Required schedule availability/status flag. |

The starter schedule JSON does not contain `months`. During database
initialization, each schedule receives the `operatingMonths` from its
associated trip. This assumes every schedule for a trip operates in every
month that trip operates. If individual schedules have different seasonal
availability, the seed data and this derivation must be revised so each
schedule carries its own months.

## API contract

### Endpoint

`GET /api/trips/{id}/schedules`

The optional `month` query parameter filters schedules to those whose `months`
array contains the requested integer.

### Request

- Path parameter `id`: required trip identifier string.
- Query parameter `month`: optional integer from 1 through 12.
- Request body: none.

Examples:

```text
GET /api/trips/alpine-panorama/schedules
GET /api/trips/alpine-panorama/schedules?month=4
```

### Successful response

`200 OK` returns a JSON array. Without `month`, the array contains every
schedule matching the trip. With `month`, it contains only schedules that
operate in that month.

```json
[
  {
    "id": 1,
    "tripId": "alpine-panorama",
    "departureTime": "08:30",
    "arrivalTime": "13:00",
    "daysOfWeek": ["monday", "tuesday", "wednesday", "thursday", "friday"],
    "months": [4, 5, 6, 7, 8, 9, 10, 11],
    "status": true
  }
]
```

### Error responses

| Status | Condition | Response |
| --- | --- | --- |
| `400 Bad Request` | `month` is not a single integer from 1 through 12. | `{"error":"Month must be a number from 1 to 12"}` |
| `404 Not Found` | No schedules match the trip, or the trip/month combination. | `{"error":"Schedules not found"}` |
| `500 Internal Server Error` | A database/model query fails. | `{"error":"Failed to fetch schedules"}` |

The API controllers log database errors on the server and return JSON errors to
the caller.

## Browser behavior

1. The EJS trip details controller loads and renders trip details only.
2. The page renders a month selector from `details.operatingMonths` and an
   initially empty schedules container.
3. On page load, client-side JavaScript requests all schedules for that trip.
4. On selector changes, it requests the same endpoint with `?month={month}`.
5. The page replaces the schedule cards and status text without a full-page
   navigation. It displays loading, no-results, and request-error messages.
6. Schedule values are inserted as text nodes rather than HTML strings.

The API route is documented with an OpenAPI annotation. `swagger-jsdoc` builds
the specification from route comments, and Swagger UI is served at `/api-docs`.

## Implementation map

- `src/models/schemas/schedules.js` — Mongoose schema.
- `src/models/schedules.js` — `getSchedulesByTripId(tripId, month?)`.
- `src/controllers/schedules.js` — JSON success and error responses.
- `src/routes/api-routes.js` — trip endpoints and documented schedules route.
- `src/config/swagger.js` and `app.js` — OpenAPI generation and Swagger UI.
- `src/db/initialize.js` — derives schedule months from trip operating months.
- `src/controllers/trips.js` — renders trip details without fetching schedules.
- `src/views/trips/details.ejs` — month selector and asynchronous schedule UI.
- `tests/schedules.test.js` — API, EJS rendering, and Swagger checks.

## Test plan

### Automated checks

- Request all schedules for a trip; verify status `200` and that every result
  belongs to that trip.
- Request schedules for a valid month; verify status `200` and that every
  result's `months` array contains that month.
- Request months below and above the allowed range, non-numeric values, an
  empty value, and repeated `month` parameters; verify `400`.
- Request an unknown trip and a valid month with no matching schedules;
  verify the documented `404` response.
- Simulate a model/database failure; verify the controller returns `500` JSON.
- Render a trip details page; verify the selector and empty schedule container
  are present and schedules are not rendered by EJS.
- Verify the generated Swagger document includes the route, path parameter,
  optional `month` query parameter, and response codes.

### Manual browser check

- Open a trip details page and confirm schedules load after the page renders.
- Observe the browser Network panel while changing the month; verify the
  request includes `?month=` and the page does not navigate or reload.
- Confirm loading, no-schedule, and error messages are understandable.
- Use Swagger UI at `/api-docs` to try an all-schedules request, a valid month,
  an invalid month, and a month with no matches.

## What is done and what remains

### Implemented

- Schema and Mongoose query by `tripId`, with optional `months` filtering.
- Controllers for unfiltered and month-filtered requests, including `200`,
  `400`, `404`, and `500` responses.
- Combined API route and OpenAPI/Swagger documentation.
- Async schedule loading and month-change requests on the trip details page.
- Removal of schedule queries from the EJS trip-details controller.
- Automated checks for all-schedule results, month filtering, invalid month,
  no-match behavior, page rendering, and Swagger parameter documentation.

### Not fully verified or still needed

- The written spec was not created before implementation; this document
  records it after the fact.
- Existing databases need the starter data reinitialized to receive schedule
  `months`. The current import clears and recreates starter collections, so a
  safe additive migration for a populated database is not provided.
- Current automated tests check the rendered UI shell but do not execute the
  browser JavaScript to prove that month changes update cards without
  navigation. Add a browser-level test or record the manual Network-panel
  walkthrough.
- Add explicit automated tests for the `500` controller path and the invalid
  month edge cases listed in the test plan.
- The issue's PR delivery requirements also call for a test plan and a
  walkthrough video. The video still needs to be recorded; a script alone is
  not the video deliverable.
