# Update Chat - Electron 기반 AI 채팅 애플리케이션

업데이트된 AI 채팅 애플리케이션으로, 강력한 로깅, 에러 처리, 성능 모니터링, 그리고 MCP(Model Context Protocol) 지원을 제공합니다.

## 📊 **현재 개발 진행 상황**

### Backend: 95% 완료 ✅

- ✅ 로깅 시스템 구현
- ✅ 에러 처리 강화
- ✅ 성능 모니터링 추가
- ✅ 시스템 모니터링 구현
- ✅ Repository/UseCase 패턴 적용
- ✅ MCP 클라이언트 구현 (STDIO, WebSocket, HTTP)
- ✅ MCP와 Chat API 통합 완료
- ✅ 도구 호출 처리 로직 구현
- 🔄 **남은 작업**: 실제 API 키를 통한 통합 테스트

### Frontend: 30% 완료 🔄

- ✅ 기본 채팅 UI 구현
- ✅ 설정 모달 (API 키, 테마, 모델)
- 🔄 **필요한 작업**: MCP 설정 UI, 도구 호출 UI, 성능 대시보드

## 🚀 주요 기능

### 🤖 AI 채팅

- **Claude API 통합**: Anthropic의 Claude 모델 지원
- **스트리밍 응답**: 실시간 채팅 응답
- **도구 사용**: MCP를 통한 외부 도구 호출 (✅ 구현 완료)
- **대화 기록**: 채팅 세션 관리 및 저장

### 🔧 MCP (Model Context Protocol) 지원

- **다중 연결 타입**: STDIO, WebSocket, HTTP 연결 지원 (✅ 구현 완료)
- **실시간 도구 호출**: LLM 응답에 따른 동적 도구 사용 (✅ 구현 완료)
- **헬스 체킹**: MCP 서버 상태 모니터링 (✅ 구현 완료)
- **자동 재연결**: 연결 끊김 시 자동 복구 (✅ 구현 완료)
- **도구 변환**: MCP ↔ h-chat SDK 도구 형식 변환 (✅ 구현 완료)

### 📊 시스템 모니터링

- **성능 모니터링**: 작업별 성능 측정 및 분석 (✅ 구현 완료)
- **시스템 메트릭**: CPU, 메모리, 업타임 모니터링 (✅ 구현 완료)
- **실시간 알림**: 성능 저하 및 에러 알림 (✅ 구현 완료)
- **자동 정리**: 메모리 및 로그 자동 정리 (✅ 구현 완료)

### 🛡️ 강력한 에러 처리

- **카테고리별 에러 처리**: 시스템, 네트워크, 데이터베이스 등 (✅ 구현 완료)
- **자동 재시도**: 지수 백오프를 통한 스마트 재시도 (✅ 구현 완료)
- **복구 전략**: 에러 상황별 차별화된 복구 로직 (✅ 구현 완료)
- **사용자 친화적 메시지**: 기술적 에러를 사용자 언어로 변환 (✅ 구현 완료)

### 📝 고급 로깅 시스템

- **구조화된 로깅**: JSON 형태의 상세 로그 (✅ 구현 완료)
- **파일 로테이션**: 자동 로그 파일 관리 (✅ 구현 완료)
- **레벨별 필터링**: DEBUG, INFO, WARN, ERROR, FATAL (✅ 구현 완료)
- **카테고리별 분류**: 시스템, 네트워크, 데이터베이스 등 (✅ 구현 완료)

## 🏗️ 아키텍처

### 핵심 컴포넌트

```
src/
├── core/                    # 핵심 시스템 (✅ 완료)
│   ├── logging/            # 로깅 시스템
│   ├── error/              # 에러 처리
│   ├── monitoring/         # 성능 모니터링
│   ├── system/             # 시스템 초기화
│   ├── entities/           # 도메인 엔티티
│   ├── repositories/       # 데이터 접근 계층
│   ├── services/           # 비즈니스 로직
│   └── useCases/           # 유스케이스
├── main/                   # Electron 메인 프로세스 (✅ 완료)
├── renderer/               # 프론트엔드 (React) (🔄 진행중)
├── preload/                # IPC 브리지 (✅ 완료)
├── platform/               # 플랫폼별 구현 (✅ 완료)
│   └── electron/           # Electron 플랫폼
└── services/               # 외부 서비스 (✅ 완료)
    ├── LLM/                # LLM 서비스
    └── MCP/                # MCP 클라이언트
```

