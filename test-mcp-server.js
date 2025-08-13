// test-mcp-server.js
// 간단한 MCP 서버 (파일 시스템 도구 제공)

const readline = require('readline')

class MCPServer {
  constructor() {
    this.tools = {
      read_file: {
        description: 'Read contents of a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'File path to read'
            }
          },
          required: ['path']
        }
      },
      write_file: {
        description: 'Write content to a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'File path to write'
            },
            content: {
              type: 'string',
              description: 'Content to write'
            }
          },
          required: ['path', 'content']
        }
      },
      list_directory: {
        description: 'List contents of a directory',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Directory path to list'
            }
          },
          required: ['path']
        }
      }
    }
  }

  // JSON-RPC 메시지 처리
  handleMessage(message) {
    const { id, method, params } = message

    try {
      switch (method) {
        case 'initialize':
          return this.handleInitialize(id, params)
        case 'tools/list':
          return this.handleToolsList(id)
        case 'tools/call':
          return this.handleToolCall(id, params)
        case 'ping':
          return this.handlePing(id)
        default:
          return this.createError(id, -32601, 'Method not found')
      }
    } catch (error) {
      return this.createError(id, -32603, 'Internal error', error.message)
    }
  }

  // 초기화 처리
  handleInitialize(id, params) {
    console.error('Initializing MCP server...')
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: 'test-mcp-server',
          version: '1.0.0'
        }
      }
    }
  }

  // 도구 목록 반환
  handleToolsList(id) {
    const tools = Object.entries(this.tools).map(([name, tool]) => ({
      name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }))

    return {
      jsonrpc: '2.0',
      id,
      result: {
        tools
      }
    }
  }

  // 도구 호출 처리
  handleToolCall(id, params) {
    const { name, arguments: args } = params

    if (!this.tools[name]) {
      return this.createError(id, -32601, 'Tool not found')
    }

    try {
      let result
      switch (name) {
        case 'read_file':
          result = this.readFile(args.path)
          break
        case 'write_file':
          result = this.writeFile(args.path, args.content)
          break
        case 'list_directory':
          result = this.listDirectory(args.path)
          break
        default:
          return this.createError(id, -32601, 'Tool not implemented')
      }

      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: result
        }
      }
    } catch (error) {
      return this.createError(id, -32603, 'Tool execution failed', error.message)
    }
  }

  // Ping 처리
  handlePing(id) {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        message: 'pong'
      }
    }
  }

  // 파일 읽기 (시뮬레이션)
  readFile(path) {
    console.error(`Reading file: ${path}`)
    return `Content of ${path} (simulated)`
  }

  // 파일 쓰기 (시뮬레이션)
  writeFile(path, content) {
    console.error(`Writing to file: ${path}`)
    return `Successfully wrote ${content.length} characters to ${path}`
  }

  // 디렉토리 목록 (시뮬레이션)
  listDirectory(path) {
    console.error(`Listing directory: ${path}`)
    return ['file1.txt', 'file2.txt', 'directory1/', 'directory2/']
  }

  // 에러 응답 생성
  createError(id, code, message, data = null) {
    const error = {
      code,
      message
    }
    if (data) {
      error.data = data
    }

    return {
      jsonrpc: '2.0',
      id,
      error
    }
  }
}

// 서버 인스턴스 생성
const server = new MCPServer()

// 표준 입력/출력으로 JSON-RPC 통신
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
})

rl.on('line', (line) => {
  try {
    const message = JSON.parse(line)
    const response = server.handleMessage(message)

    if (response) {
      console.log(JSON.stringify(response))
    }
  } catch (error) {
    console.error('Failed to parse message:', error.message)
  }
})

console.error('MCP Server started. Waiting for messages...')
