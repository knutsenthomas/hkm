import { createClient, ApiKeyStrategy } from '@wix/sdk';
import { conversations, messages } from '@wix/inbox';

const wixClient = createClient({
  modules: {
    inboxConversations: conversations,
    inboxMessages: messages,
  },
  auth: ApiKeyStrategy({
    siteId: process.env.WIX_SITE_ID || '7682a906-41f6-4e8d-b0b1-bfdb5ee596e7',
    apiKey: process.env.WIX_CHAT_API_KEY || process.env.WIX_API_KEY
  })
});

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    return;
  }

  try {
    const { conversationId, message, senderName, senderEmail } = req.body || {};
    if (!conversationId) {
      res.status(400).json({ error: 'Missing conversationId in request body.' });
      return;
    }
    if (!message) {
      res.status(400).json({ error: 'Missing message in request body.' });
      return;
    }

    // Prefix message so user immediately distinguishes HKM from HKD in Wix Inbox & phone push
    let rawText = '';
    if (message.content?.basic?.items?.[0]?.text) {
      rawText = message.content.basic.items[0].text;
    } else if (typeof message.text === 'string') {
      rawText = message.text;
    }

    const prefixedText = rawText.startsWith('[His Kingdom Ministry]') 
      ? rawText 
      : `[His Kingdom Ministry] ${rawText}`;

    const formattedMessage = {
      ...message,
      direction: 'PARTICIPANT_TO_BUSINESS',
      visibility: 'BUSINESS_AND_PARTICIPANT',
      sourceChannel: 'CHAT',
      content: {
        basic: {
          items: [
            {
              text: prefixedText
            }
          ]
        }
      }
    };

    const options = {
      sendNotifications: true,
      sendAs: 'PARTICIPANT'
    };

    console.log('[HKM Chat] Sending message to Wix Inbox conversation:', conversationId);
    const result = await wixClient.inboxMessages.sendMessage(conversationId, formattedMessage, options);

    res.status(200).json(result);
  } catch (error) {
    console.error('[HKM Chat] Error in send-message serverless function:', error);
    res.status(500).json({
      error: error.message || 'Internal Server Error',
      details: error.details || null
    });
  }
}
