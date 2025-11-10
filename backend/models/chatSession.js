import mongoose from 'mongoose';

const chatSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      default: 'New Chat',
    },
    systemPrompt: {
      type: String,
      default: 'You are a helpful assistant.',
    },
    provider: {
      type: String,
      default: 'openai',
    },
    model: {
      type: String,
      default: 'gpt-4o-mini',
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

chatSessionSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 86400 * 7 }); // TTL index for 7 days

const ChatSession = mongoose.model('ChatSession', chatSessionSchema);

export default ChatSession;