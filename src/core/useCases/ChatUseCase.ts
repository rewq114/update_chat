// core/useCases/ChatUseCase.ts
import { ChatRepository } from '../repositories/ChatRepository'
import { LLMService } from '../services/LLMService'
import { MCPService } from '../services/MCPService'
import { ChatSession, ChatMessage } from '../entities/ChatMessage'
import { LLMRequest, LLMResponse, StreamingCallback, Agent } from '../entities/LLM'

export class ChatUseCase {
  constructor(
    private chatRepository: ChatRepository,
    private llmService: LLMService,
    private mcpService: MCPService
  ) {}

  // 채팅 요청 처리
  async processChatRequest(request: LLMRequest): Promise<LLMResponse> {
    try {
      // Agent 생성
      const agent: Agent = {
        name: 'default-agent',
        description: 'You are a helpful assistant.',
        preferredModel: request.model || 'claude-opus-4'
      }

      // 메시지 정규화
      const messages = this.normalizeMessages(request.messages)

      // MCP 도구 처리
      const tools = await this.processTools(request.tools)

      // LLM 호출
      const response = await this.llmService.chat(agent, messages, tools)

      return {
        content: response.content,
        success: true
      }
    } catch (error) {
      console.error('❌ Chat request processing failed:', error)
      return {
        content: '',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  // 스트리밍 채팅 요청 처리 (도구 호출 지원)
  async processStreamingRequest(request: LLMRequest, callback: StreamingCallback): Promise<void> {
    try {
      // Agent 생성
      const agent: Agent = {
        name: 'default-agent',
        description: 'You are a helpful assistant.',
        preferredModel: request.model || 'claude-opus-4'
      }

      // 메시지 정규화
      const messages = this.normalizeMessages(request.messages)

      // MCP 도구 처리
      const tools = await this.processTools(request.tools)

      // 스트리밍 응답 시작
      const stream = this.llmService.stream(agent, messages, tools)

      let fullResponse = ''
      let currentToolCalls: any[] = []
      let isInToolCall = false
      let toolCallBuffer = ''

      for await (const chunk of stream) {
        // 도구 호출 감지 및 처리
        if (this.isToolCallChunk(chunk)) {
          isInToolCall = true
          toolCallBuffer += chunk

          // 도구 호출이 완료되었는지 확인
          if (this.isToolCallComplete(toolCallBuffer)) {
            const toolCalls = this.parseToolCalls(toolCallBuffer)
            currentToolCalls = toolCalls

            // 도구 호출 실행
            const toolResults = await this.executeToolCalls(toolCalls)

            // 도구 결과를 메시지에 추가
            const toolResultMessage = {
              role: 'tool' as const,
              content: JSON.stringify(toolResults),
              tool_calls: toolCalls
            }

            // 새로운 메시지 배열 생성 (도구 결과 포함)
            const updatedMessages = [...messages, toolResultMessage]

            // 도구 결과를 포함한 추가 응답 요청
            const followUpStream = this.llmService.stream(agent, updatedMessages, tools)

            let followUpResponse = ''
            for await (const followUpChunk of followUpStream) {
              followUpResponse += followUpChunk
              callback.onChunk(followUpChunk, fullResponse + followUpResponse)
            }

            fullResponse += followUpResponse
            isInToolCall = false
            toolCallBuffer = ''
            currentToolCalls = []
          }
        } else if (!isInToolCall) {
          // 일반 텍스트 응답
          fullResponse += chunk
          callback.onChunk(chunk, fullResponse)
        }
      }

      callback.onComplete(fullResponse)
    } catch (error) {
      console.error('❌ Streaming request processing failed:', error)
      callback.onError(error instanceof Error ? error.message : String(error))
    }
  }

  // 도구 호출 청크인지 확인
  private isToolCallChunk(chunk: string): boolean {
    try {
      const parsed = JSON.parse(chunk)
      return parsed.choices?.[0]?.delta?.tool_calls !== undefined
    } catch {
      return false
    }
  }

  // 도구 호출이 완료되었는지 확인
  private isToolCallComplete(buffer: string): boolean {
    try {
      const lines = buffer.split('\n').filter((line) => line.trim())
      const lastLine = lines[lines.length - 1]
      const parsed = JSON.parse(lastLine)
      return parsed.choices?.[0]?.finish_reason === 'tool_calls'
    } catch {
      return false
    }
  }

  // 도구 호출 파싱
  private parseToolCalls(buffer: string): any[] {
    const toolCalls: any[] = []
    const lines = buffer.split('\n').filter((line) => line.trim())

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line)
        const delta = parsed.choices?.[0]?.delta
        if (delta?.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            const existingIndex = toolCalls.findIndex((tc) => tc.index === toolCall.index)
            if (existingIndex >= 0) {
              // 기존 도구 호출 업데이트
              if (toolCall.function?.name) {
                toolCalls[existingIndex].function.name = toolCall.function.name
              }
              if (toolCall.function?.arguments) {
                toolCalls[existingIndex].function.arguments =
                  (toolCalls[existingIndex].function.arguments || '') + toolCall.function.arguments
              }
            } else {
              // 새로운 도구 호출 추가
              toolCalls.push({
                index: toolCall.index,
                id: toolCall.id,
                type: 'function',
                function: {
                  name: toolCall.function?.name || '',
                  arguments: toolCall.function?.arguments || ''
                }
              })
            }
          }
        }
      } catch (error) {
        console.error('Failed to parse tool call:', error)
      }
    }

