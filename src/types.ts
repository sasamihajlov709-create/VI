/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserProfile {
  uid: string;
  displayName: string;
  username: string;
  email: string;
  photoURL: string;
  bio: string;
  statusMessage: string;
  onlineStatus: 'online' | 'offline';
  lastSeen: number; // timestamp ms
  createdAt: number; // timestamp ms
  contacts: string[]; // uids
  blockedUsers: string[]; // uids
  folders?: ChatFolder[];
  stickers?: string[]; // array of custom sticker urls
  emojiStatus?: string; // custom emoji status indicator
  phoneNumber?: string; // custom phone number
  theme?: string; // real-time synced user visual preference
  privacySettings?: {
    phoneNumber?: 'all' | 'contacts' | 'nobody';
    statusMessage?: 'all' | 'contacts' | 'nobody';
    photoURL?: 'all' | 'contacts' | 'nobody';
    lastSeen?: 'all' | 'contacts' | 'nobody';
    onlineStatus?: 'all' | 'contacts' | 'nobody';
  };
  isOnboarded?: boolean;
  themeDensity?: 'cozy' | 'compact' | 'comfortable';
  birthday?: string; // custom birthday date string (e.g. YYYY-MM-DD)
  customSettings?: {
    // Media & Sound
    swipeMediaOnClick?: boolean;
    edgeSwipeNavigate?: boolean;
    raiseToListen?: boolean;
    raiseToRecord?: boolean;
    pauseMusicOnRecord?: boolean;
    pauseMusicOnMediaPlay?: boolean;
    microphoneId?: string;
    
    // Notifications Configuration
    notifyPrivate?: boolean;
    notifyGroups?: boolean;
    notifyChannels?: boolean;
    notifyStories?: boolean;
    notifyReactions?: 'messages' | 'stories' | 'none';
    notifyCalls?: boolean;
    vibrationMode?: 'default' | 'short' | 'long' | 'disabled';
    ringtoneSelection?: 'standard' | 'cyber' | 'cosmic' | 'playful' | 'none';
    showUnreadCounts?: boolean;
    includeMutedInCounts?: boolean;
    countMessagesOrChats?: 'messages' | 'chats';
    inAppSound?: boolean;
    inAppVibe?: boolean;
    inAppPreviewText?: boolean;
    inAppChatSound?: boolean;
    inAppPopupsEnabled?: boolean;
    notifyContactJoinedMsg?: boolean;
    notifyPinnedMsg?: boolean;
    notifyOtherMsg?: boolean;
    restartOnClose?: boolean;
    keepAliveBackground?: boolean;
    retryNotificationsRelay?: boolean;
  };
  profileChangeHistory?: { field: string; oldValue: string; newValue: string; timestamp: number }[];
  activeSessions?: ActiveSession[];
}

export interface ActiveSession {
  id: string;
  deviceName: string;
  lastActive: number;
}

export interface ChatFolder {
  id: string;
  name: string;
  icon: string;
  chatIds: string[];
  rules?: ('direct' | 'group' | 'channel' | 'unread' | 'work' | 'friends')[];
}

export type ChatType = 'direct' | 'group' | 'channel' | 'public';

export interface Chat {
  id: string;
  type: ChatType;
  title: string;
  photoURL: string;
  members: string[]; // user uids
  admins: string[]; // admin uids
  creatorId: string;
  createdAt: number;
  updatedAt: number;
  pinnedIds?: string[]; // uids who pinned
  archivedIds?: string[]; // uids who archived
  muteIds?: string[]; // uids who muted
  unreadCounts?: { [userId: string]: number };
  lastMessage?: {
    id?: string;
    text: string;
    senderId: string;
    senderName: string;
    timestamp: number;
    status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  };
  rules?: string;
  welcomeMessage?: string;
  typing?: { [userId: string]: number }; // map of userId to last typing timestamp
  drafts?: { [userId: string]: string }; // map of userId to draft text
  editingDrafts?: { [userId: string]: { messageId: string; text: string } }; // map of userId to active edit message draft
  pinnedMessageId?: string; // pinned message per chat
  pinnedMessageIds?: string[]; // support for multiple pinned messages
  topics?: Topic[]; // topic-based forum mode
  linkedChatId?: string; // forum group linked to channel for comment sections
  slowModeSeconds?: number;
  isBot?: boolean;
  isPublic?: boolean; // public queryable status
  username?: string; // public @username tag
  description?: string; // chat bio/info description
  inviteLink?: string; // group invitation link URL
  bannedIds?: string[]; // banned user uids
  mutedIds?: string[]; // muted user uids
  restrictedIds?: string[]; // restricted user uids (read only, etc.)
  mutedUntil?: { [userId: string]: number }; // timed mutes map of userId -> timestamp ms
  moderatorIds?: string[]; // moderator user uids
  adminActionsHistory?: AdminAction[]; // history log of admin actions
  views?: { [messageId: string]: string[] }; // messageId -> user uids who viewed it
}

