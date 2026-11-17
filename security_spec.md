# Security Specification - SILABKOM SMKN 15 Pandeglang

## 1. Data Invariants
1. `UserProfile` (`/users/{userId}`):
   - No plaintext passwords or password hashes may ever be stored in Firestore (`!('password' in request.resource.data)`).
   - PII Isolation: Users can `get` only their own profile (`/users/$(request.auth.uid)`). Full `list` or reading other users' profiles is strictly restricted to Super Administrator (`admin` / verified master admin `adenur081292@gmail.com`) or users with `manageUsers` / `crudAllData` permission.
   - Self-service updates by a regular user may ONLY touch safe personal fields (`displayName`, `phone`, `avatarUrl`, `nip`, `subject`, `lastLoginAt`, `updatedAt`) and CANNOT alter `role`, `position`, `isActive`, `assignedClassIds`, `hasCustomPermissions`, `customAllowedMenus`, `customPermissions`, or `uid`.
   - Regular self-registration (`create` by non-admin) is only permitted if activating a matching verified `/user_invites/{email}` document (matching exact `role`, `position`, `isActive == true`, `hasCustomPermissions`, `customAllowedMenus`, `customPermissions`, `assignedClassIds`, and `role != 'admin'`) or bootstrapping verified master admin `adenur081292@gmail.com`.
   - Master admin account and the final active Super Administrator account cannot be deleted or deactivated.
2. `UserInvite` (`/user_invites/{inviteId}`):
   - Created/updated/deleted strictly by Super Administrator or `manageUsers` (never granting `role == 'admin'` unless Super Administrator).
   - Readable and claimable (`delete` on claim) only by the authenticated user whose verified email matches `inviteId`/`email` or by `manageUsers`/Super Administrator.
3. `AccessRole` (`/access_roles/{roleId}`):
   - Read access allowed for active authenticated users so UI & rules resolve role permissions; write/create/delete restricted strictly to Super Administrator or `manageRoles` (non-Super Admin cannot edit `admin` system role).
4. `isActiveUser()` Enforcement:
   - Every operational collection requires the caller to be authenticated AND have an active `/users/{uid}` document with `isActive == true` (or verified master admin `adenur081292@gmail.com`). Deactivated users lose all Firestore read/write access immediately.
5. `hasRolePermission(permKey)`:
   - Checks `hasCustomPermissions == true` -> `customPermissions[permKey] == true`, otherwise checks `/access_roles/{role}.permissions[permKey] == true` (plus `isSuperAdmin()`).
6. `Laboratory`, `Computer`, `Equipment`: Validated enum/types; writes restricted to Staff, Administrator, or `manageInventory`.
7. `Schedule`, `Borrowing`, `Maintenance`, `DamageReport`: Non-negative quantities, validated statuses; verification/deletions restricted to authorized staff/admins.
8. `StudentAttendance`, `LessonJournal`: Non-negative counts and 1–5 star comfort ratings.
9. `SchoolClass`, `Student`, `ClassAttendanceRecord`, `AcademicYearConfig`, `SchoolCalendarEvent`, `AttendanceSettings`, `AttendanceLog`: Class-scoping (`assignedClassIds`) and status allowlist `['H','S','I','A','D']`.
10. `GalleryCategory`, `GalleryImage`: Metadata synced with Firebase Storage; writes restricted to `manageGallery` / Super Administrator.
11. `ComputerUsageRecord`, `ComputerUsageMember`, `ComputerConditionCheck`, `ComputerDamageReport`, `ComputerStatusHistory`, `ExternalUser`, `ComputerUsageSettings`: Chronological usage & non-blaming condition tracking; restricted to active authorized users.
12. `AppSetting`, `ActivityLog`, `AttendanceLog`: `AppSetting` writable only by Super Admin / `manageSettings`; audit logs (`activity_logs`, `attendance_logs`) append-only for active users, update/delete strictly Super Administrator only.
13. `Guest`: Active authenticated users may record guest visits; modification/deletion restricted to staff/Super Admin.

## 2. Dirty Dozen Threat Payloads
1. **Privilege Escalation on Profile Update**: Non-admin user sending `updateDoc(doc(db, 'users', uid), { role: 'admin', isActive: true })` -> `PERMISSION_DENIED`.
2. **Custom Permission Self-Injection**: Non-admin user sending `updateDoc(doc(db, 'users', uid), { hasCustomPermissions: true, customAllowedMenus: ['access_management'] })` -> `PERMISSION_DENIED`.
3. **Plaintext Password Storage Injection**: Any write to `/users/{uid}` containing `password: "..."` -> `PERMISSION_DENIED`.
4. **Public Self-Registration Bypass**: Uninvited user calling `setDoc(doc(db, 'users', uid), { uid, email, role: 'kepala_lab', isActive: true })` -> `PERMISSION_DENIED`.
5. **PII Directory Scraping**: Regular user (`guru_mapel`) calling `getDocs(collection(db, 'users'))` -> `PERMISSION_DENIED`.
6. **Deactivated Account Access**: User with `isActive: false` attempting any read/write on `computers`, `students`, or `computer_usage` -> `PERMISSION_DENIED`.
7. **Unverified Admin Email Spoof**: User with `email == 'adenur081292@gmail.com'` and `email_verified == false` claiming Super Admin privileges -> `PERMISSION_DENIED`.
8. **Cross-User Invite Hijacking**: User A attempting to read or delete `/user_invites/userB@school.sch.id` -> `PERMISSION_DENIED`.
9. **Unauthorized Role Mutation**: Non-admin attempting to edit `/access_roles/guru_mapel` -> `PERMISSION_DENIED`.
10. **Audit Log Deletion**: Non-admin attempting `deleteDoc(doc(db, 'activity_logs', id))` -> `PERMISSION_DENIED`.
11. **Master Admin Self-Deletion Lockout Prevention**: Attempting `deleteDoc(doc(db, 'users', masterUid))` targeting master admin or own UID -> `PERMISSION_DENIED`.
12. **ID Poisoning & Out-of-Range Payloads**: Sending oversized (>128 char) doc IDs, `comfortRating: 99`, or forged attendance code `'X'` -> `PERMISSION_DENIED`.
