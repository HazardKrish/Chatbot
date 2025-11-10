class DialogflowService {
  constructor() {
    console.log('DialogflowService initialized (stub)');
  }

  async *generateStream(messages, model, temperature) {

    try {
      
      const userMessage = messages[messages.length - 1].content;
      
     
      await new Promise(res => setTimeout(res, 100)); // Simulate network delay
      const fulfillmentText = `Dialogflow response to: "${userMessage}"`;

      yield {
        type: 'data',
        payload: fulfillmentText,
      };
      
    } catch (error) {
      console.error('Error in Dialogflow service:', error);
      yield {
        type: 'error',
        payload: error.message,
      };
    }
  }
}

export default new DialogflowService();