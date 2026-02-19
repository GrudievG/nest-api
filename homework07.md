# GraphQL Integration

## Approach: Code-First

### Why Code-First

- The project is fully built with TypeScript.
- GraphQL types are directly synchronized with TypeScript classes.
- Decorators make GraphQL integration feel native and idiomatic within NestJS.
- Reduced risk of schema ↔ DTO ↔ domain model desynchronization.
- Better autocomplete support and safer refactoring.
- Validation can be implemented in a clean and consistent way.

---

# Orders Query

- The resolver is thin.
- All business logic is implemented inside `OrdersService`.
- The resolver only:
    - accepts arguments,
    - delegates execution to the service layer,
    - returns the result.

There is no filtering, transformation, or computation logic inside the resolver.

---

# N+1 Problem and DataLoader

- **N+1 problem:** when querying orders with their related products, each order (or order item) triggers a separate database query to fetch its product.
- **DataLoader:** a utility designed to optimize such scenarios by batching requests and caching results within a single request lifecycle.
- In this implementation, DataLoader collects all relevant identifiers from the GraphQL request and performs a single batched query (e.g., using `WHERE id IN (...)`) to retrieve related entities at once.
- This significantly reduces the number of database queries and improves performance.

## Implementation Details

I implemented a dedicated service containing methods that internally use DataLoader to optimize database access.

This service is implemented as a factory and instantiated per GraphQL request to prevent cache leakage between different requests.

The service instance is attached to the GraphQL context, allowing any resolver to access it and execute optimized queries.

Additionally, SQL query logging was enabled to monitor the number of database queries executed when fetching orders and their related entities. This allowed me to verify that the number of queries was reduced after introducing DataLoader.

---

# Example GraphQL Query

```graphql
query Orders($status: OrderStatus, $offset: Int, $limit: Int) {
  orders(status: $status, offset: $offset, limit: $limit) {
    id
    status
    createdAt
    total
    items {
      quantity
      product {
        id
        title
        price
      }
    }
    customer {
      email
      firstName
      lastName
    }
  }
}
```