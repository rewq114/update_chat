// platform/electron/repositories/FileChatRepository.ts
import * as fs from 'fs'
import * as path from 'path'
import { ChatRepository } from '../../../core/repositories/ChatRepository'
import { ChatSession, ChatData } from '../../../core/entities/ChatMessage'
import { FileMigrationManager } from '../migration/FileMigrationManager'
import { Logger } from '../../../core/logging/Logger'

export class FileChatRepository implements ChatRepository {
  private appDataDir: string
  private sessionsFile: string
  private chatsDir: string
  private migrationManager: FileMigrationManager
  private logger: Logger

  constructor(appDataDir: string, logger?: Logger) {
    this.appDataDir = appDataDir
    this.sessionsFile = path.join(appDataDir, 'chat-sessions.json')
    this.chatsDir = path.join(appDataDir, 'chats')
    this.migrationManager = new FileMigrationManager(appDataDir)
    this.logger =
      logger ||
      new Logger({
        level: 1, // INFO
        enableConsole: true,
        enableFile: false,
        logDir: '',
        maxFileSize: 10,
        maxFiles: 5
      })

    this.ensureDirectories()
    this.runMigrationIfNeeded()
  }

  private ensureDirectories(): void {
    try {
      if (!fs.existsSync(this.appDataDir)) {
        fs.mkdirSync(this.appDataDir, { recursive: true })
        this.logger.database('write', 'directory', { path: this.appDataDir, action: 'create' })
      }
      if (!fs.existsSync(this.chatsDir)) {
        fs.mkdirSync(this.chatsDir, { recursive: true })
        this.logger.database('write', 'directory', { path: this.chatsDir, action: 'create' })
      }
    } catch (error) {
      this.logger.error('DATABASE', 'Failed to ensure directories', error as Error, {
        appDataDir: this.appDataDir,
        chatsDir: this.chatsDir
      })
      throw error
    }
  }

  private async runMigrationIfNeeded(): Promise<void> {
    try {
      const status = this.migrationManager.getMigrationStatus()

      if (status.needsMigration) {
        this.logger.info('MIGRATION', `Migration needed: ${status.legacyFileCount} chats found`, {
          status
        })

        const result = await this.migrationManager.migrate()

        if (result.success) {
          this.logger.info(
            'MIGRATION',
            `Migration successful: ${result.migratedCount} chats migrated`,
            { migratedCount: result.migratedCount }
          )
        } else {
          this.logger.error(
            'MIGRATION',
            'Migration failed',
            new Error(result.error || 'Unknown error'),
            { error: result.error }
          )
        }
      } else {
        this.logger.debug('MIGRATION', 'No migration needed')
      }
    } catch (error) {
      this.logger.error('MIGRATION', 'Migration check failed', error as Error)
    }
  }

  // 세션 관리
  async getSessions(): Promise<ChatSession[]> {
    try {
      if (!fs.existsSync(this.sessionsFile)) {
        this.logger.debug('DATABASE', 'read sessions', { file: this.sessionsFile, result: 'empty' })
        return []
      }
      const data = fs.readFileSync(this.sessionsFile, 'utf8')
      const sessions = JSON.parse(data)
      this.logger.database('read', 'sessions', { file: this.sessionsFile, count: sessions.length })
      return sessions
    } catch (error) {
      this.logger.error('DATABASE', 'Chat sessions read failed', error as Error, {
        file: this.sessionsFile
      })
      return []
    }
  }

  async getSession(sessionId: string): Promise<ChatSession | null> {
    try {
      const sessions = await this.getSessions()
      const session = sessions.find((session) => session.id === sessionId) || null
      this.logger.database('read', 'session', { sessionId, found: !!session })
      return session
    } catch (error) {
      this.logger.error('DATABASE', 'Get session failed', error as Error, { sessionId })
      return null
    }
  }

  async saveSession(session: ChatSession): Promise<void> {
    try {
      const sessions = await this.getSessions()
      const existingIndex = sessions.findIndex((s) => s.id === session.id)

      if (existingIndex !== -1) {
        sessions[existingIndex] = session
        this.logger.database('write', 'session', { sessionId: session.id, action: 'update' })
      } else {
        sessions.push(session)
        this.logger.database('write', 'session', { sessionId: session.id, action: 'create' })
      }

      // 파일을 쓰기 전에 디렉토리가 존재하는지 확인
      const sessionsDir = path.dirname(this.sessionsFile)
      if (!fs.existsSync(sessionsDir)) {
        fs.mkdirSync(sessionsDir, { recursive: true })
      }
      fs.writeFileSync(this.sessionsFile, JSON.stringify(sessions, null, 2))
      this.logger.info('DATABASE', 'Session saved successfully', {
        sessionId: session.id,
        totalSessions: sessions.length
      })
    } catch (error) {
      this.logger.error('DATABASE', 'Chat session save failed', error as Error, {
        sessionId: session.id,
        file: this.sessionsFile
      })
      throw error
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      // 세션 목록에서 제거
      const sessions = await this.getSessions()
      const updatedSessions = sessions.filter((session) => session.id !== sessionId)

      // 파일을 쓰기 전에 디렉토리가 존재하는지 확인
      const sessionsDir = path.dirname(this.sessionsFile)
      if (!fs.existsSync(sessionsDir)) {
        fs.mkdirSync(sessionsDir, { recursive: true })
      }
      fs.writeFileSync(this.sessionsFile, JSON.stringify(updatedSessions, null, 2))

      // 채팅 데이터 파일 삭제
      await this.deleteChatData(sessionId)

      this.logger.database('delete', 'session', {
        sessionId,
        remainingSessions: updatedSessions.length
      })
      this.logger.info('DATABASE', 'Session deleted successfully', { sessionId })
    } catch (error) {
      this.logger.error('DATABASE', 'Chat session delete failed', error as Error, { sessionId })
      throw error
    }
  }

