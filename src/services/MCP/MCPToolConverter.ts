// services/MCP/MCPToolConverter.ts
import { Logger } from '../../core/logging/Logger'

export interface MCPTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  serverName: string
}

export interface HChatTool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export interface MCPToolCall {
  name: string
  arguments: Record<string, unknown>
  serverName: string
}

export interface HChatToolCall {
  name: string
  arguments: Record<string, unknown>
}

export class MCPToolConverter {
  private logger: Logger

  constructor(logger: Logger) {
    this.logger = logger
  }

  /**
   * MCP 도구를 h-chat SDK 형식으로 변환
   */
  convertMCPToolsToHChatFormat(mcpTools: MCPTool[]): HChatTool[] {
    try {
      const hchatTools: HChatTool[] = []

      for (const mcpTool of mcpTools) {
        const hchatTool = this.convertSingleTool(mcpTool)
        hchatTools.push(hchatTool)
      }

      this.logger.debug('MCP', 'Converted MCP tools to h-chat format', {
        inputCount: mcpTools.length,
        outputCount: hchatTools.length
      })

      return hchatTools
    } catch (error) {
      this.logger.error('MCP', 'Failed to convert MCP tools', error as Error)
      throw error
    }
  }

  /**
   * 단일 MCP 도구 변환
   */
  private convertSingleTool(mcpTool: MCPTool): HChatTool {
    // 도구 이름에 서버 이름을 접두사로 추가하여 고유성 보장
    const uniqueName = `${mcpTool.serverName}_${mcpTool.name}`

    // MCP 스키마를 h-chat 형식으로 변환
    const parameters = this.convertSchema(mcpTool.inputSchema)

    const hchatTool: HChatTool = {
      type: 'function',
      function: {
        name: uniqueName,
        description: mcpTool.description,
        parameters
      }
    }

    this.logger.debug('MCP', 'Converted single tool', {
      originalName: mcpTool.name,
      serverName: mcpTool.serverName,
      convertedName: uniqueName
    })

    return hchatTool
  }

  /**
   * MCP 스키마를 h-chat 파라미터 형식으로 변환
   */
  private convertSchema(mcpSchema: Record<string, unknown>): Record<string, unknown> {
    // MCP 스키마가 이미 h-chat 형식과 호환되는 경우 그대로 사용
    if (this.isCompatibleSchema(mcpSchema)) {
      return mcpSchema
    }

    // 기본 변환 로직
    const converted: Record<string, unknown> = {
      type: 'object',
      properties: {},
      required: []
    }

    // MCP 스키마의 properties를 변환
    if (mcpSchema.properties && typeof mcpSchema.properties === 'object') {
      converted.properties = mcpSchema.properties
    }

    // required 필드 변환
    if (mcpSchema.required && Array.isArray(mcpSchema.required)) {
      converted.required = mcpSchema.required
    }

    return converted
  }

  /**
   * 스키마가 h-chat 형식과 호환되는지 확인
   */
  private isCompatibleSchema(schema: Record<string, unknown>): boolean {
    return (
      schema.type === 'object' &&
      typeof schema.properties === 'object' &&
      schema.properties !== null
    )
  }

  /**
   * h-chat 도구 호출을 MCP 도구 호출로 변환
   */
  convertHChatToolCallToMCP(hchatToolCall: HChatToolCall, serverName: string): MCPToolCall {
    // h-chat 도구 이름에서 서버 이름 제거
    const toolName = hchatToolCall.name.replace(`${serverName}_`, '')

    const mcpToolCall: MCPToolCall = {
      name: toolName,
      arguments: hchatToolCall.arguments,
      serverName
    }

    this.logger.debug('MCP', 'Converted h-chat tool call to MCP', {
      hchatName: hchatToolCall.name,
      mcpName: toolName,
      serverName,
      arguments: hchatToolCall.arguments
    })

    return mcpToolCall
  }

  /**
   * MCP 도구 결과를 h-chat 형식으로 변환
   */
  convertMCPResultToHChat(result: unknown): string {
    try {
      if (typeof result === 'string') {
        return result
      }

      if (typeof result === 'object' && result !== null) {
        return JSON.stringify(result, null, 2)
      }

      return String(result)
    } catch (error) {
      this.logger.error('MCP', 'Failed to convert MCP result to h-chat format', error as Error)
      return 'Error converting result'
    }
  }

  /**
   * 도구 목록을 서버별로 그룹화
   */
  groupToolsByServer(tools: MCPTool[]): Record<string, MCPTool[]> {
    const grouped: Record<string, MCPTool[]> = {}

    for (const tool of tools) {
      if (!grouped[tool.serverName]) {
        grouped[tool.serverName] = []
      }
      grouped[tool.serverName].push(tool)
    }

    return grouped
  }

  /**
   * 도구 이름에서 서버 이름 추출
   */
  extractServerNameFromToolName(toolName: string): string | null {
    // 서버 이름이 포함된 도구 이름인지 확인 (예: server_tool_name)
    const parts = toolName.split('_')
    if (parts.length >= 3) {
      // server가 포함된 경우: test_file_server_read_file -> test_file_server
      const serverIndex = parts.findIndex((part) => part === 'server')
      if (serverIndex > 0) {
        return parts.slice(0, serverIndex + 1).join('_')
      }

      // service가 포함된 경우: test_service_read_file -> test_service
      const serviceIndex = parts.findIndex((part) => part === 'service')
      if (serviceIndex > 0) {
        return parts.slice(0, serviceIndex + 1).join('_')
      }
    }

    // 기본적으로 첫 번째 부분을 서버 이름으로 간주 (단, 길이가 3 이상인 경우)
    if (parts.length >= 2 && parts[0].length > 3) {
      return parts[0]
    }

    return null
  }

  /**
   * 도구 이름에서 실제 도구 이름 추출
   */
  extractToolNameFromFullName(fullName: string): string {
    const parts = fullName.split('_')
    if (parts.length >= 3) {
      // server가 포함된 경우: test_file_server_read_file -> read_file
      const serverIndex = parts.findIndex((part) => part === 'server')
      if (serverIndex > 0) {
        return parts.slice(serverIndex + 1).join('_')
      }

      // service가 포함된 경우: test_service_read_file -> read_file
      const serviceIndex = parts.findIndex((part) => part === 'service')
      if (serviceIndex > 0) {
        return parts.slice(serviceIndex + 1).join('_')
      }
    }

    // 기본적으로 첫 번째 부분을 제외한 나머지를 도구 이름으로 간주
    if (parts.length >= 2) {
      return parts.slice(1).join('_')
    }

    return fullName
  }
}
