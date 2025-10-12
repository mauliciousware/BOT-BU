# 📊 Vercel Production Logs Guide

## How to View User Queries in Vercel Logs

Your Bot-BU application now has **enhanced logging** to track all user queries in production!

---

## 🔍 Where to Find Logs

### Option 1: Vercel Dashboard (Recommended)
1. Go to: https://vercel.com/mrmaddy7s-projects/bot-bu
2. Click on the **"Logs"** tab (in the top navigation)
3. Select your deployment or choose **"Production"** environment
4. You'll see real-time logs of all user interactions

### Option 2: Direct Logs URL
- **Runtime Logs**: https://vercel.com/mrmaddy7s-projects/bot-bu/logs
- **Build Logs**: https://vercel.com/mrmaddy7s-projects/bot-bu/deployments

---

## 📝 What Gets Logged

### Every User Query Logs:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 USER QUERY LOG - RAG ENDPOINT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🕐 Timestamp: 2025-10-12T15:30:45.123Z
💬 User Query: What are CS 101 timings?
📝 Conversation History: 2 messages
```

### Response Information:
```
✅ Response generated in 1250ms
📊 Results: {
  chunksFound: 3,
  searchMethod: 'vector',
  cached: false,
  responseLength: 452
}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Multi-Tier Chat Endpoint Logs:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 USER QUERY LOG - MULTI-TIER CHAT ENDPOINT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🕐 Timestamp: 2025-10-12T15:30:45.123Z
📝 User Message: "Tell me about BU"
📊 Message Length: 15 characters
💬 Conversation context: 3 previous messages

✅ FINAL ANSWER: Tier 1 (Internal Documents)
📊 Response Length: 523 characters
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Error Logs (if any):
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ ERROR LOG - RAG ENDPOINT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🕐 Timestamp: 2025-10-12T15:30:45.123Z
⚠️ Error: API key not valid
📋 Stack: [full error stack trace]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🔎 How to Search Logs

### Filter by Keywords:
In the Vercel Logs interface, use the search box to filter:

- **User queries**: Search for `💬 User Query:` or `📝 User Message:`
- **Timestamps**: Search for specific dates/times `🕐 Timestamp:`
- **Errors**: Search for `❌ ERROR` or `CRITICAL ERROR`
- **Response types**: Search for `Tier 1`, `Tier 2`, or `Tier 3`
- **Performance**: Search for `Response generated` to see timing

### Filter by Time:
- Use the time range selector at the top
- Options: Last hour, 24 hours, 7 days, custom range

### Filter by Environment:
- **Production**: Live user queries
- **Preview**: Test deployments
- **All**: Everything

---

## 📈 Analytics You Can Track

### 1. **Popular Queries**
Look for repeated `💬 User Query:` patterns to understand:
- What students ask most frequently
- Which topics need better documentation
- Common pain points

### 2. **Performance Metrics**
Track `Response generated in XXXms` to monitor:
- Average response time
- Slow queries that need optimization
- Cache hit rates (`📦 Cache hit`)

### 3. **Tier Usage**
Count occurrences of:
- `Tier 1 (Internal Documents)` - Your knowledge base is working
- `Tier 2 (AI Knowledge)` - General questions
- `Tier 3 (Google Search)` - Real-time/external info needed

### 4. **Error Patterns**
Monitor `❌ ERROR` logs for:
- API quota issues
- Rate limiting hits
- System failures

### 5. **User Behavior**
Track `📝 Conversation History: X messages` to see:
- How long conversations last
- Multi-turn interaction patterns
- User engagement levels

---

## 🎯 Best Practices

### Daily Checks:
1. Check for any `❌ ERROR` logs
2. Look at popular queries from the last 24 hours
3. Monitor response times

### Weekly Analysis:
1. Export logs for the week
2. Analyze most common queries
3. Identify knowledge gaps
4. Update knowledge base if needed

### Monthly Review:
1. Review tier distribution (1/2/3)
2. Check API usage vs. quota
3. Analyze user engagement trends
4. Plan knowledge base updates

---

## 🛠️ Advanced: Exporting Logs

### For Data Analysis:
1. In Vercel Logs, use the **Download** button
2. Choose time range
3. Export as JSON or plain text
4. Use tools like Excel, Python, or analytics software

### For Monitoring:
Set up Vercel's **Log Drains** to send logs to:
- Datadog
- Logtail
- Custom webhook
- Your own database

**Setup**: https://vercel.com/docs/observability/log-drains

---

## 🔔 Setting Up Alerts

### In Vercel Dashboard:
1. Go to **Settings** → **Integrations**
2. Add **Slack** or **Discord** integration
3. Configure alerts for:
   - Error rates
   - High traffic
   - Failed deployments

---

## 📊 Sample Log Analysis

### Example Query:
```bash
# In Vercel Logs search box:
💬 User Query:
```

This will show you **all user queries** with timestamps and full context!

### Example Error Search:
```bash
# In Vercel Logs search box:
❌ ERROR
```

This will show you **all errors** that occurred.

---

## 🚀 Quick Start Checklist

- [ ] Deploy your code to Vercel
- [ ] Visit https://vercel.com/mrmaddy7s-projects/bot-bu/logs
- [ ] Select "Production" environment
- [ ] Search for `💬 User Query:` to see all queries
- [ ] Set up a Slack/Discord integration for alerts
- [ ] Check logs daily for the first week

---

## 📞 Need Help?

- **Vercel Logs Docs**: https://vercel.com/docs/observability/runtime-logs
- **Vercel Analytics**: https://vercel.com/mrmaddy7s-projects/bot-bu/analytics
- **Support**: Contact Vercel support via dashboard

---

## 🎉 You're All Set!

Your Bot-BU now has comprehensive logging. Every user interaction is tracked and easily searchable in Vercel's production logs!

**Happy Monitoring! 📊**
