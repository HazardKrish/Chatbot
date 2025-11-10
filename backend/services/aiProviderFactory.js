import openAIService from './openAIService.js';
import dialogflowService from './dialogflowService.js';

const providers = {
  openai: openAIService,
  dialogflow: dialogflowService,
};

class AIProviderFactory {
  getProvider(providerName = 'openai') {
    const provider = providers[providerName];
    if (!provider) {
      throw new Error(`Provider ${providerName} not supported`);
    }
    return provider;
  }
}

export default new AIProviderFactory();