import express from 'express';
import mongoose from 'mongoose';
import ChatSession from '../models/chatSession.js';
import Message from '../models/message.js';
import aiProviderFactory from '../services/aiProviderFactory.js';

const router = express.Router();

router.post('/stream', async (req, res) => {
  const { sessionId, message, provider, model } = req.body;
  
  // This would come from your JWT auth middleware
  const MOCK_USER_ID = new mongoose.Types.ObjectId('60c72b96e6b3b72f8c4be8a0');

  let session;
  let isNewSession = false;

  try {
    if (sessionId) {
      session = await ChatSession.findById(sessionId);
    }

    if (!session) {
      session = new ChatSession({
        userId: MOCK_USER_ID,
        provider: provider || 'openai',
        model: model || 'gpt-4o-mini',
      });
      await session.save();
      isNewSession = true;
    }

    const userMessage = new Message({
      sessionId: session._id,
      role: 'user',
      content: message,
    });
    await userMessage.save();

    const messageHistory = await Message.find({ sessionId: session._id })
      .sort({ createdAt: 1 })
      .limit(20)
      .select('role content');

    const formattedHistory = messageHistory.map(m => ({
      role: m.role,
      content: m.content,
    }));

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendEvent = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    if (isNewSession) {
      sendEvent({ type: 'session', payload: { sessionId: session._id.toString() } });
    }

    const aiProvider = aiProviderFactory.getProvider(session.provider);
    const stream = aiProvider.generateStream(formattedHistory, session.model);

    let fullResponse = '';

    for await (const chunk of stream) {
      if (chunk.type === 'data') {
        fullResponse += chunk.payload;
        sendEvent(chunk);
      } else if (chunk.type === 'error') {
        sendEvent(chunk);
        console.error('Stream error:', chunk.payload);
      }
    }

    const assistantMessage = new Message({
      sessionId: session._id,
      role: 'assistant',
      content: fullResponse,
      provider: session.provider,
      model: session.model,
    });
    await assistantMessage.save();

    session.lastActivity = Date.now();
    await session.save();

    sendEvent({ type: 'done' });
    res.end();

  } catch (error) {
    console.error('Error in /stream route:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      sendEvent({ type: 'error', payload: 'An internal error occurred.' });
      res.end();
    }
  }
});

export default router;