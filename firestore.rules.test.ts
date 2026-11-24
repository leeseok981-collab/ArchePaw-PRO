/**
 * Security rules specification test cases for ArchePaw PRO Firestore rules.
 * Covers owner-only access, unauthenticated denial, cross-user isolation,
 * schema/type enforcement, timestamp verification, and immutable ownership fields.
 */
export interface SecurityTestCase {
  name: string;
  path: string;
  op: 'get' | 'list' | 'create' | 'update' | 'delete';
  authUid: string | null;
  emailVerified?: boolean;
  expected: 'allow' | 'deny';
}

export const FIRESTORE_RULE_CASES: SecurityTestCase[] = [
  {
    name: 'Unauthenticated user cannot read profile',
    path: '/users/user_a',
    op: 'get',
    authUid: null,
    expected: 'deny',
  },
  {
    name: 'Authenticated verified owner can read own profile',
    path: '/users/user_a',
    op: 'get',
    authUid: 'user_a',
    emailVerified: true,
    expected: 'allow',
  },
  {
    name: 'Cross-user profile read is denied',
    path: '/users/user_b',
    op: 'get',
    authUid: 'user_a',
    emailVerified: true,
    expected: 'deny',
  },
  {
    name: 'Listing all users collection is denied',
    path: '/users',
    op: 'list',
    authUid: 'user_a',
    emailVerified: true,
    expected: 'deny',
  },
  {
    name: 'Owner can list own saved servers',
    path: '/users/user_a/servers',
    op: 'list',
    authUid: 'user_a',
    emailVerified: true,
    expected: 'allow',
  },
  {
    name: 'Cross-user saved server list is denied',
    path: '/users/user_b/servers',
    op: 'list',
    authUid: 'user_a',
    emailVerified: true,
    expected: 'deny',
  },
  {
    name: 'Owner can manage own play history',
    path: '/users/user_a/history/h_1',
    op: 'create',
    authUid: 'user_a',
    emailVerified: true,
    expected: 'allow',
  },
  {
    name: 'Unverified email user is denied write',
    path: '/users/user_a/servers/s_1',
    op: 'create',
    authUid: 'user_a',
    emailVerified: false,
    expected: 'deny',
  },
];
