# Directive: Engage & Comment (Zero Error)

## Goal
Rotate through active Twitter accounts and comment on target posts to simulate organic engagement.

## Inputs
- **Accounts**: `accounts_db.json` (Status: `ACTIVE`)
- **Proxies**: `proxies.txt`
- **Target Link**: User Input (or Default)

## Execution Steps (Layer 3)
1.  **Run Script**: `node execution/rotator.js`
2.  **Account Selection**: Filter accounts with `status: ACTIVE`.
3.  **Proxy Sticky Session**:
    -   If account has `proxy` saved, use it.
    -   Else, assign new proxy from rotation.
4.  **Login Flow (Robust)**:
    -   Try: **Cookies** (JSON/DB).
    -   Retry: **Username + Password**.
    -   Retry: **Email Verification** if triggered.
5.  **Engagement**:
    -   Navigate to Target URL.
    -   Wait for load.
    -   Select random Spintax comment.
    -   Post Comment.
6.  **Cleanup**:
    -   Clear Cookies/Cache (puppeteer session).
    -   Wait random delay (human-like).

## Error Handling
-   **Login Failed**: Mark account `SUSPENDED` or `LIMITED`.
-   **Proxy Failed**: Rotate to next proxy and retry account.
-   **Selector Failed**: Screenshot to `.tmp/logs/`.

## Output
-   Updated `accounts_db.json` (Status/History).
-   Logs in console.
