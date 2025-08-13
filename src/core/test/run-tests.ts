// core/test/run-tests.ts
import { runPerformanceTests } from './performance-test'
import { runFileManagementTests } from './file-management-test'
import { runMCPClientTests } from './mcp-client-test'
import { MCPToolIntegrationTest } from './mcp-tool-integration-test'

export class TestRunner {
  /**
   * 모든 테스트 실행
   */
  static async runAllTests(): Promise<void> {
    console.log('🚀 Starting all tests...')
    console.log('='.repeat(50))

    const startTime = Date.now()

    try {
      // 1. 성능 모니터링 테스트
      console.log('\n📊 Running Performance Monitoring Tests...')
      await runPerformanceTests()
      console.log('✅ Performance monitoring tests passed\n')

      // 2. 파일 관리 테스트
      console.log('📁 Running File Management Tests...')
      await runFileManagementTests()
      console.log('✅ File management tests passed\n')

      // 3. MCP Client 테스트
      console.log('🔌 Running MCP Client Tests...')
      await runMCPClientTests()
      console.log('✅ MCP client tests passed\n')

      // 4. MCP Tool Integration 테스트
      console.log('🛠️ Running MCP Tool Integration Tests...')
      const toolIntegrationTest = new MCPToolIntegrationTest()
      await toolIntegrationTest.runTests()
      console.log('✅ MCP tool integration tests passed\n')

      const endTime = Date.now()
      const duration = (endTime - startTime) / 1000

      console.log('='.repeat(50))
      console.log(`🎉 All tests completed successfully in ${duration.toFixed(2)}s!`)
      console.log('='.repeat(50))
    } catch (error) {
      const endTime = Date.now()
      const duration = (endTime - startTime) / 1000

      console.log('='.repeat(50))
      console.error(`❌ Tests failed after ${duration.toFixed(2)}s`)
      console.error('Error:', error)
      console.log('='.repeat(50))
      throw error
    }
  }

  /**
   * 성능 모니터링 테스트만 실행
   */
  static async runPerformanceTests(): Promise<void> {
    console.log('📊 Running Performance Monitoring Tests...')
    await runPerformanceTests()
    console.log('✅ Performance monitoring tests passed')
  }

  /**
   * 파일 관리 테스트만 실행
   */
  static async runFileManagementTests(): Promise<void> {
    console.log('📁 Running File Management Tests...')
    await runFileManagementTests()
    console.log('✅ File management tests passed')
  }

  /**
   * MCP Client 테스트만 실행
   */
  static async runMCPClientTests(): Promise<void> {
    console.log('🔌 Running MCP Client Tests...')
    await runMCPClientTests()
    console.log('✅ MCP client tests passed')
  }

  /**
   * MCP Tool Integration 테스트만 실행
   */
  static async runMCPToolIntegrationTests(): Promise<void> {
    console.log('🛠️ Running MCP Tool Integration Tests...')
    const toolIntegrationTest = new MCPToolIntegrationTest()
    await toolIntegrationTest.runTests()
    console.log('✅ MCP tool integration tests passed')
  }
}

// 직접 실행
if (require.main === module) {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    // 모든 테스트 실행
    TestRunner.runAllTests().catch(console.error)
  } else if (args[0] === 'performance') {
    // 성능 테스트만 실행
    TestRunner.runPerformanceTests().catch(console.error)
  } else if (args[0] === 'file-management') {
    // 파일 관리 테스트만 실행
    TestRunner.runFileManagementTests().catch(console.error)
  } else if (args[0] === 'mcp-client') {
    // MCP Client 테스트만 실행
    TestRunner.runMCPClientTests().catch(console.error)
  } else if (args[0] === 'mcp-tool-integration') {
    // MCP Tool Integration 테스트만 실행
    TestRunner.runMCPToolIntegrationTests().catch(console.error)
  } else {
    console.log('Usage:')
    console.log('  npm run test                    # Run all tests')
    console.log('  npm run test:performance        # Run performance tests only')
    console.log('  npm run test:file-management    # Run file management tests only')
    console.log('  npm run test:mcp-client         # Run MCP client tests only')
    console.log('  npm run test:mcp-tool-integration # Run MCP tool integration tests only')
  }
}

export default TestRunner
