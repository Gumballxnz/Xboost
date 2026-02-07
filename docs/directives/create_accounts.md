# Directive: Create Twitter Accounts (Zero Error)

## Goal
Create new Twitter/X accounts using Gmail aliases (+10, +11...) and rotate proxies to avoid suspension.

## Inputs
- **Gmail**: `arianablake899@gmail.com`
- **Proxy List**: `proxies.txt` (Webshare)
- **Database**: `accounts_db.json`

## Execution Steps (Layer 3)
1.  **Run Script**: `node execution/create_account.js`
2.  **Proxy Selection**: The script automatically selects a rotating proxy.
3.  **Browser Launch**: Launches Chromium with `--proxy-server`.
4.  **Signup Flow**:
    -   Enter Name (Randomized)
    -   Enter Email (Alias +NextID)
    -   Enter Date of Birth (> 1990)
    -   **Captcha**: PAUSE for manual solution if needed.
    -   **Verification**: Auto-fetch code via IMAP.
    -   **Password**: Set to `Roman700`.
5.  **Validation**:
    -   Check if account is created successfully.
    -   Save to `accounts_db.json` with `proxy` used.

## Error Handling (Self-Annealing)
-   If **Proxy Error/Timeout**: Script retries with new proxy.
-   If **Selector Not Found**: Script uses fallback selectors (XPath/Text).
-   If **Captcha Stuck**: Script waits for user input.
-   **Logs**: Screenshots saved to `.tmp/logs/`.

## Output
-   New entry in `accounts_db.json`:
    ```json
    {
      "email": "...",
      "username": "...",
      "password": "...",
      "status": "ACTIVE",
      "proxy": "192.168.x.x:port"
    }
    ```
