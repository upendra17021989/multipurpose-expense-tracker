# N+1 query fixes

The API list endpoints below now load related rows for the full result set before mapping DTOs. Single-record endpoints retain their existing queries.

| API | Change |
| --- | --- |
| `GET /expenses`, `/today`, `/range`, `/festival/{id}`, `/festival/{id}/page` | Fetch expense items by expense IDs and group them in memory; fetch categories with the parent query. |
| `GET /kirana/sales`, `/range` | Fetch sale items by sale IDs; fetch product and customer data with their parent queries. |
| `GET /kirana/purchases`, `/range` | Fetch purchase items by purchase IDs; fetch product and supplier data with their parent queries. |
| `GET /personal/shared-expenses/groups` | Fetch members for all visible groups in one query. |
| `GET /personal/shared-expenses/friends` | Fetch members, payers, shares, and settlements for all visible groups in four queries, then group by group ID. |
| `GET /society/agencies` | Fetch workers for all agencies in one query. |
| `GET /society/work-orders` | Fetch assignments for all orders in one query; fetch order users and assignment targets with the list queries. |
| `GET /system-admin/accounts` | Count memberships for all accounts on the page in one grouped query and load owners in one query. |
| `POST /society/festival-collections/generate-demand` | Load existing collections once and index by flat ID. |
| `POST /sports/collections/generate-demand` | Load existing collections and prior balances once, then index by member ID. |
| `POST /society/festivals/{festivalId}/coupons/generate` | Load issued coupons for the event once and group by collection ID. |

To-one fetch graphs also cover the list DTOs for sports events, expenses, and collections; festival collections; society roster assignments; and complaints. The journal list already had a fetch graph for lines and flats, so it was not changed.

## Verification

Run `cd backend` followed by `mvn.cmd test`. Query counts should remain constant as the number of returned parent records grows, apart from database parameter-limit batching if that is introduced for very large lists. These endpoints still return unpaged lists where they did before; large list size remains a separate scalability concern.

Verified on 2026-09-26: `mvn.cmd -q test` passed (61 tests). The coupon generation fixture was updated to return the new event-wide coupon lookup.