### 설계 패턴

- **Repository Pattern**: 데이터 접근 추상화 (✅ 완료)
- **Use Case Pattern**: 비즈니스 로직 캡슐화 (✅ 완료)
- **Service Layer**: 외부 서비스 통합 (✅ 완료)
- **Error Middleware**: 전역 에러 처리 (✅ 완료)
- **Performance Monitoring**: 성능 추적 (✅ 완료)

## 🛠️ 설치 및 실행

### 필수 요구사항

- Node.js 18+
- npm 또는 yarn
- Windows 10+ (현재 테스트된 플랫폼)

### 설치

```bash
# 저장소 클론
git clone <repository-url>
cd update_chat

# 의존성 설치
npm install

# 개발 모드 실행
npm run dev

# 프로덕션 빌드
npm run build
```

### 환경 설정

앱 데이터 디렉토리: `~/AppData/Roaming/update-chat/data/`

설정 파일: `config.json`

```json
{
  "api-key": "your-claude-api-key",
  "system-prompt": "You are a helpful assistant.",
  "theme": "system",
  "default-model": "claude-opus-4",
  "mcp-config": {
    "context7": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
```

## 🔧 MCP 설정

### 지원되는 MCP 서버

- **Context7**: 문서 검색 및 컨텍스트 제공 (✅ 테스트 완료)
- **File Server**: 파일 시스템 접근 (✅ 테스트 완료)
- **Custom Servers**: 사용자 정의 MCP 서버 (✅ 지원)

### 연결 타입

1. **STDIO (Standard Input/Output)** (✅ 구현 완료)

   ```json
   {
     "type": "stdio",
     "command": "npx",
     "args": ["-y", "@upstash/context7-mcp"]
   }
   ```

2. **WebSocket** (✅ 구현 완료)

   ```json
   {
     "type": "websocket",
     "host": "localhost",
     "port": 3000,
     "path": "/ws"
   }
   ```

3. **HTTP** (✅ 구현 완료)
   ```json
   {
     "type": "http",
     "url": "http://localhost:3000/api"
   }
   ```

## 📊 모니터링 및 로깅

### 로그 레벨

- **DEBUG**: 상세한 디버깅 정보
- **INFO**: 일반적인 정보 메시지
- **WARN**: 경고 메시지
- **ERROR**: 에러 메시지
- **FATAL**: 치명적 에러

### 로그 카테고리

- **SYSTEM**: 시스템 초기화 및 종료
- **CONFIG**: 설정 관리
- **DATABASE**: 데이터베이스 작업
- **MCP**: MCP 서버 통신
- **LLM**: LLM API 호출
- **IPC**: 프로세스 간 통신
- **PERFORMANCE**: 성능 측정
- **TEST**: 테스트 실행

### 성능 모니터링

- **작업별 성능 측정**: API 호출, 파일 작업, MCP 도구 호출
- **시스템 리소스 모니터링**: CPU, 메모리, 디스크 사용량
- **실시간 알림**: 성능 저하 감지 및 알림
- **성능 리포트**: 주기적 성능 분석 리포트

## 🧪 테스트

### 테스트 실행

```bash
# 전체 테스트 실행
npm run test

# 개별 테스트
npm run test:performance
npm run test:file-management
npm run test:mcp-client
npm run test:mcp-integration
npm run test:mcp-context7
npm run test:mcp-tool-integration
```

### 테스트 커버리지

- **성능 테스트**: 성능 모니터링 시스템 검증 (✅ 완료)
- **파일 관리 테스트**: 채팅 세션 및 설정 관리 (✅ 완료)
- **MCP 클라이언트 테스트**: MCP 연결 및 도구 호출 (✅ 완료)
- **MCP 통합 테스트**: 실제 MCP 서버 연동 (✅ 완료)
- **MCP 도구 통합 테스트**: LLM 스트리밍에서 도구 호출 (✅ 완료)

## 🔄 개발 워크플로우

