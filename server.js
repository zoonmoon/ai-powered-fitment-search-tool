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
          List matching products compulsarily with its year, make, model, submodel and chain. List up to 10 products if as long as there are matches but IMPORTANT: DO NOT include product SKU info in the response. I repeat: The response should contain any info about SKU. The response should contain product link whenever possible.
          If the user does not mention year, but mentions make and / or model, first prompt the user to provide
          year (compalsarily give the available year range compatible with make and model) and only then provide him the list of parts.    
          Also, very important: don't include the terms "files" and "uploaded"  in your response, as this tool is being used by end users (website visitors).  
        `,
      input: `${query}`,
      tools: [{
        type: "file_search",
        "max_num_results": 1,
        vector_store_ids: ["vs_67d2683d04d4819194c7c542107b2fab"],
      }],
      stream: true, // Enable streaming
  });

  
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