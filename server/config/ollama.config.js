// Configuración de Ollama
export const ollamaConfig = {
  baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  model: process.env.OLLAMA_MODEL || 'mistral:7b',
  timeout: parseInt(process.env.OLLAMA_TIMEOUT || '30000'),
  temperature: 0.7,
  topP: 0.9,
  topK: 40
}

export const getOllamaUrl = () => ollamaConfig.baseUrl
export const getOllamaModel = () => ollamaConfig.model
export const getOllamaTimeout = () => ollamaConfig.timeout
