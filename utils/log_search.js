
const { google } = require('googleapis');

// Determine whether the chatbot found a chain size.
function getResultStatus(answer) {
  const text = String(answer || '').trim();

  if (!text) {
    return 'Error';
  }

  if (/couldn.t find|could not find|don't have data|no confirmed|unable to confirm|not found/i.test(text)) {
    return 'Needs review';
  }

  if (/what year|year, make, and model|need your year|which year|what model/i.test(text)) {
    return 'More info needed';
  }

  if (/(?:stock\s+)?chain size\s*(?:is|:)\s*(?:420|428|520|525|530|532|630)\b/i.test(text)) {
    return 'Found';
  }

  return 'Needs review';
}

// Record each customer search in Google Sheets.
async function logSearch(query, answer, sessionId) {

  const auth = new google.auth.GoogleAuth({
    credentials: {
      type: 'service_account',
      project_id: process.env.GOOGLE_PROJECT_ID,
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
    },
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets'
    ]
  });

  const sheets = google.sheets({
    version: 'v4',
    auth
  });

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
    range: "'Customer search and results'!A:E",
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[
        new Date().toISOString(),
        String(query || ''),
        String(answer || ''),
        getResultStatus(answer),
        String(sessionId || '')
      ]]
    }
  });
}

module.exports = logSearch;
