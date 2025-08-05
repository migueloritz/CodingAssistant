import { AIProvider, CodeGenerationRequest, CodeGenerationResponse, AIResponse, AIError } from '../types';
import { SupportedLanguage } from '../../../types';

interface OpenAIConfig {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: OpenAIMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIProvider implements AIProvider {
  name = 'openai';
  private config: OpenAIConfig;
  private baseURL: string;
  private apiKey: string;

  constructor(config: OpenAIConfig = {}) {
    this.config = {
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 2000,
      ...config
    };
    this.baseURL = config.baseURL || 'https://api.openai.com/v1';
    
    // Secure API key handling - prioritize configuration and environment variables
    this.apiKey = config.apiKey || 
                  process.env.OPENAI_API_KEY || 
                  process.env.VITE_OPENAI_API_KEY || 
                  '';
    
    if (!this.apiKey) {
      console.warn('OpenAI API key not found. Provider will not be available.');
    }
  }

  async generate(request: CodeGenerationRequest): Promise<CodeGenerationResponse> {
    const systemPrompt = this.createSystemPrompt(request.language, 'generation');
    const userPrompt = this.createGenerationPrompt(request);

    try {
      const response = await this.makeRequest([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], request.temperature, request.maxTokens);

      return this.parseGenerationResponse(response, request);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async explain(code: string, language: SupportedLanguage): Promise<AIResponse> {
    const systemPrompt = this.createSystemPrompt(language, 'explanation');
    const userPrompt = `Please explain the following ${language} code in detail:

\`\`\`${language}
${code}
\`\`\`

Provide:
1. A clear explanation of what the code does
2. Key concepts and patterns used
3. Potential improvements or considerations`;

    try {
      const response = await this.makeRequest([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]);

      return this.parseStandardResponse(response, language, 'explanation');
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async improve(code: string, language: SupportedLanguage): Promise<AIResponse> {
    const systemPrompt = this.createSystemPrompt(language, 'improvement');
    const userPrompt = `Please analyze and improve the following ${language} code:

\`\`\`${language}
${code}
\`\`\`

Provide:
1. Identified issues or areas for improvement
2. Improved version of the code
3. Explanation of the changes made
4. Best practices followed`;

    try {
      const response = await this.makeRequest([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]);

      return this.parseStandardResponse(response, language, 'improvement');
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async debug(code: string, language: SupportedLanguage): Promise<AIResponse> {
    const systemPrompt = this.createSystemPrompt(language, 'debugging');
    const userPrompt = `Please analyze the following ${language} code for potential issues:

\`\`\`${language}
${code}
\`\`\`

Provide:
1. Potential bugs or issues identified
2. Syntax or logical errors
3. Performance considerations
4. Security concerns
5. Debugging recommendations`;

    try {
      const response = await this.makeRequest([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]);

      return this.parseStandardResponse(response, language, 'debugging');
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }
    
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.warn('OpenAI provider availability check failed:', error);
      return false;
    }
  }

  // Streaming support for real-time code generation
  async *generateStream(request: CodeGenerationRequest): AsyncGenerator<string, void, unknown> {
    const systemPrompt = this.createSystemPrompt(request.language, 'generation');
    const userPrompt = this.createGenerationPrompt(request);

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: request.temperature || this.config.temperature,
          max_tokens: request.maxTokens || this.config.maxTokens,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') return;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  yield content;
                }
              } catch (e) {
                // Skip invalid JSON lines
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private async makeRequest(
    messages: OpenAIMessage[],
    temperature?: number,
    maxTokens?: number
  ): Promise<OpenAIResponse> {
    const requestBody: OpenAIRequest = {
      model: this.config.model!,
      messages,
      temperature: temperature || this.config.temperature,
      max_tokens: maxTokens || this.config.maxTokens
    };

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    return response.json();
  }

  private createSystemPrompt(language: SupportedLanguage, task: string): string {
    const languageInfo = {
      python: {
        name: 'Python',
        features: 'type hints, docstrings, PEP 8 style guidelines, error handling, list comprehensions',
        testing: 'unittest or pytest',
        patterns: 'context managers, decorators, generators'
      },
      javascript: {
        name: 'JavaScript',
        features: 'ES6+ syntax, async/await, destructuring, template literals, proper error handling',
        testing: 'Jest or similar testing framework',
        patterns: 'modules, promises, functional programming'
      },
      cpp: {
        name: 'C++',
        features: 'modern C++17/20, RAII, smart pointers, const correctness, STL',
        testing: 'Google Test or similar',
        patterns: 'templates, move semantics, exception safety'
      }
    };

    const info = languageInfo[language];
    const taskInstructions = {
      generation: `You are an expert ${info.name} developer. Generate high-quality, production-ready code that follows best practices including ${info.features}. Always include comprehensive error handling, clear documentation, and consider performance implications.`,
      explanation: `You are an expert ${info.name} developer and teacher. Provide clear, detailed explanations of code that help users understand both the mechanics and the reasoning behind the implementation.`,
      improvement: `You are a senior ${info.name} code reviewer. Analyze code for improvements in readability, performance, maintainability, and adherence to best practices including ${info.features}.`,
      debugging: `You are an expert ${info.name} debugger. Analyze code for potential bugs, security issues, performance problems, and violations of best practices. Provide actionable debugging advice.`
    };

    return taskInstructions[task as keyof typeof taskInstructions] || taskInstructions.generation;
  }

  private createGenerationPrompt(request: CodeGenerationRequest): string {
    let prompt = `Please generate ${request.language} code that ${request.description}.

Type: ${request.type}`;

    if (request.parameters && request.parameters.length > 0) {
      prompt += `\nParameters: ${request.parameters.join(', ')}`;
    }

    if (request.returnType) {
      prompt += `\nReturn Type: ${request.returnType}`;
    }

    if (request.context) {
      prompt += `\nContext: ${request.context}`;
    }

    prompt += `\n\nRequirements:
- Follow ${request.language} best practices and style guidelines
- Include comprehensive error handling
- Add clear documentation and comments
- Optimize for readability and maintainability
- Include example usage
- Add unit tests if applicable

Please structure your response with:
1. The main code implementation
2. Example usage
3. Brief explanation of the approach
4. Any important considerations or notes`;

    return prompt;
  }

  private parseGenerationResponse(response: OpenAIResponse, request: CodeGenerationRequest): CodeGenerationResponse {
    const content = response.choices[0]?.message?.content || '';
    
    // Extract code blocks from the response
    const codeBlocks = this.extractCodeBlocks(content);
    const mainCode = codeBlocks.find(block => block.language === request.language)?.code || content;
    
    // Extract tests if present
    const testCode = codeBlocks.find(block => 
      block.code.includes('test') || 
      block.code.includes('Test') || 
      block.code.includes('unittest') ||
      block.code.includes('jest') ||
      block.code.includes('gtest')
    )?.code;

    // Generate explanation from the response
    const explanation = this.extractExplanation(content);

    return {
      id: this.generateId(),
      content: mainCode,
      code: mainCode,
      tests: testCode,
      documentation: this.generateDocumentation(request, content),
      language: request.language,
      explanation,
      suggestions: this.extractSuggestions(content),
      timestamp: new Date(),
      provider: this.name
    };
  }

  private parseStandardResponse(response: OpenAIResponse, language: SupportedLanguage, _type: string): AIResponse {
    const content = response.choices[0]?.message?.content || '';

    return {
      id: this.generateId(),
      content,
      language,
      explanation: content,
      suggestions: this.extractSuggestions(content),
      timestamp: new Date(),
      provider: this.name
    };
  }

  private extractCodeBlocks(content: string): Array<{language: string, code: string}> {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const blocks: Array<{language: string, code: string}> = [];
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      blocks.push({
        language: match[1] || 'text',
        code: match[2].trim()
      });
    }

    return blocks;
  }

  private extractExplanation(content: string): string {
    // Extract explanation text that's not inside code blocks
    const withoutCodeBlocks = content.replace(/```[\s\S]*?```/g, '');
    const lines = withoutCodeBlocks.split('\n').filter(line => line.trim());
    
    // Find explanation sections
    const explanationLines = lines.filter(line => 
      !line.startsWith('#') && 
      !line.startsWith('//') && 
      line.length > 20
    );

    return explanationLines.slice(0, 3).join('\n').trim() || 'Code generated successfully.';
  }

  private extractSuggestions(content: string): string[] {
    const suggestions: string[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        suggestions.push(trimmed.substring(2));
      } else if (/^\d+\.\s/.test(trimmed)) {
        suggestions.push(trimmed.replace(/^\d+\.\s/, ''));
      }
    }

    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }

  private generateDocumentation(request: CodeGenerationRequest, content: string): string {
    return `# ${request.type.charAt(0).toUpperCase() + request.type.slice(1)} Documentation

## Description
${request.description}

## Language
${request.language.toUpperCase()}

## Generated Content
${content}

## Usage Notes
- Follow the provided examples for proper usage
- Ensure all dependencies are installed
- Run tests to verify functionality
- Customize as needed for your specific use case`;
  }

  private generateId(): string {
    return `openai_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private handleError(error: any): AIError {
    if (error instanceof AIError) {
      return error;
    }

    let code = 'UNKNOWN_ERROR';
    let message = 'An unknown error occurred';
    let retryable = true;

    if (error.message) {
      message = error.message;
      
      // Determine error type and retryability
      if (error.message.includes('401') || error.message.includes('unauthorized')) {
        code = 'UNAUTHORIZED';
        message = 'Invalid API key or unauthorized access';
        retryable = false;
      } else if (error.message.includes('429') || error.message.includes('rate limit')) {
        code = 'RATE_LIMITED';
        message = 'Rate limit exceeded. Please wait before retrying.';
        retryable = true;
      } else if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
        code = 'SERVER_ERROR';
        message = 'Server error. Please try again later.';
        retryable = true;
      } else if (error.message.includes('timeout')) {
        code = 'TIMEOUT';
        message = 'Request timed out. Please try again.';
        retryable = true;
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        code = 'NETWORK_ERROR';
        message = 'Network error. Please check your connection.';
        retryable = true;
      }
    }

    return new AIError(code, message, error, retryable);
  }

  // Configuration management
  updateConfig(newConfig: Partial<OpenAIConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): OpenAIConfig {
    return { ...this.config };
  }
}