    return toolCalls
  }

  // 도구 호출 실행
  private async executeToolCalls(toolCalls: any[]): Promise<any[]> {
    const results = []

    for (const toolCall of toolCalls) {
      try {
        const functionName = toolCall.function.name
        const argumentsStr = toolCall.function.arguments
        const args = JSON.parse(argumentsStr)

        // MCP를 통해 도구 실행
        const result = await this.mcpService.callHChatTool({
          name: functionName,
          arguments: args
        })

        results.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          content: JSON.stringify(result)
        })
      } catch (error) {
        console.error('Tool call execution failed:', error)
        results.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          content: JSON.stringify({ error: error instanceof Error ? error.message : String(error) })
        })
      }
    }

    return results
  }

  // 세션 관리
  async getSessions(): Promise<ChatSession[]> {
    return await this.chatRepository.getSessions()
  }

  async getSession(sessionId: string): Promise<ChatSession | null> {
    return await this.chatRepository.getSession(sessionId)
  }

  async saveSession(session: ChatSession): Promise<void> {
    await this.chatRepository.saveSession(session)
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.chatRepository.deleteSession(sessionId)
  }

  async renameSession(sessionId: string, newTitle: string): Promise<void> {
    await this.chatRepository.updateSessionTitle(sessionId, newTitle)
  }

  async getChatData(sessionId: string): Promise<ChatMessage[]> {
    const chatData = await this.chatRepository.getChatData(sessionId)
    return chatData?.messages || []
  }

  async saveChatData(sessionId: string, messages: ChatMessage[]): Promise<void> {
    const chatData = {
      sessionId,
      messages
    }
    await this.chatRepository.saveChatData(chatData)
  }

  // 메시지 정규화
  private normalizeMessages(messages: any[]): any[] {
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content
    }))
  }

  // MCP 도구 처리
  private async processTools(tools?: string[]): Promise<Record<string, unknown> | undefined> {
    if (!tools || tools.length === 0) {
      return undefined
    }

    try {
      // MCP에서 사용 가능한 도구들 가져오기
      const mcpTools = await this.mcpService.getHChatTools()

      // 도구들을 Record 형태로 변환
      const toolsRecord: Record<string, unknown> = {}
      mcpTools.forEach((tool: any, index: number) => {
        toolsRecord[`tool_${index}`] = tool
      })

      return toolsRecord
    } catch (error) {
      console.error('Failed to process MCP tools:', error)
      return undefined
    }
  }
}
