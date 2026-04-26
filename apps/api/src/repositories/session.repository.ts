import Session, { ISessionDocument, SessionStatus } from '../domains/identity/session.model';

export interface ISessionRepository {
  createSession(
    userId: string,
    expiresAt: Date,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<ISessionDocument>;
  findSessionById(sessionId: string, userId: string): Promise<ISessionDocument | null>;
  revokeSession(sessionId: string, userId: string): Promise<boolean>;
  revokeAllUserSessions(userId: string): Promise<number>;
}

export class MongooseSessionRepository implements ISessionRepository {
  async createSession(
    userId: string,
    expiresAt: Date,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<ISessionDocument> {
    const session = new Session({
      userId,
      expiresAt,
      deviceInfo,
      ipAddress,
      status: SessionStatus.ACTIVE,
    });
    return session.save();
  }

  async findSessionById(sessionId: string, userId: string): Promise<ISessionDocument | null> {
    return Session.findOne({ sessionId, userId, status: SessionStatus.ACTIVE }).exec();
  }

  async revokeSession(sessionId: string, userId: string): Promise<boolean> {
    const result = await Session.updateOne(
      { sessionId, userId, status: SessionStatus.ACTIVE },
      { 
        $set: { 
          status: SessionStatus.REVOKED,
          revokedAt: new Date()
        } 
      }
    ).exec();
    return result.modifiedCount > 0;
  }

  async revokeAllUserSessions(userId: string): Promise<number> {
    const result = await Session.updateMany(
      { userId, status: SessionStatus.ACTIVE },
      { 
        $set: { 
          status: SessionStatus.REVOKED,
          revokedAt: new Date()
        } 
      }
    ).exec();
    return result.modifiedCount;
  }
}
