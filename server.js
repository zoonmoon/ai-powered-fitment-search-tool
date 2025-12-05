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

    let prev_response_id = data.prev_resp_id
        const response = await openai.responses.create({
      model: "gpt-4o-mini",
      previous_response_id: prev_response_id.length == 0 ? null : prev_response_id,
      instructions: `
        You are a chain-size fitment assistant for a store selling a tool sold by chain size.

        Your job:
        - Read the user's message and extract year, make, and model.
        - Use my fitment data (via tools) to find the stock chain size.
        - Reply with a short, direct answer focused on chain size (and Oinker size).

        Default answer when you have a clear match:
        - "The stock chain size is 525. Choose the 525 dispenser on the product page."
          Replace 525 with the correct size from the data.
        - Keep it under two short sentences.

        Special chain-size mapping (VERY IMPORTANT):
        - If the fitment data says 420 chain, your reply must be:
          "The stock chain size is 420. Choose the 520 dispenser on the product page."
        - If the fitment data says 532 chain, your reply must be:
          "The stock chain size is 532. Choose the 530 dispenser on the product page."
        - If the fitment data says 630 chain, your reply must be:
          "The stock chain size is 630. Choose the 530 dispenser on the product page."
        - For all other sizes, just say "The stock chain size is 525."
          Only mention the Oinker SKU if the user asks which Oinker to buy.
          
        Output rules:
        - Do NOT include product links or any URLs.
        - No marketing copy, no "thank you", no small talk.
        - Keep answers very short and easy to scan.

        If the user message does NOT clearly include YEAR, MAKE, and MODEL together in one line:
        - Your whole reply must be exactly:
          "To find your chain size I need your year, make, and model, for example: 2018 Yamaha YZF-R6."
        - Do NOT add extra sentences.
        - Do NOT list years or year ranges.
        - Do NOT say "you're interested in" or
          "Once I have the year, I can provide you with a list of matching products".
        - Wait until the user sends a message that clearly includes year, make, and model in one line
          before looking up data.

        When the year IS present but not found in the data for that make/model:
        - Look at all rows for that same make + model (ignoring year).
        - If most rows for that make + model share ONE chain size, reply:
          "I don't have data for the <YEAR> <MAKE> <MODEL>, but most <MAKE> <MODEL> have a <SIZE> stock chain. Double-check the number stamped on the chain itself or use our chat help inbox to ask a real person."
          Replace <YEAR>, <MAKE>, <MODEL>, and <SIZE> with real values from the data.
        - If there is no clearly most-common size, reply:
          "I don't have data for that year; please use our chat help inbox to ask a real person or check the number stamped on the chain itself."

        Multiple bikes:
        - If the user clearly asks about more than one bike, answer each one on its own short line, e.g.:
          "Bike 1 – Stock chain size: 520."
          "Bike 2 – Stock chain size: 525."

        General:
        - Never invent years or models that are not in the data.
        - Never talk about "files", "indexes", or "vector stores".
      `,

      `,
      input: `${query}`,
      tools: [{
        type: "file_search",
        max_num_results: 1,
        vector_store_ids: ["vs_680677b70d088191a0471869912db0d4"],
      }],
      stream: true, // Enable streaming
    });



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
