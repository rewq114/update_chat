// core/logging/LogAnalyzer.ts
import * as fs from 'fs';
import * as path from 'path';
import { LogLevel } from './Logger';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  details?: Record<string, unknown>;
  error?: string;
}

export interface LogAnalysis {
  summary: {
    totalEntries: number;
    entriesByLevel: Record<string, number>;
    entriesByCategory: Record<string, number>;
    timeRange: {
      start: string;
      end: string;
      duration: number; // minutes
    };
  };
  patterns: {
    frequentErrors: Array<{ error: string; count: number; percentage: number }>;
    slowOperations: Array<{ operation: string; avgDuration: number; count: number }>;
    categoryTrends: Array<{ category: string; trend: 'increasing' | 'decreasing' | 'stable'; change: number }>;
  };
  alerts: Array<{
    type: 'error_spike' | 'performance_degradation' | 'unusual_activity';
    message: string;
    severity: 'low' | 'medium' | 'high';
    timestamp: string;
    details: Record<string, unknown>;
  }>;
  recommendations: Array<{
    type: 'performance' | 'error_handling' | 'monitoring' | 'configuration';
    priority: 'low' | 'medium' | 'high';
    message: string;
    action: string;
  }>;
}

export interface LogFilter {
  startTime?: Date;
  endTime?: Date;
  levels?: LogLevel[];
  categories?: string[];
  searchTerm?: string;
}

export class LogAnalyzer {
  private logDir: string;
  private logFiles: string[] = [];

  constructor(logDir: string) {
    this.logDir = logDir;
    this.refreshLogFiles();
  }

  /**
   * 로그 파일 목록 새로고침
   */
  refreshLogFiles(): void {
    try {
      this.logFiles = fs.readdirSync(this.logDir)
        .filter(file => file.endsWith('.log'))
        .map(file => path.join(this.logDir, file))
        .sort();
    } catch (error) {
      console.error('Failed to refresh log files:', error);
      this.logFiles = [];
    }
  }

