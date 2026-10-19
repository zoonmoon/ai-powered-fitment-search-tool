require("dotenv").config();
const fs = require("fs");

const { google } = require("googleapis");

const OpenAI = require('openai');

async function readSheetAndUpload() {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const auth = new google.auth.GoogleAuth({
      credentials: {
          type: "service_account",
          project_id: process.env.GOOGLE_PROJECT_ID,
          private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"), 
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  try {
      // ✅ Await the sheet reading process
      const response = await sheets.spreadsheets.values.get({
          spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
          range: 'JT Sprockets - Application Guid'
      });

      const data = response.data.values;
      if (!data || data.length < 1) throw new Error("No data found in spreadsheet");

      // Extract headers
      const headers = data[0];
      const formattedData = data.slice(1).map(row => {
          let obj = {};
          headers.forEach((key, index) => {
              obj[key] = row[index] || ""; // Handle empty values
          });
          return obj;
      });

      // Save to .txt file
      const fileContent = JSON.stringify(formattedData, null, 2);
      fs.writeFileSync("fitment_data.txt", fileContent);
      console.log("Data saved to fitment_data.txt ✅");

      // ✅ Await file upload
      const fileStream = fs.createReadStream("fitment_data.txt");
      console.log("Uploading file...");
      const result = await openai.files.create({
          file: fileStream,
          purpose: "assistants",
      });

      console.log("File uploaded, assigning to vector store...");
      const fileID = result.id;
      await openai.vectorStores.files.create("vs_680677b70d088191a0471869912db0d4", {
          file_id: fileID
      });

      console.log("File assigned to vector store, listing files...");

      const vectorStoreFiles = await openai.vectorStores.files.list(
          "vs_680677b70d088191a0471869912db0d4"
      );

      const vectorStoreFilesData = vectorStoreFiles.data;
      console.log("Total files in vector store:", vectorStoreFilesData.length);

    
    
      // Wait for the new database to finish indexing.
      // Keep the existing database if indexing fails.
      let newFile;
      const maxAttempts = 60;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        newFile = await openai.vectorStores.files.retrieve(
          "vs_680677b70d088191a0471869912db0d4",
          fileID
        );

        if (newFile.status === 'completed') {
          break;
        }

        if (newFile.status === 'failed' ||
            newFile.status === 'cancelled') {
          throw new Error('New database indexing failed.');
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      if (!newFile || newFile.status !== 'completed') {
        throw new Error(
          'New database indexing timed out. Previous files preserved.'
        );
      }


     
      // SAFETY: Do not automatically delete previous fitment files.
      // Preserve them until the new database has been tested.
      console.log(
        "New fitment file indexed successfully:", fileID
      );
      console.log(
        "Previous vector store files preserved for rollback."
      );


      
      const vectorStoreFilesAfterDeletion = await openai.vectorStores.files.list(
          "vs_680677b70d088191a0471869912db0d4"
      );
      
console.log("Vector store files retained:", vectorStoreFilesAfterDeletion.data.length);


      return { success: true }; // ✅ Ensure function returns a Promise with a response

  } catch (error) {
      console.error("Error in readSheetAndUpload:", error.message);
      throw error; // ✅ Propagate error to caller
  }
}

module.exports = readSheetAndUpload;
