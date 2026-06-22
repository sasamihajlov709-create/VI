import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(
  uid: string,
  email: string,
  username?: string,
  displayName?: string,
  photoURL?: string
) {
  try {
    const result = await db.insert(users)
      .values({
        uid,
        email,
        username: username || email.split('@')[0],
        displayName: displayName || username || email.split('@')[0],
        photoURL: photoURL || '',
        isOnboarded: true,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          username: username || email.split('@')[0],
          displayName: displayName || username || email.split('@')[0],
          photoURL: photoURL || '',
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Database query (getOrCreateUser) failed:", error);
    throw new Error("Database operation failed. Please try again later.", { cause: error });
  }
}

export async function getUserProfileByUid(uid: string) {
  try {
    const result = await db.select()
      .from(users)
      .where(eq(users.uid, uid));
    return result[0] || null;
  } catch (error) {
    console.error("Database query (getUserProfileByUid) failed:", error);
    throw new Error("Database operation failed. Please try again later.", { cause: error });
  }
}
export { users };