  async updateSessionTitle(sessionId: string, newTitle: string): Promise<void> {
    try {
      const sessions = await this.getSessions()
      const sessionIndex = sessions.findIndex((session) => session.id === sessionId)

      if (sessionIndex !== -1) {
        const oldTitle = sessions[sessionIndex].title
        sessions[sessionIndex].title = newTitle
        sessions[sessionIndex].updatedAt = Date.now()

        // 파일을 쓰기 전에 디렉토리가 존재하는지 확인
        const sessionsDir = path.dirname(this.sessionsFile)
        if (!fs.existsSync(sessionsDir)) {
          fs.mkdirSync(sessionsDir, { recursive: true })
        }
        fs.writeFileSync(this.sessionsFile, JSON.stringify(sessions, null, 2))

        this.logger.database('write', 'session_title', { sessionId, oldTitle, newTitle })
        this.logger.info('DATABASE', 'Session title updated', { sessionId, oldTitle, newTitle })
      } else {
        this.logger.warn('DATABASE', 'Session not found for title update', { sessionId, newTitle })
      }
    } catch (error) {
      this.logger.error('DATABASE', 'Chat session rename failed', error as Error, {
        sessionId,
        newTitle
      })
      throw error
    }
  }

  // 채팅 데이터 관리
  async getChatData(sessionId: string): Promise<ChatData | null> {
    try {
      const chatFile = path.join(this.chatsDir, `${sessionId}.json`)
      if (!fs.existsSync(chatFile)) {
        this.logger.debug('DATABASE', 'read chat_data', {
          sessionId,
          file: chatFile,
          result: 'not_found'
        })
        return null
      }
      const data = fs.readFileSync(chatFile, 'utf8')
      const chatData = JSON.parse(data)
      this.logger.database('read', 'chat_data', {
        sessionId,
        file: chatFile,
        messageCount: chatData.messages?.length || 0
      })
      return chatData
    } catch (error) {
      this.logger.error('DATABASE', 'Chat data read failed', error as Error, {
        sessionId,
        file: path.join(this.chatsDir, `${sessionId}.json`)
      })
      return null
    }
  }

  async saveChatData(chatData: ChatData): Promise<void> {
    try {
      const chatFile = path.join(this.chatsDir, `${chatData.sessionId}.json`)

      // 파일을 쓰기 전에 디렉토리가 존재하는지 확인
      const chatDir = path.dirname(chatFile)
      if (!fs.existsSync(chatDir)) {
        fs.mkdirSync(chatDir, { recursive: true })
      }

      fs.writeFileSync(chatFile, JSON.stringify(chatData, null, 2))

      this.logger.database('write', 'chat_data', {
        sessionId: chatData.sessionId,
        file: chatFile,
        messageCount: chatData.messages?.length || 0
      })
      this.logger.info('DATABASE', 'Chat data saved successfully', {
        sessionId: chatData.sessionId,
        messageCount: chatData.messages?.length || 0
      })
    } catch (error) {
      this.logger.error('DATABASE', 'Chat data save failed', error as Error, {
        sessionId: chatData.sessionId,
        file: path.join(this.chatsDir, `${chatData.sessionId}.json`)
      })
      throw error
    }
  }

  async deleteChatData(sessionId: string): Promise<void> {
    try {
      const chatFile = path.join(this.chatsDir, `${sessionId}.json`)
      if (fs.existsSync(chatFile)) {
        fs.unlinkSync(chatFile)
        this.logger.database('delete', 'chat_data', { sessionId, file: chatFile })
        this.logger.info('DATABASE', 'Chat data deleted successfully', { sessionId })
      } else {
        this.logger.debug('DATABASE', 'Chat data file not found for deletion', {
          sessionId,
          file: chatFile
        })
      }
    } catch (error) {
      this.logger.error('DATABASE', 'Chat data delete failed', error as Error, {
        sessionId,
        file: path.join(this.chatsDir, `${sessionId}.json`)
      })
      throw error
    }
  }

  // 마이그레이션
  async needsMigration(): Promise<boolean> {
    const needs = this.migrationManager.needsMigration()
    this.logger.debug('MIGRATION', 'Migration check', { needsMigration: needs })
    return needs
  }

  async migrate(): Promise<{ success: boolean; migratedCount: number; error?: string }> {
    this.logger.info('MIGRATION', 'Starting migration process')
    const result = await this.migrationManager.migrate()

    if (result.success) {
      this.logger.info('MIGRATION', 'Migration completed successfully', {
        migratedCount: result.migratedCount
      })
    } else {
      this.logger.error(
        'MIGRATION',
        'Migration failed',
        new Error(result.error || 'Unknown error'),
        { error: result.error }
      )
    }

    return result
  }

  async getMigrationStatus() {
    const status = this.migrationManager.getMigrationStatus()
    this.logger.debug('MIGRATION', 'Migration status check', { status })
    return status
  }
}
