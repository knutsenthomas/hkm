import { createClient, ApiKeyStrategy } from '@wix/sdk';
import { conversations } from '@wix/inbox';

const wixClient = createClient({
  modules: {
    inboxConversations: conversations,
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
    const { email, name, anonymousVisitorId } = req.body || {};
    
    let participantId = {};

    if (email) {
      const cleanEmail = email.trim();
      const resolvedName = (name || cleanEmail.split('@')[0] || 'Kunde').trim();
      console.log('[HKM Chat] Querying/creating CRM contact for:', cleanEmail, resolvedName);
      try {
        const apiKey = process.env.WIX_CHAT_API_KEY || process.env.WIX_API_KEY;
        const siteId = process.env.WIX_SITE_ID || '7682a906-41f6-4e8d-b0b1-bfdb5ee596e7';
        
        // 1. Query contact by email
        const queryRes = await fetch('https://www.wixapis.com/contacts/v4/contacts/query', {
          method: 'POST',
          headers: {
            'Authorization': apiKey,
            'wix-site-id': siteId,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: {
              filter: {
                'primaryInfo.email': {
                  '$eq': cleanEmail
                }
              }
            }
          })
        });

        const queryData = await queryRes.json();
        let resolvedContactId = null;

        if (queryRes.ok && queryData.contacts && queryData.contacts.length > 0) {
          resolvedContactId = queryData.contacts[0].id;
          console.log('[HKM Chat] Found existing CRM contact ID:', resolvedContactId);
        } else {
          // 2. Create contact if not found
          console.log('[HKM Chat] Contact not found, creating new CRM contact...');
          const parts = resolvedName.split(/\s+/);
          const firstName = parts[0] || 'Kunde';
          const lastName = parts.slice(1).join(' ');

          const nameObj = { first: firstName };
          if (lastName) {
            nameObj.last = lastName;
          }

          const createRes = await fetch('https://www.wixapis.com/contacts/v4/contacts', {
            method: 'POST',
            headers: {
              'Authorization': apiKey,
              'wix-site-id': siteId,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              info: {
                name: nameObj,
                emails: {
                  items: [
                    {
                      email: cleanEmail,
                      tag: 'MAIN'
                    }
                  ]
                }
              },
              allowDuplicates: true
            })
          });

          const createData = await createRes.json();
          if (createRes.ok && createData.contact) {
            resolvedContactId = createData.contact.id;
            console.log('[HKM Chat] Created new CRM contact ID:', resolvedContactId);
          } else {
            console.error('[HKM Chat] Failed to create contact REST response:', createData);
          }
        }

        if (resolvedContactId) {
          participantId = { contactId: resolvedContactId };
        } else {
          participantId = { anonymousVisitorId: anonymousVisitorId || '00000000-0000-0000-0000-000000000001' };
        }
      } catch (crmErr) {
        console.error('[HKM Chat] CRM REST error, falling back:', crmErr);
        participantId = { anonymousVisitorId: anonymousVisitorId || '00000000-0000-0000-0000-000000000001' };
      }
    } else if (anonymousVisitorId) {
      participantId = { anonymousVisitorId };
    } else {
      res.status(400).json({ error: 'Missing contact details or anonymousVisitorId in request body.' });
      return;
    }

    console.log('[HKM Chat] Calling getOrCreateConversation with:', participantId);
    const result = await wixClient.inboxConversations.getOrCreateConversation(participantId);
    res.status(200).json(result);
  } catch (error) {
    console.error('[HKM Chat] Error in get-or-create-conversation:', error);
    res.status(500).json({
      error: error.message || 'Internal Server Error',
      details: error.details || null
    });
  }
}
