# 10. Analytics Module - SmartScan Pro

This document describes how the analytics engine processes spending data to generate trends, category insights, and vendor statistics.

---

## Analytics Endpoints

The analytics engine is implemented in [src/routes/analytics.js](file:///c:/Flutter/flutter_windows_3.41.9-stable/Smartscanner-backend-main/Smartscanner-backend-main/src/routes/analytics.js) and exposes four primary endpoints:

```
                  ┌──> GET /trends (Monthly aggregates)
                  ├──> GET /insights/categories (Spending distribution)
GET /api/analytics┼
                  ├──> GET /insights/top-stores (Top vendor locations)
                  └──> GET /insights/budget-health (Spending-to-budget ratios)
```

---

## Processing Logic

### 1. Spending Trends (`GET /trends`)
* Calculates month-over-month spending aggregates and category totals over a rolling monthly window (default: 6 months).
* **Processing Flow**:
  1. Queries all receipts created on or after the starting date:
     ```javascript
     const receipts = await Receipt.find({ userId: req.userId, date: { $gte: startDate } });
     ```
  2. Iterates through the results in-memory to group totals, item counts, and category aggregates by month:
     ```javascript
     receipts.forEach(receipt => {
       const monthKey = receipt.date.toISOString().slice(0, 7); // Format: YYYY-MM
       // Aggregates totals and category breakdowns in-memory...
     });
     ```
  3. Sorts the chronological trends and returns a JSON list to the client.

### 2. Category Insights (`GET /insights/categories`)
* Calculates spending totals and percentage distributions by category for a specific month.
* **Processing Flow**:
  1. Queries receipts logged by the user in the target month.
  2. Iterates through the results to calculate category spent totals, item counts, and percentage distributions:
     ```javascript
     categories[cat].percentage = grandTotal > 0 ? ((categories[cat].total / grandTotal) * 100).toFixed(2) : 0;
     ```

### 3. Top Spending Stores (`GET /insights/top-stores`)
* Identifies the stores where the user spends the most money.
* **Processing Flow**:
  1. Queries receipts logged by the user in the target month.
  2. Iterates through the results to calculate spent totals and visit counts for each store.
  3. Sorts the list in descending order by spent totals and returns the top results (limited by the `limit` parameter, default: 10).

### 4. Budget Health (`GET /insights/budget-health`)
* Compares overall monthly spending to the budget limit and returns a warning status.
* **Processing Flow**:
  1. Queries receipts logged by the user in the target month and sums the totals.
  2. Retrieves the user's budget document for the month.
  3. Returns budget totals, spent totals, remaining balances, and warning statuses:
     * `exceeded`: Spent exceeds the budget limit.
     * `warning`: Spent is greater than or equal to 80% of the budget.
     * `good`: Spent is under 80% of the budget.

---

## Maintenance Notes & Performance Risks

> [!WARNING]
> **In-Memory Calculations scale bottlenecks**: The analytics routes fetch all receipt records and perform calculations in-memory using JavaScript loops. As a user's receipt history grows, these loops can consume high CPU and memory resources. We recommend refactoring these routes to perform calculations on the database side using MongoDB aggregation pipelines (`$group`, `$sort`, `$project`).

> [!TIP]
> **Index Optimization**: Date-filtered queries in analytics routes currently result in database index scans. We recommend adding a compound index on `{ userId: 1, date: -1 }` to optimize query performance.

For details on sharing features and social interactions, refer to [11_Social_Module.md](file:///c:/Flutter/flutter_windows_3.41.9-stable/Smartscanner-backend-main/Smartscanner-backend-main/docs/11_Social_Module.md).
