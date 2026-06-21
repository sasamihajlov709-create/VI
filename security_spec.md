# Security Specification - VI Messenger Zero-Trust Architecture

This document defines the data invariants, threat model, and "Dirty Dozen" payloads engineered to verify that the math-hardened Firebase Security Rules cannot be bypassed.

## 1. Core Data Invariants

1. **Identity Isolation**: A user cannot modify or spoof another user's profile metadata, sessions, or contacts. Accounts are tied exclusively to the user's authentic UID.
2. **Access Derivability**: Messages, topics, and group metadata are strictly restricted to members of that chat unless the chat's type is explicitly marked as `public`.
3. **Immutability of Privileges**: End-users cannot assign themselves `isAdmin`, `isModerator`, or global system administrator flags. Local chat roles (Admin, Moderator) can only be changed by the chat's creator or existing admins.
4. **Enforced Blocklist**: If User A blocks User B, B cannot send direct messages to A, view A's active phone number, see A's status, or invite A to chats.
5. **Auditable Integrity**: Creation of administrative invites, join requests, and reports require validation against the sender's auth UID. Audit logs can be written by signed-in agents but are read-only and restricted exclusively to global admins.

## 2. Threat Model & The "Dirty Dozen" Rogue Payloads

The following 12 rogue payloads are designed to probe or breach the database. They must all yield a `PERMISSION_DENIED` response.

---

### Payload 1: Profile Role Escalation (Identity Cloaking)
* **Goal**: An attacker attempts to self-provision superuser status inside their user profile page.
* **Path**: `/users/attacker_uid` (Create or Update)
```json
{
  "uid": "attacker_uid",
  "displayName": "Rogue Agent",
  "email": "rogue@attacker.com",
  "isAdmin": true,
  "role": "global_admin"
}
```
* **Defense**: User update rules deny writing `isAdmin` or `role` unless the client is verified against a trusted, static list.

---

### Payload 2: Message Sender Spoofing (Impersonation)
* **Goal**: Attacker attempts to post a message into a chat with a `senderId` pointing to an authorized user.
* **Path**: `/messages/msg_999` (Create)
```json
{
  "id": "msg_999",
  "chatId": "chat_123",
  "senderId": "victim_uid",
  "senderName": "Victim User",
  "text": "Please click this phishing link. Urgent!",
  "createdAt": 1718972400000
}
```
* **Defense**: `incoming().senderId == request.auth.uid` validation forces authentication parity.

---

### Payload 3: Private Thread Peeking (Eavesdropping)
* **Goal**: An uninvited user tries to query the messages of a private thread.
* **Path**: `/messages/msg_some` (Read / List)
```json
// Query filter: chatId == private_chat_456
```
* **Defense**: Message read block queries the parent chat's `members` field via `get()` to verify membership.

---

### Payload 4: Arbitrary Chat Title Change (Metadata Hijack)
* **Goal**: A regular participant attempts to rename a group chat or change its welcome message.
* **Path**: `/chats/group_789` (Update)
```json
{
  "title": "HACKED GROUP BY ATTACKER"
}
```
* **Defense**: Chat metadata updates require `isChatAdmin()` or `isChatCreator()` checks. Regular members can only modify personal fields (e.g., typing indicators, drafts, or pins).

---

### Payload 5: Reaction Spoofing (Identity Theft)
* **Goal**: Attacker tries to inject / delete reactions in the name of another user.
* **Path**: `/messages/msg_abc` (Update)
```json
{
  "reactions": {
    "victim_uid": "💩"
  }
}
```
* **Defense**: Update validation restricts mutations to the map key matching `request.auth.uid`.

---

### Payload 6: Blocked User Message Bypass (Spam Injection)
* **Goal**: A blocked user attempts to submit a direct message to the user who blocked them.
* **Path**: `/messages/msg_direct_attacker` (Create)
```json
{
  "chatId": "direct_attacker_to_victim",
  "senderId": "attacker_uid",
  "text": "You cannot block me!"
}
```
* **Defense**: The message create logic checks the target's `blockedUsers` list to reject queries.

---

### Payload 7: Invite Link Hijacking & Forgery (Privilege Theft)
* **Goal**: Regular user tries to bypass invite generation rules and create a valid signup code.
* **Path**: `/invites/rogue_code` (Create)
```json
{
  "id": "rogue_code",
  "chatId": "chat_999",
  "creatorId": "attacker_uid",
  "usageLimit": 99999,
  "isRevoked": false
}
```
* **Defense**: Invites creation strictly requires `isChatAdmin(incoming().chatId)` validation.

---

### Payload 8: Join Request Approval Spoofing (Gate Crashing)
* **Goal**: Attacker tries to approve their own pending join requests to gain entry to private chats.
* **Path**: `/joinRequests/req_self` (Update)
```json
{
  "id": "req_self",
  "status": "approved"
}
```
* **Defense**: Approve/Reject modifications on Join Requests are only permitted if the authenticated caller is a designated admin of the destination chat.

---

### Payload 9: Audit Trail Tampering (Evidence Destruct)
* **Goal**: Attackers try to delete or modify historical session logs or security violations database to hide tracks.
* **Path**: `/auditLogs/log_xyz` (Update or Delete)
* **Defense**: Complete block: `allow update, delete: if false;` enforces read-only logs.

---

### Payload 10: Story View Spamming (Profile Harrassment)
* **Goal**: Attacker tries to inject junk entries into someone's stories view history array to spam them.
* **Path**: `/stories/story_val` (Update)
```json
{
  "views": ["user_1", "user_2", "attacker_uid_heavy_leak"]
}
```
* **Defense**: Size limitations (`views.size() <= 1000`) and array validation rule (only allow appending the user's authentic UID).

---

### Payload 11: Mass Invitation Denial (wallet attack)
* **Goal**: Attackers create trillions of dummy invite codes or join requests to exploit index sizing.
* **Path**: `/invites/some_wild_string...` (Create)
* **Defense**: ID string size checks (`isValidId(inviteId)`) and general document creation constraints.

---

### Payload 12: Administrative Impersonation (Backdoor Claims)
* **Goal**: User with custom emails attempts to query other users' audit logs.
* **Path**: `/auditLogs` (Read / List)
```json
// Query filter: any
```
* **Defense**: Access restricted to global admin email list (`sasamihajlov709@gmail.com`).

---

## 3. Test Verification Layout

All requests failing the assertions return standard gRPC `PERMISSION_DENIED` (code 7) or standard Firestore Auth exceptions. All application logic triggers `handleFirestoreError` in `/src/lib/firebase.ts` to log specific details for telemetry, while keeping data securely sealed.
