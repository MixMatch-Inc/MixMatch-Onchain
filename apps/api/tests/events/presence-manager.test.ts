// Tests for presence manager
import { test } from 'node:test';
import assert from 'node:assert';
import { PresenceManager } from '../../src/domains/events/presence-manager';

test('PresenceManager - should set user online', () => {
  const manager = new PresenceManager();
  manager.setUserOnline('user1', 'session1');

  const presence = manager.getUserPresence('user1');
  assert.ok(presence);
  assert.strictEqual(presence?.status, 'online');
  assert.strictEqual(presence?.sessionIds.length, 1);
  manager.clear();
});

test('PresenceManager - should handle multiple sessions', () => {
  const manager = new PresenceManager();
  manager.setUserOnline('user1', 'session1');
  manager.setUserOnline('user1', 'session2');

  const presence = manager.getUserPresence('user1');
  assert.ok(presence);
  assert.strictEqual(presence?.sessionIds.length, 2);
  assert.ok(presence?.sessionIds.includes('session1'));
  assert.ok(presence?.sessionIds.includes('session2'));
  manager.clear();
});

test('PresenceManager - should set user offline when all sessions disconnected', () => {
  const manager = new PresenceManager();
  manager.setUserOnline('user1', 'session1');
  manager.setUserOffline('user1', 'session1');

  const presence = manager.getUserPresence('user1');
  assert.ok(presence);
  assert.strictEqual(presence?.status, 'offline');
  assert.strictEqual(presence?.sessionIds.length, 0);
  manager.clear();
});

test('PresenceManager - should keep user online when other sessions exist', () => {
  const manager = new PresenceManager();
  manager.setUserOnline('user1', 'session1');
  manager.setUserOnline('user1', 'session2');
  manager.setUserOffline('user1', 'session1');

  const presence = manager.getUserPresence('user1');
  assert.ok(presence);
  assert.strictEqual(presence?.status, 'online');
  assert.strictEqual(presence?.sessionIds.length, 1);
  manager.clear();
});

test('PresenceManager - should check if user is online', () => {
  const manager = new PresenceManager();
  
  assert.strictEqual(manager.isUserOnline('user1'), false);
  
  manager.setUserOnline('user1', 'session1');
  assert.strictEqual(manager.isUserOnline('user1'), true);
  
  manager.setUserOffline('user1', 'session1');
  assert.strictEqual(manager.isUserOnline('user1'), false);
  
  manager.clear();
});

test('PresenceManager - should get online users', () => {
  const manager = new PresenceManager();
  
  manager.setUserOnline('user1', 'session1');
  manager.setUserOnline('user2', 'session2');
  manager.setUserOnline('user3', 'session3');
  manager.setUserOffline('user3', 'session3');

  const onlineUsers = manager.getOnlineUsers();
  assert.strictEqual(onlineUsers.length, 2);
  
  const userIds = onlineUsers.map(u => u.userId);
  assert.ok(userIds.includes('user1'));
  assert.ok(userIds.includes('user2'));
  assert.ok(!userIds.includes('user3'));
  
  manager.clear();
});

test('PresenceManager - should handle heartbeat', () => {
  const manager = new PresenceManager();
  manager.setUserOnline('user1', 'session1');
  
  // Simulate heartbeat
  manager.handleHeartbeat('user1', 'session1');
  
  const presence = manager.getUserPresence('user1');
  assert.ok(presence);
  assert.ok(presence.lastSeen);
  manager.clear();
});

test('PresenceManager - should track user count', () => {
  const manager = new PresenceManager();
  
  assert.strictEqual(manager.getUserCount(), 0);
  
  manager.setUserOnline('user1', 'session1');
  manager.setUserOnline('user2', 'session2');
  
  assert.strictEqual(manager.getUserCount(), 2);
  
  manager.clear();
});
