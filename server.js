const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

require('dotenv').config();

console.log("opanai", process.env.OPENAI_API_KEY); // 3000

const app = express();
const server = http.createServer(app);
const io = new Server(server);



const OpenAI = require('openai');

const openai = new OpenAI();

// Serve static files from the "public" directory
app.use(express.static('public'));

const readSheetAndUpload = require('./utils/read_sheet.js'); // Import the function


// Reindex Route
app.get('/reindex', async (req, res) => {
  try {
      await readSheetAndUpload(); // Call the function
      res.json({ success: true, message: 'Reindexing completed' });
  } catch (error) {
      res.status(500).json({ success: false, message: 'Error reindexing, please try again'});
  }
});



function getRandomInt(min, max) {
  min = Math.ceil(min);  // Round up the minimum value
  max = Math.floor(max); // Round down the maximum value
  return  `myself_${Math.floor(Math.random() * (max - min + 1)) + min}`;
}

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Handle incoming messages
  socket.on('chatMessage', async (data) => {


    let socketIdOfMsgReceiver = data.socket_id
    let query = data.query 

    console.log(data) 

    io.to(socketIdOfMsgReceiver).emit("chatMessage",{
      sort_order: -1, 
      completed: false, 
      resp_id: null, 
      id: getRandomInt(1,1000000), 
      msg: query
    })

    const response = await openai.responses.create({
  model: "gpt-4o-mini",
  previous_response_id: prev_response_id.length === 0 ? null : prev_response_id,
  instructions: SYSTEM_INSTRUCTIONS,
  input: `${query}`,
  tools: [{
    type: "file_search",
    max_num_results: 1,
    vector_store_ids: ["vs_680677b70d088191a0471869912db0d4"],
  }],
  stream: true,
});

    


      `,
      input: `${query}`,
      tools: [{
        type: "file_search",
        max_num_results: 1,
        vector_store_ids: ["vs_680677b70d088191a0471869912db0d4"],
      }],
      stream: true, // Enable streaming
    });
const SYSTEM_INSTRUCTIONS = `
You are the Oinker Chain-Size Fitment Assistant for a store selling tools by chain size.

Your job:
- Read the user's message and extract year, make, and model (from free text, in any order).
- Use the fitment data (via tools) to find the stock chain size.
- Reply with a short, direct answer focused on chain size aind which Oinker dispenser to choose.
- Include product links when available.
- No marketing copy, no “thank you”, no small talk.

REQUIRED INFO
- You need YEAR, MAKE, and MODEL to give a chain size.
- If the user clearly gives make + model but not year, ask a short follow-up:
  Example: “Got it — what year is your Yamaha R6?”
- If more than one piece is missing, reply exactly:
  “To find your chain size I need your year, make, and model.”
- Do not add extra sentences in that case.

WHEN THERE IS A CLEAR MATCH IN THE DATA
- You may ONLY give a chain size when the database/tool returns a clear, explicit match.
- Default format (replace SIZE with the value from the data):
  “The stock chain size is SIZE. Choose the SIZE dispenser.”
- Special mapping rules:
  - If the data says 420:
    “The stock chain size is 420. Choose the 520/420 dispenser on the product page.”
  - If the data says 532:
    “The stock chain size is 532. Choose the 530 dispenser on the product page.”
  - If the data says 630:
    “The stock chain size is 630. Choose the 530/630 dispenser on the product page.”

NO DATA / UNCERTAIN CASES
- You must NEVER guess or default to a common size like 525.
- Do NOT say “most bikes use…” or similar.
- If there is no match, conflicting info, or the tool cannot find that year/make/model, reply exactly:
  “I couldn’t find a confirmed chain size for that bike. Please use the live chat to ask a real person or check the number stamped on your chain.”

MULTIPLE BIKES
- If the user clearly asks about more than one bike, answer each on its own line, e.g.:
  “Bike 1 – Stock chain size: 520.”
  “Bike 2 – Stock chain size: 525.”

GENERAL
- Never invent years or models that are not in the data.
- Never talk about files, indexes, or vector stores or internal tools.
`;

  // new key - vs_680677b70d088191a0471869912db0d4
  
  let outputText = "";

  let sortOrder = 0;


  for await (const chunk of response) {

      sortOrder++;


      if(chunk.type == "response.output_text.delta"){
          // if(outputText.length > 50){

              io.to(socketIdOfMsgReceiver).emit("chatMessage",{
                sort_order: sortOrder, 
                completed: false, 
                resp_id: null, 
                id: response._request_id, 
                msg: chunk.delta
              })

      }else if(chunk.type == "response.completed"){

          io.to(socketIdOfMsgReceiver).emit("chatMessage",{
            sort_order: -1, 
            completed: true, 
            resp_id: chunk.response.id, 
            id: response._request_id, 
            msg: ''
          })

      }
  }




  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