  /**
   * 로그 파일에서 엔트리 읽기
   */
  private readLogEntries(logFile: string): LogEntry[] {
    try {
      const content = fs.readFileSync(logFile, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      return lines.map(line => this.parseLogLine(line)).filter(entry => entry !== null) as LogEntry[];
    } catch (error) {
      console.error(`Failed to read log file ${logFile}:`, error);
      return [];
    }
  }

  /**
   * 로그 라인 파싱
   */
  private parseLogLine(line: string): LogEntry | null {
    try {
      // [2024-01-01T12:00:00.000Z] INFO  [CHAT_SERVICE] Message sent | Details: {...}
      const regex = /\[([^\]]+)\] (\w+)\s+\[([^\]]+)\]\s+(.+?)(?:\s+\|\s+Details:\s+(.+))?$/;
      const match = line.match(regex);
      
      if (!match) {
        return null;
      }

      const [, timestamp, levelStr, category, message, detailsStr] = match;
      
      let details: Record<string, unknown> | undefined;
      if (detailsStr) {
        try {
          details = JSON.parse(detailsStr);
        } catch {
          // JSON 파싱 실패 시 무시
        }
      }

      return {
        timestamp,
        level: this.parseLogLevel(levelStr),
        category,
        message,
        details
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 로그 레벨 파싱
   */
  private parseLogLevel(levelStr: string): LogLevel {
    switch (levelStr.toUpperCase()) {
      case 'DEBUG': return LogLevel.DEBUG;
      case 'INFO': return LogLevel.INFO;
      case 'WARN': return LogLevel.WARN;
      case 'ERROR': return LogLevel.ERROR;
      case 'FATAL': return LogLevel.FATAL;
      default: return LogLevel.INFO;
    }
  }

  /**
   * 필터링된 로그 엔트리 조회
   */
  getLogEntries(filter?: LogFilter): LogEntry[] {
    this.refreshLogFiles();
    
    let allEntries: LogEntry[] = [];
    
    for (const logFile of this.logFiles) {
      const entries = this.readLogEntries(logFile);
      allEntries = allEntries.concat(entries);
    }

    // 시간순 정렬
    allEntries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // 필터 적용
    if (filter) {
      allEntries = this.applyFilter(allEntries, filter);
    }

    return allEntries;
  }

  /**
   * 필터 적용
   */
  private applyFilter(entries: LogEntry[], filter: LogFilter): LogEntry[] {
    return entries.filter(entry => {
      const entryTime = new Date(entry.timestamp);
      
      // 시간 필터
      if (filter.startTime && entryTime < filter.startTime) {
        return false;
      }
      if (filter.endTime && entryTime > filter.endTime) {
        return false;
      }
      
      // 레벨 필터
      if (filter.levels && !filter.levels.includes(entry.level)) {
        return false;
      }
      
      // 카테고리 필터
      if (filter.categories && !filter.categories.includes(entry.category)) {
        return false;
      }
      
      // 검색어 필터
      if (filter.searchTerm) {
        const searchLower = filter.searchTerm.toLowerCase();
        const messageLower = entry.message.toLowerCase();
        const categoryLower = entry.category.toLowerCase();
        
        if (!messageLower.includes(searchLower) && !categoryLower.includes(searchLower)) {
          return false;
        }
      }
      
      return true;
    });
  }

  /**
   * 로그 분석 수행
   */
  analyzeLogs(filter?: LogFilter): LogAnalysis {
    const entries = this.getLogEntries(filter);
    
    if (entries.length === 0) {
      return this.createEmptyAnalysis();
    }

    const summary = this.createSummary(entries);
    const patterns = this.analyzePatterns(entries);
    const alerts = this.generateAlerts(entries, summary);
    const recommendations = this.generateRecommendations(entries, patterns, alerts);

    return {
      summary,
      patterns,
      alerts,
      recommendations
    };
  }

  /**
   * 빈 분석 결과 생성
   */
  private createEmptyAnalysis(): LogAnalysis {
    return {
      summary: {
        totalEntries: 0,
        entriesByLevel: {},
        entriesByCategory: {},
        timeRange: {
          start: '',
          end: '',
          duration: 0
        }
      },
      patterns: {
        frequentErrors: [],
        slowOperations: [],
        categoryTrends: []
      },
      alerts: [],
      recommendations: []
    };
  }

  /**
   * 요약 정보 생성
   */
  private createSummary(entries: LogEntry[]): LogAnalysis['summary'] {
    const entriesByLevel: Record<string, number> = {};
    const entriesByCategory: Record<string, number> = {};
    
    for (const entry of entries) {
      const levelName = LogLevel[entry.level];
      entriesByLevel[levelName] = (entriesByLevel[levelName] || 0) + 1;
      entriesByCategory[entry.category] = (entriesByCategory[entry.category] || 0) + 1;
    }

    const timestamps = entries.map(e => new Date(e.timestamp).getTime());
    const startTime = new Date(Math.min(...timestamps));
    const endTime = new Date(Math.max(...timestamps));
    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // minutes

    return {
      totalEntries: entries.length,
      entriesByLevel,
      entriesByCategory,
      timeRange: {
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        duration
      }
    };
  }

  /**
   * 패턴 분석
   */
  private analyzePatterns(entries: LogEntry[]): LogAnalysis['patterns'] {
    // 에러 패턴 분석
    const errorMessages = entries
      .filter(e => e.level >= LogLevel.ERROR)
      .map(e => e.message);
    
    const errorCounts = new Map<string, number>();
    for (const message of errorMessages) {
      errorCounts.set(message, (errorCounts.get(message) || 0) + 1);
    }

    const frequentErrors = Array.from(errorCounts.entries())
      .map(([error, count]) => ({
        error,
        count,
        percentage: (count / errorMessages.length) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 성능 패턴 분석
    const performanceEntries = entries.filter(e => 
      e.category === 'PERFORMANCE' && e.details?.duration
    );

    const operationDurations = new Map<string, { total: number; count: number }>();
    for (const entry of performanceEntries) {
      const operation = entry.message.split(' ')[0]; // 첫 번째 단어를 작업명으로 가정
      const duration = entry.details?.duration as number;
      
      const existing = operationDurations.get(operation) || { total: 0, count: 0 };
      existing.total += duration;
      existing.count += 1;
      operationDurations.set(operation, existing);
    }

    const slowOperations = Array.from(operationDurations.entries())
      .map(([operation, { total, count }]) => ({
        operation,
        avgDuration: total / count,
        count
      }))
      .filter(op => op.avgDuration > 1000) // 1초 이상
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 5);

    // 카테고리 트렌드 분석
    const categoryTrends = this.analyzeCategoryTrends(entries);

    return {
      frequentErrors,
      slowOperations,
      categoryTrends
    };
  }

  /**
   * 카테고리 트렌드 분석
   */
  private analyzeCategoryTrends(entries: LogEntry[]): LogAnalysis['patterns']['categoryTrends'] {
    const categoryCounts = new Map<string, number>();
    
    for (const entry of entries) {
      categoryCounts.set(entry.category, (categoryCounts.get(entry.category) || 0) + 1);
    }

    // 간단한 트렌드 분석 (실제로는 시간대별 분석이 필요)
    return Array.from(categoryCounts.entries())
      .map(([category, count]) => ({
        category,
        trend: 'stable' as const,
        change: 0
      }))
      .slice(0, 10);
  }

  /**
   * 알림 생성
   */
  private generateAlerts(entries: LogEntry[], summary: LogAnalysis['summary']): LogAnalysis['alerts'] {
    const alerts: LogAnalysis['alerts'] = [];

    // 에러 스파이크 감지
    const errorEntries = entries.filter(e => e.level >= LogLevel.ERROR);
    const errorRate = (errorEntries.length / summary.totalEntries) * 100;
    
    if (errorRate > 10) {
      alerts.push({
        type: 'error_spike',
        message: `높은 에러율 감지: ${errorRate.toFixed(1)}%`,
        severity: errorRate > 20 ? 'high' : 'medium',
        timestamp: new Date().toISOString(),
        details: { errorRate, totalErrors: errorEntries.length }
      });
    }

    // 성능 저하 감지
    const performanceEntries = entries.filter(e => 
      e.category === 'PERFORMANCE' && e.details?.duration
    );
    
    if (performanceEntries.length > 0) {
      const avgDuration = performanceEntries.reduce((sum, e) => 
        sum + (e.details?.duration as number), 0
      ) / performanceEntries.length;
      
      if (avgDuration > 5000) {
        alerts.push({
          type: 'performance_degradation',
          message: `성능 저하 감지: 평균 응답시간 ${avgDuration.toFixed(0)}ms`,
          severity: avgDuration > 10000 ? 'high' : 'medium',
          timestamp: new Date().toISOString(),
          details: { avgDuration, operationCount: performanceEntries.length }
        });
      }
    }

    return alerts;
  }

  /**
   * 권장사항 생성
   */
  private generateRecommendations(
    entries: LogEntry[], 
    patterns: LogAnalysis['patterns'], 
    alerts: LogAnalysis['alerts']
  ): LogAnalysis['recommendations'] {
    const recommendations: LogAnalysis['recommendations'] = [];

    // 에러 처리 권장사항
    if (patterns.frequentErrors.length > 0) {
      recommendations.push({
        type: 'error_handling',
        priority: 'high',
        message: '자주 발생하는 에러에 대한 예외 처리 강화 필요',
        action: '에러 핸들링 로직을 검토하고 개선하세요.'
      });
    }

    // 성능 권장사항
    if (patterns.slowOperations.length > 0) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: '느린 작업 최적화 필요',
        action: '성능 병목 지점을 분석하고 최적화하세요.'
      });
    }

    // 모니터링 권장사항
    if (alerts.length > 0) {
      recommendations.push({
        type: 'monitoring',
        priority: 'medium',
        message: '실시간 모니터링 강화 필요',
        action: '자동 알림 시스템을 구축하세요.'
      });
    }

    return recommendations;
  }

  /**
   * 실시간 로그 모니터링
   */
  startRealTimeMonitoring(callback: (analysis: LogAnalysis) => void, intervalMs: number = 60000): NodeJS.Timeout {
    return setInterval(() => {
      const analysis = this.analyzeLogs();
      callback(analysis);
    }, intervalMs);
  }

  /**
   * 로그 통계 내보내기
   */
  exportAnalysis(analysis: LogAnalysis, format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(analysis, null, 2);
    } else {
      // CSV 형식으로 내보내기 (간단한 구현)
      const lines = [
        'Type,Value,Count',
        `Total Entries,,${analysis.summary.totalEntries}`,
        `Time Range,${analysis.summary.timeRange.start} to ${analysis.summary.timeRange.end},${analysis.summary.timeRange.duration} minutes`
      ];
      
      return lines.join('\n');
    }
  }

  /**
   * 로그 파일 크기 정보
   */
  getLogFileInfo(): Array<{ filename: string; size: number; lastModified: Date }> {
    return this.logFiles.map(file => {
      const stats = fs.statSync(file);
      return {
        filename: path.basename(file),
        size: stats.size,
        lastModified: stats.mtime
      };
    });
  }

  /**
   * 오래된 로그 파일 정리
   */
  cleanupOldLogs(maxAgeDays: number = 30): number {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - maxAgeDays);
    
    let cleanedCount = 0;
    
    for (const logFile of this.logFiles) {
      const stats = fs.statSync(logFile);
      if (stats.mtime < cutoff) {
        try {
          fs.unlinkSync(logFile);
          cleanedCount++;
        } catch (error) {
          console.error(`Failed to delete old log file ${logFile}:`, error);
        }
      }
    }
    
    return cleanedCount;
  }
}
