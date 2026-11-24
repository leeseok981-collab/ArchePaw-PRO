import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  limit,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  PlayHistoryEntry,
  SavedServerEntry,
  UserProfile,
} from './game/userConfig';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: Array<{
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }>;
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): void {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

export async function testConnection(): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore client appears offline; using local storage fallback.');
    }
  }
}

export function subscribeAuth(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, cb);
}

export async function signInWithGooglePopup(): Promise<User | null> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('오프라인 상태에서는 Google 로그인을 사용할 수 없습니다.');
  }
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutAccount(): Promise<void> {
  await signOut(auth);
}

export async function fetchCloudUserProfile(uid: string): Promise<UserProfile | null> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null;
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      nickname: typeof data.nickname === 'string' ? data.nickname : '모험가',
      avatarData: typeof data.avatarData === 'string' ? data.avatarData : '',
      avatarKind:
        data.avatarKind === 'google' || data.avatarKind === 'upload' ? data.avatarKind : 'preset',
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function saveCloudUserProfile(uid: string, profile: UserProfile): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  if (!auth.currentUser || auth.currentUser.uid !== uid) return false;
  const path = `users/${uid}`;
  try {
    const ref = doc(db, 'users', uid);
    const existing = await getDoc(ref);
    const cleanNickname = profile.nickname.trim().slice(0, 20) || '모험가';
    const cleanAvatar = (profile.avatarData || '').slice(0, 175000);
    if (existing.exists()) {
      await updateDoc(ref, {
        nickname: cleanNickname,
        avatarData: cleanAvatar,
        avatarKind: profile.avatarKind,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        uid,
        nickname: cleanNickname,
        avatarData: cleanAvatar,
        avatarKind: profile.avatarKind,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

export async function fetchCloudSavedServers(uid: string): Promise<SavedServerEntry[] | null> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null;
  const path = `users/${uid}/servers`;
  try {
    const q = query(collection(db, 'users', uid, 'servers'), orderBy('lastPlayedAt', 'desc'), limit(40));
    const snaps = await getDocs(q);
    return snaps.docs.map((d) => {
      const data = d.data();
      return {
        id: String(data.id || d.id),
        name: String(data.name || '저장된 서버'),
        code: String(data.code || 'frontier-1'),
        lastPlayedAt: typeof data.lastPlayedAt === 'number' ? data.lastPlayedAt : 0,
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return null;
  }
}

export async function upsertCloudSavedServer(uid: string, server: SavedServerEntry): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  if (!auth.currentUser || auth.currentUser.uid !== uid) return false;
  const path = `users/${uid}/servers/${server.id}`;
  try {
    const ref = doc(db, 'users', uid, 'servers', server.id);
    const existing = await getDoc(ref);
    if (existing.exists()) {
      await updateDoc(ref, {
        name: server.name.trim().slice(0, 32) || '서버',
        code: server.code.slice(0, 28),
        lastPlayedAt: Math.max(0, Math.floor(server.lastPlayedAt || 0)),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        id: server.id,
        ownerId: uid,
        name: server.name.trim().slice(0, 32) || '서버',
        code: server.code.slice(0, 28),
        lastPlayedAt: Math.max(0, Math.floor(server.lastPlayedAt || 0)),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

export async function deleteCloudSavedServer(uid: string, serverId: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  if (!auth.currentUser || auth.currentUser.uid !== uid) return false;
  const path = `users/${uid}/servers/${serverId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'servers', serverId));
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    return false;
  }
}

export async function fetchCloudPlayHistory(uid: string): Promise<PlayHistoryEntry[] | null> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null;
  const path = `users/${uid}/history`;
  try {
    const q = query(collection(db, 'users', uid, 'history'), orderBy('playedAt', 'desc'), limit(35));
    const snaps = await getDocs(q);
    return snaps.docs.map((d) => {
      const data = d.data();
      return {
        id: String(data.id || d.id),
        code: String(data.code || ''),
        serverName: String(data.serverName || ''),
        directConnect: Boolean(data.directConnect),
        playedAt: typeof data.playedAt === 'number' ? data.playedAt : 0,
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return null;
  }
}

export async function addCloudPlayHistory(uid: string, entry: PlayHistoryEntry): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  if (!auth.currentUser || auth.currentUser.uid !== uid) return false;
  const path = `users/${uid}/history/${entry.id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'history', entry.id), {
      id: entry.id,
      ownerId: uid,
      code: entry.code.slice(0, 28),
      serverName: (entry.serverName || '').slice(0, 32),
      directConnect: Boolean(entry.directConnect),
      playedAt: Math.max(0, Math.floor(entry.playedAt || Date.now())),
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return false;
  }
}

export async function deleteCloudPlayHistoryEntry(uid: string, entryId: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  if (!auth.currentUser || auth.currentUser.uid !== uid) return false;
  const path = `users/${uid}/history/${entryId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'history', entryId));
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    return false;
  }
}
