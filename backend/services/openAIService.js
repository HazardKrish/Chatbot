import { OpenAI } from 'openai';

class OpenAIService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async *generateStream(messages, model = 'gpt-4o-mini', temperature = 0.7) {
    try {
      const stream = await this.openai.chat.completions.create({
        model: model,
        messages: messages,
        temperature: temperature,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          yield {
            type: 'data',
            payload: content,
          };
        }
      }
    } catch (error) {
      console.error('Error in OpenAI stream:', error);
      yield {
        type: 'error',
        payload: error.message,
      };
    }
  }
}

export default new OpenAIService();