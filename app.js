const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const notificationApiUrl = process.env.NOTIFICATION_API_URL || 'http://4.224.186.213/evaluation-service/notifications';
const authHeader = process.env.NOTIFICATION_API_AUTH || '';
const tokenUrl = process.env.NOTIFICATION_API_TOKEN_URL || '';
const clientId = process.env.NOTIFICATION_API_CLIENT_ID || '';
const clientSecret = process.env.NOTIFICATION_API_CLIENT_SECRET || '';

const typeWeights = {
  Placement: 3,
  Result: 2,
  Event: 1
};

const cache = {
  data: null,
  updatedAt: 0,
  ttlMs: 15 * 1000
};

function normalizeNotifications(payload) {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.notifications)) {
    return payload.notifications;
  }

  if (Array.isArray(payload.Notifications)) {
    return payload.Notifications;
  }

  return Object.values(payload)
    .flat()
    .filter(item => item && item.Type && item.Timestamp);
}

function parseTimestamp(value) {
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? 0 : timestamp.getTime();
}

function computePriority(notification) {
  const type = notification.Type || notification.type || 'Event';
  return typeWeights[type] || 0;
}

function sortNotifications(notifications) {
  return notifications
    .map(item => ({
      ...item,
      priorityScore: computePriority(item),
      timestampMs: parseTimestamp(item.Timestamp || item.timestamp || item.createdAt)
    }))
    .sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }
      return b.timestampMs - a.timestampMs;
    })
    .map(({ priorityScore, timestampMs, ...rest }) => rest);
}

const tokenCache = {
  token: null,
  expiresAt: 0
};

async function fetchAccessToken() {
  if (tokenCache.token && Date.now() < tokenCache.expiresAt - 5000) {
    return tokenCache.token;
  }

  if (!tokenUrl || !clientId || !clientSecret) {
    throw new Error('Token endpoint and client credentials are required for authorization');
  }

  const response = await axios.post(tokenUrl, new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret
  }).toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    timeout: 10000
  });

  const tokenData = response.data;
  if (!tokenData.access_token) {
    throw new Error('Token response did not include access_token');
  }

  tokenCache.token = tokenData.access_token;
  tokenCache.expiresAt = Date.now() + ((tokenData.expires_in || 3600) * 1000);
  return tokenCache.token;
}

async function fetchNotifications() {
  const now = Date.now();
  if (cache.data && now - cache.updatedAt < cache.ttlMs) {
    return { source: 'cache', data: cache.data };
  }

  const headers = {};
  if (authHeader) {
    const normalized = authHeader.trim();
    if (/^Bearer\s+/i.test(normalized)) {
      headers.Authorization = normalized;
    } else {
      headers.Authorization = `Bearer ${normalized}`;
    }
  } else if (tokenUrl && clientId && clientSecret) {
    const token = await fetchAccessToken();
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await axios.get(notificationApiUrl, { headers, timeout: 10000 });
  const notifications = normalizeNotifications(response.data);
  cache.data = notifications;
  cache.updatedAt = Date.now();

  return { source: 'remote', data: notifications };
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'notification-priority-service', timestamp: new Date().toISOString() });
});

app.get('/notifications', async (req, res) => {
  try {
    const result = await fetchNotifications();
    res.json({ source: result.source, count: result.data.length, notifications: result.data });
  } catch (error) {
    const message = error.response?.data || error.message || 'Failed to fetch notifications';
    res.status(502).json({ error: 'Unable to retrieve notifications', detail: message });
  }
});

app.get('/priority-notifications', async (req, res) => {
  const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 10));

  try {
    const result = await fetchNotifications();
    const sorted = sortNotifications(result.data).slice(0, limit);
    res.json({
      source: result.source,
      limit,
      count: sorted.length,
      notifications: sorted
    });
  } catch (error) {
    const message = error.response?.data || error.message || 'Failed to fetch notifications';
    res.status(502).json({ error: 'Unable to retrieve priority notifications', detail: message });
  }
});

app.listen(port, () => {
  console.log(`Notification Priority Service listening on http://localhost:${port}`);
  console.log(`Fetching notifications from: ${notificationApiUrl}`);
});
