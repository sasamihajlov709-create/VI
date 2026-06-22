import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, boolean } from 'drizzle-orm/pg-core';

// Define the 'users' table.
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  username: text('username'),
  displayName: text('display_name'),
  photoURL: text('photo_url'),
  isOnboarded: boolean('is_onboarded').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'chats' table.
export const chats = pgTable('chats', {
  id: serial('id').primaryKey(),
  uuid: text('uuid').notNull().unique(), // Frontend chat UUID
  name: text('name'),
  type: text('type').default('private'), // 'private' or 'group'
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'messages' table with active relations.
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  uuid: text('uuid').notNull().unique(), // Frontend message UUID
  chatId: text('chat_id').notNull(),
  senderId: text('sender_id').notNull(),
  text: text('text').notNull(),
  type: text('type').default('text'), // 'text', 'voice', 'sticker', etc.
  mediaUrl: text('media_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'calls' table to log call histories if needed.
export const calls = pgTable('calls', {
  id: serial('id').primaryKey(),
  uuid: text('uuid').notNull().unique(),
  callerId: text('caller_id').notNull(),
  receiverId: text('receiver_id').notNull(),
  status: text('status').default('ringing'), // 'ringing', 'accepted', 'rejected', 'ended'
  createdAt: timestamp('created_at').defaultNow(),
});

// Define relations for the tables.
export const usersRelations = relations(users, ({ many }) => ({
  callsAsCaller: many(calls, { relationName: 'caller_calls' }),
  callsAsReceiver: many(calls, { relationName: 'receiver_calls' }),
}));

export const callsRelations = relations(calls, ({ one }) => ({
  caller: one(users, {
    fields: [calls.callerId],
    references: [users.uid],
    relationName: 'caller_calls',
  }),
  receiver: one(users, {
    fields: [calls.receiverId],
    references: [users.uid],
    relationName: 'receiver_calls',
  }),
}));