export interface CustomInviteLink {
  id: string; // The invite link code
  chatId: string;
  chatTitle: string;
  creatorId: string;
  creatorName: string;
  createdAt: number;
  expiresAt: number | null; // expiration epoch timestamp ms or null
  usageLimit: number | null; // max number of entrants
  usageCount: number; // current entrant count
  isRevoked: boolean;
}

export interface JoinRequest {
  id: string; // generated unique id
  userId: string;
  userDisplayName: string;
  userPhotoURL: string;
  chatId: string;
  chatTitle: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  createdAt: number;
}

export interface AdminAction {
  id: string;
  adminId: string;
  adminName: string;
  action: 'ban' | 'unban' | 'mute' | 'unmute' | 'promote' | 'demote' | 'kick' | 'pin' | 'unpin';
  targetId: string;
  targetName: string;
  timestamp: number;
}

export interface Topic {
  id: string;
  name: string;
  createdAt: number;
  creatorId: string;
  closed?: boolean;
  icon?: string;
  pinnedMessageId?: string;
}

export interface PollOption {
  text: string;
  votes: string[]; // user uids
}

export interface PollPayload {
  question: string;
  options: PollOption[];
  isAnonymous: boolean;
  isMultiple: boolean;
  isQuiz?: boolean;
  correctOptionIndex?: number;
  closed?: boolean;
  expiresAt?: number;
}

export interface EditHistoryEntry {
  text: string;
  updatedAt: number;
}

export type MessageType = 'text' | 'image' | 'video' | 'voice' | 'file' | 'sticker' | 'poll';

export interface ReplyToPayload {
  messageId: string;
  text: string;
  senderName: string;
}

export interface ForwardFromPayload {
  senderId: string;
  senderName: string;
  id?: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderPhotoURL: string;
  text: string;
  type: MessageType;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  duration?: number; // voice note duration in seconds
  createdAt: number;
  updatedAt: number;
  replyTo?: ReplyToPayload;
  forwardFrom?: ForwardFromPayload;
  reactions?: { [userId: string]: string }; // userId -> reactionEmoji
  readBy?: string[]; // array of uids who read this message
  localId?: string; // used for offline optimistic UI identification
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  silent?: boolean;
  scheduledAt?: number; // timestamp to release message
  reminderAt?: number; // reminder alarm timestamp
  editHistory?: EditHistoryEntry[];
  poll?: PollPayload;
  topicId?: string; // topic in forum mode
}

export type CallStatus = 'ringing' | 'connected' | 'rejected' | 'ended' | 'missed';
export type CallType = 'voice' | 'video';

export interface CallSession {
  id: string;
  callerId: string;
  callerName: string;
  callerPhotoURL: string;
  receiverId: string;
  receiverName?: string;
  receiverPhotoURL?: string;
  status: CallStatus;
  type: CallType;
  createdAt: number;
  endedAt?: number;
  signal_offer?: string; // SDP string
  signal_answer?: string; // SDP string
}

export interface Story {
  id: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  createdAt: number;
  expiresAt: number;
  views: string[]; // user uids who viewed
  reactions?: { [userId: string]: string }; // user uid -> reactionEmoji
}

export interface ReportItem {
  id: string;
  reporterId: string;
  reportedUserId: string;
  chatId?: string;
  messageId?: string;
  reason: string;
  createdAt: number;
}