### 1. 백엔드 강화 (✅ 완료)

- ✅ 로깅 시스템 구현
- ✅ 에러 처리 강화
- ✅ 성능 모니터링 추가
- ✅ 시스템 모니터링 구현

### 2. 파일 관리 시스템 (✅ 완료)

- ✅ Repository 패턴 적용
- ✅ Use Case 패턴 구현
- ✅ 로깅 통합
- ✅ 에러 처리 개선

### 3. MCP 클라이언트 구현 (✅ 완료)

- ✅ STDIO 연결 구현
- ✅ WebSocket 연결 구현
- ✅ HTTP 연결 구현
- ✅ 도구 변환 로직
- ✅ 헬스 체킹
- ✅ 실제 MCP 서버 연동 테스트

### 4. MCP와 Chat API 통합 (✅ 완료)

- ✅ 스트리밍 응답에서 도구 호출 감지
- ✅ MCP를 통한 도구 실행
- ✅ 도구 결과를 LLM에 전달
- ✅ 모의 응답을 통한 통합 테스트

### 5. 다음 단계 (🔄 진행 예정)

- 🔄 **실제 API 키를 통한 통합 테스트** (백엔드 마지막 작업)
- 🔄 **프론트엔드 MCP 설정 UI** (우선순위: 높음)
- 🔄 **프론트엔드 도구 호출 UI** (우선순위: 높음)
- 🔄 **성능 대시보드 UI** (우선순위: 중간)
- 🔄 **고급 설정 기능** (우선순위: 낮음)

## 🎯 **내일 시작할 작업**

### 1. 백엔드 마무리

```bash
# 실제 API 키로 통합 테스트 실행
npm run test:mcp-tool-integration
```

### 2. 프론트엔드 작업 시작

- MCP 설정 UI 구현
- 도구 호출 상태 표시
- 성능 대시보드

## 🛡️ 에러 처리 전략

### 에러 카테고리

- **SYSTEM**: 시스템 레벨 에러
- **NETWORK**: 네트워크 관련 에러
- **DATABASE**: 데이터베이스 에러
- **CONFIGURATION**: 설정 관련 에러
- **LLM**: LLM 서비스 에러
- **MCP**: MCP 도구 에러
- **IPC**: IPC 통신 에러
- **UI**: 사용자 인터페이스 에러

### 복구 전략

- **네트워크 에러**: 최대 3회 재시도, 지수 백오프
- **LLM 에러**: 최대 2회 재시도, 2초 지연
- **데이터베이스 에러**: 최대 2회 재시도, 0.5초 지연
- **MCP 에러**: 최대 1회 재시도, 1초 지연

## 📈 성능 최적화

### 로그 최적화

- 파일 로테이션으로 디스크 공간 절약
- 레벨별 필터링으로 불필요한 로그 제거
- 구조화된 로깅으로 파싱 성능 향상

### 메모리 관리

- 주기적 메트릭 수집으로 리소스 절약
- 자동 정리로 메모리 사용량 관리
- 임계값 기반 알림으로 불필요한 알림 방지

## 🔐 보안 고려사항

### 로그 보안

- 민감한 정보 마스킹
- 로그 파일 접근 권한 제한
- 에러 로그에서 개인정보 제외

### API 키 관리

- 환경 변수를 통한 안전한 API 키 관리
- 설정 파일 암호화 (필요시)
- API 키 접근 제한

## 🤝 기여하기

### 개발 환경 설정

1. 저장소 포크
2. 개발 브랜치 생성
3. 기능 구현
4. 테스트 작성
5. Pull Request 생성

### 코딩 스타일

- TypeScript 사용
- ESLint 규칙 준수
- 커밋 메시지 컨벤션 준수
- 테스트 커버리지 유지

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 🙏 감사의 말

- **Anthropic**: Claude API 제공
- **Electron**: 크로스 플랫폼 데스크톱 앱 프레임워크
- **Model Context Protocol**: 표준화된 도구 통신 프로토콜
- **React**: 사용자 인터페이스 라이브러리

---

**Update Chat** - 강력하고 안정적인 AI 채팅 애플리케이션 🚀

**현재 상태**: Backend 95% 완료, Frontend 30% 완료
